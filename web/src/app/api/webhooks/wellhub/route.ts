import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { wellhubClient, type WellhubCheckinPayload, type WellhubBookingPayload, type WellhubUserStatusChangePayload } from '@/lib/wellhub/client'

/**
 * POST /api/webhooks/wellhub
 * Receives webhooks from Wellhub (Gympass):
 * - Check-in events (user checked in at gym)
 * - Booking events (new booking, cancel, check-in on booking)
 * - User status changes (cancel, upgrade, downgrade)
 */
export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text()
    const signature = request.headers.get('X-Gympass-Signature') || ''
    const eventType = request.headers.get('X-Gympass-Event') || request.nextUrl.searchParams.get('event') || 'checkin'
    const orgId = request.nextUrl.searchParams.get('orgId')

    if (!orgId) {
      return NextResponse.json({ error: 'Missing orgId' }, { status: 400 })
    }

    // Get org config for Wellhub
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { id: true, chatbotConfig: true },
    })

    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    // CRITICAL FIX: Require signature — never silently skip verification
    if (!signature) {
      console.error('[Wellhub Webhook] Missing X-Gympass-Signature header')
      return NextResponse.json({ error: 'Missing signature' }, { status: 401 })
    }

    if (!wellhubClient.verifySignature(rawBody, signature)) {
      console.error('[Wellhub Webhook] Invalid signature')
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }

    const payload = JSON.parse(rawBody)

    switch (eventType) {
      case 'checkin':
        return await handleCheckin(payload as WellhubCheckinPayload, orgId)

      case 'booking':
      case 'booking_new':
      case 'booking_cancel':
      case 'booking_checkin':
        return await handleBooking(payload as WellhubBookingPayload, orgId)

      case 'user_cancel':
      case 'user_change':
        return await handleUserStatusChange(payload as WellhubUserStatusChangePayload, orgId)

      default:
        console.log(`[Wellhub Webhook] Unknown event: ${eventType}`)
        return NextResponse.json({ status: 'ignored', event: eventType })
    }
  } catch (error) {
    console.error('[Wellhub Webhook] Error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

async function handleCheckin(payload: WellhubCheckinPayload, orgId: string) {
  const { user, checkin_datetime } = payload

  // Find or create the student profile
  let profile = await prisma.profile.findFirst({
    where: {
      orgId,
      OR: [
        { email: user.email || '' },
        { phone: user.unique_identifier },
      ],
    },
  })

  if (!profile) {
    // Auto-create student from Wellhub check-in
    profile = await prisma.profile.create({
      data: {
        userId: `wellhub_${user.unique_identifier}`,
        orgId,
        role: 'STUDENT',
        fullName: user.name || 'Aluno Wellhub',
        email: user.email || `wellhub_${user.unique_identifier}@placeholder.com`,
        phone: user.unique_identifier,
        healthNotes: 'Aluno via Wellhub',
        source: 'wellhub',
        externalId: user.unique_identifier,
      },
    })

    // Report signup event to Wellhub (first-time, one-time)
    await wellhubClient.reportSignup(user.unique_identifier, checkin_datetime)
  }

  // Find today's booking for this student (if any)
  const today = new Date(checkin_datetime)
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const endOfDay = new Date(startOfDay.getTime() + 86400000)

  const booking = await prisma.booking.findFirst({
    where: {
      orgId,
      studentId: profile.id,
      startsAt: { gte: startOfDay, lt: endOfDay },
      status: { in: ['PENDING', 'CONFIRMED'] },
    },
    include: { service: true },
  })

  if (booking) {
    // Mark booking as completed with check-in
    await prisma.booking.update({
      where: { id: booking.id },
      data: { status: 'COMPLETED', checkedInAt: new Date(checkin_datetime) },
    })

    // Create checkin record
    const checkin = await prisma.checkin.create({
      data: {
        bookingId: booking.id,
        studentId: profile.id,
        orgId,
        method: 'WHATSAPP', // Using WHATSAPP as proxy for "external app"
        coinsAwarded: booking.service.coinsReward,
      },
    })

    // Award FitCoins
    if (booking.service.coinsReward > 0) {
      await prisma.$transaction([
        prisma.coinTransaction.create({
          data: {
            profileId: profile.id,
            orgId,
            amount: booking.service.coinsReward,
            type: 'EARNED',
            description: `Check-in Wellhub: ${booking.service.name}`,
            referenceId: checkin.id,
          },
        }),
        prisma.profile.update({
          where: { id: profile.id },
          data: { coinsBalance: { increment: booking.service.coinsReward } },
        }),
      ])
    }
  } else {
    // Walk-in check-in (no booking), still register
    // Create a generic booking + checkin
    const defaultService = await prisma.service.findFirst({
      where: { orgId, isActive: true },
      orderBy: { createdAt: 'asc' },
    })

    if (defaultService) {
      const newBooking = await prisma.booking.create({
        data: {
          orgId,
          serviceId: defaultService.id,
          trainerId: (await prisma.profile.findFirst({ where: { orgId, role: 'TRAINER' } }))?.id || profile.id,
          studentId: profile.id,
          startsAt: new Date(checkin_datetime),
          endsAt: new Date(new Date(checkin_datetime).getTime() + defaultService.durationMinutes * 60000),
          status: 'COMPLETED',
          source: 'WHATSAPP',
          checkedInAt: new Date(checkin_datetime),
        },
      })

      await prisma.checkin.create({
        data: {
          bookingId: newBooking.id,
          studentId: profile.id,
          orgId,
          method: 'WHATSAPP',
          coinsAwarded: defaultService.coinsReward,
        },
      })

      // Award coins
      if (defaultService.coinsReward > 0) {
        await prisma.$transaction([
          prisma.coinTransaction.create({
            data: {
              profileId: profile.id,
              orgId,
              amount: defaultService.coinsReward,
              type: 'EARNED',
              description: `Check-in Wellhub: ${defaultService.name}`,
              referenceId: newBooking.id,
            },
          }),
          prisma.profile.update({
            where: { id: profile.id },
            data: { coinsBalance: { increment: defaultService.coinsReward } },
          }),
        ])
      }
    }
  }

  // Report check-in event back to Wellhub (required for payment)
  await wellhubClient.reportCheckin(user.unique_identifier, checkin_datetime)

  return NextResponse.json({ status: 'ok', action: 'checkin_processed' })
}

async function handleBooking(payload: WellhubBookingPayload, orgId: string) {
  const { booking_number, user, booking_datetime, status } = payload

  switch (status) {
    case 'booked':
      console.log(`[Wellhub] New booking: ${booking_number}`)
      // Could auto-create a booking in FitFlow
      break

    case 'cancelled':
      console.log(`[Wellhub] Booking cancelled: ${booking_number}`)
      break

    case 'checked_in':
      console.log(`[Wellhub] Booking check-in: ${booking_number}`)
      // Report class attendance to Wellhub
      await wellhubClient.reportClassAttendance(
        user.user_id,
        booking_datetime,
        payload.class_id
      )
      break
  }

  return NextResponse.json({ status: 'ok', action: `booking_${status}` })
}

async function handleUserStatusChange(payload: WellhubUserStatusChangePayload, orgId: string) {
  const { user_unique_identifier, status } = payload

  if (status === 0) {
    // User cancelled — mark as inactive in our system
    await prisma.profile.updateMany({
      where: {
        orgId,
        OR: [
          { phone: user_unique_identifier },
          { email: { contains: user_unique_identifier } },
        ],
      },
      data: { healthNotes: 'Wellhub: Plano cancelado' },
    })
    console.log('[Wellhub] User cancelled: [redacted]')
  } else {
    console.log(`[Wellhub] User status changed to ${status}: [redacted]`)
  }

  return NextResponse.json({ status: 'ok', action: 'user_status_updated' })
}

export async function GET() {
  return NextResponse.json({ status: 'ok', service: 'FitFlow Wellhub Webhook' })
}
