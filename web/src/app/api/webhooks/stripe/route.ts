import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import crypto from 'crypto'

/**
 * Verify Stripe webhook signature using HMAC-SHA256
 * Implements the same algorithm as stripe.webhooks.constructEvent()
 * without requiring the Stripe SDK.
 */
function verifyStripeSignature(
  payload: string,
  sigHeader: string | null,
  secret: string
): boolean {
  if (!sigHeader || !secret) return false

  // Parse the signature header: t=timestamp,v1=signature,...
  const parts = sigHeader.split(',')
  const tPart = parts.find((p) => p.startsWith('t='))
  const v1Parts = parts.filter((p) => p.startsWith('v1='))

  if (!tPart || v1Parts.length === 0) return false

  const timestamp = tPart.slice(2)
  const signedPayload = `${timestamp}.${payload}`

  const expectedHex = crypto
    .createHmac('sha256', secret)
    .update(signedPayload)
    .digest('hex')

  // Reject if timestamp is more than 5 minutes old (replay protection)
  const ts = parseInt(timestamp, 10)
  if (Math.abs(Date.now() / 1000 - ts) > 300) return false

  // Timing-safe comparison against all v1 signatures provided
  return v1Parts.some((part) => {
    const sig = part.slice(3)
    if (sig.length !== expectedHex.length) return false
    return crypto.timingSafeEqual(
      Buffer.from(sig, 'hex'),
      Buffer.from(expectedHex, 'hex')
    )
  })
}

/**
 * POST /api/webhooks/stripe
 * Handles Stripe webhook events for subscription lifecycle
 */
export async function POST(request: NextRequest) {
  const body = await request.text()
  const sig = request.headers.get('stripe-signature')
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!webhookSecret) {
    console.error('[Stripe Webhook] STRIPE_WEBHOOK_SECRET not configured')
    return NextResponse.json({ error: 'Webhook secret not configured' }, { status: 500 })
  }

  // CRITICAL FIX: Verify Stripe signature before processing any event
  if (!verifyStripeSignature(body, sig, webhookSecret)) {
    console.error('[Stripe Webhook] Invalid signature — request rejected')
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let event: any
  try {
    event = JSON.parse(body)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object
      const orgId = session.metadata?.orgId
      const studentId = session.metadata?.studentId
      const planName = session.metadata?.planName

      if (orgId && studentId && planName) {
        await prisma.subscription.create({
          data: {
            orgId,
            studentId,
            planName,
            price: session.amount_total / 100,
            interval: 'MONTHLY',
            stripeSubscriptionId: session.subscription,
            status: 'ACTIVE',
            currentPeriodStart: new Date(),
            currentPeriodEnd: new Date(Date.now() + 30 * 86400000),
          },
        })

        // Bonus coins for signing up
        await prisma.$transaction([
          prisma.coinTransaction.create({
            data: {
              profileId: studentId,
              orgId,
              amount: 10,
              type: 'BONUS',
              description: `Bonus: Assinatura ${planName}`,
            },
          }),
          prisma.profile.update({
            where: { id: studentId },
            data: { coinsBalance: { increment: 10 } },
          }),
        ])
      }
      break
    }

    case 'customer.subscription.updated': {
      const sub = event.data.object
      await prisma.subscription.updateMany({
        where: { stripeSubscriptionId: sub.id },
        data: {
          status: sub.status === 'active' ? 'ACTIVE' : sub.status === 'past_due' ? 'PAST_DUE' : 'PAUSED',
          currentPeriodStart: new Date(sub.current_period_start * 1000),
          currentPeriodEnd: new Date(sub.current_period_end * 1000),
        },
      })
      break
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object
      await prisma.subscription.updateMany({
        where: { stripeSubscriptionId: sub.id },
        data: { status: 'CANCELLED', cancelledAt: new Date() },
      })
      break
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object
      await prisma.subscription.updateMany({
        where: { stripeSubscriptionId: invoice.subscription },
        data: { status: 'PAST_DUE' },
      })
      break
    }
  }

  return NextResponse.json({ received: true })
}
