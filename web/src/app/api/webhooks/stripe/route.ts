import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

/**
 * POST /api/webhooks/stripe
 * Handles Stripe webhook events for subscription lifecycle
 */
export async function POST(request: NextRequest) {
  const body = await request.text()
  const sig = request.headers.get('stripe-signature')

  // In production: verify signature with Stripe SDK
  // const event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET)

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
