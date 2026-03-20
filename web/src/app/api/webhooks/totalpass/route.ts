import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { totalPassClient, type TotalPassCheckinPayload, type TotalPassBookingPayload, type TotalPassConfig } from '@/lib/totalpass/client'

/**
 * POST /api/webhooks/totalpass
 * Receives webhooks from TotalPass:
 * - Check-in: user checked in via TotalPass app (150m radius)
 * - Booking: user booked/cancelled a class
 */
export async function POST(request: NextRequest) {
  try {
    const orgId = request.nextUrl.searchParams.get('orgId')
    const eventType = request.nextUrl.searchParams.get('event') || 'checkin'

    if (!orgId) {
      return NextResponse.json({ error: 'Missing orgId' }, { status: 400 })
    }

    // Get org with TotalPass config
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { id: true, chatbotConfig: true },
    })

    if (!org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 })
    }

    const config = (org.chatbotConfig as any)?.totalpass as TotalPassConfig | undefined

    if (!config?.enabled) {
      return NextResponse.json({ error: 'TotalPass not enabled' }, { status: 403 })
    }

    // Validate API Key from request
    const requestApiKey = request.headers.get('X-API-Key') || ''
    if (!totalPassClient.validateWebhookAuth(requestApiKey, config.apiKey)) {
      return NextResponse.json({ error: 'Invalid API Key' }, { status: 401 })
    }

    const payload = await request.json()

    switch (eventType) {
      case 'checkin':
        return await handleTotalPassCheckin(payload as TotalPassCheckinPayload, orgId, config)
      case 'booking':
        return await handleTotalPassBooking(payload as TotalPassBookingPayload, orgId, config)
      default:
        return NextResponse.json({ status: 'ignored', event: eventType })
    }
  } catch (error) {
    console.error('[TotalPass Webhook] Error:', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

async function handleTotalPassCheckin(
  payload: TotalPassCheckinPayload,
  orgId: string,
  config: TotalPassConfig
) {
  // 1. Validate the check-in token with TotalPass
  const validation = await totalPassClient.validateCheckin(
    payload.token,
    config.apiKey,
    config.integrationCode
  )

  if (!validation.valid) {
    console.error('[TotalPass] Invalid check-in token:', validation.error)
    return NextResponse.json({ error: 'Invalid token', detail: validation.error }, { status: 403 })
  }

  // 2. Find or create student profile
  let profile = await prisma.profile.findFirst({
    where: {
      orgId,
      OR: [
        { email: payload.user_email || '' },
        { phone: payload.user_id },
      ],
    },
  })

  if (!profile) {
    profile = await prisma.profile.create({
      data: {
        userId: `totalpass_${payload.user_id}`,
        orgId,
        role: 'STUDENT',
        fullName: payload.user_name || 'Aluno TotalPass',
        email: payload.user_email || `totalpass_${payload.user_id}@placeholder.com`,
        phone: payload.user_id,
        healthNotes: `TotalPass: ${payload.plan_name}`,
      },
    })
  }

  // 3. Create booking + checkin record
  const defaultService = await prisma.service.findFirst({
    where: { orgId, isActive: true },
    orderBy: { createdAt: 'asc' },
  })

  const trainer = await prisma.profile.findFirst({
    where: { orgId, role: 'TRAINER' },
  })

  if (defaultService && trainer) {
    const checkinTime = new Date(payload.checkin_at)

    const booking = await prisma.booking.create({
      data: {
        orgId,
        serviceId: defaultService.id,
        trainerId: trainer.id,
        studentId: profile.id,
        startsAt: checkinTime,
        endsAt: new Date(checkinTime.getTime() + defaultService.durationMinutes * 60000),
        status: 'COMPLETED',
        source: 'WHATSAPP', // Using as proxy for external partner
        checkedInAt: checkinTime,
        notes: `TotalPass - ${payload.plan_name}`,
      },
    })

    const checkin = await prisma.checkin.create({
      data: {
        bookingId: booking.id,
        studentId: profile.id,
        orgId,
        method: 'WHATSAPP',
        coinsAwarded: defaultService.coinsReward,
      },
    })

    // 4. Award FitCoins
    if (defaultService.coinsReward > 0) {
      await prisma.$transaction([
        prisma.coinTransaction.create({
          data: {
            profileId: profile.id,
            orgId,
            amount: defaultService.coinsReward,
            type: 'EARNED',
            description: `Check-in TotalPass: ${defaultService.name}`,
            referenceId: checkin.id,
          },
        }),
        prisma.profile.update({
          where: { id: profile.id },
          data: { coinsBalance: { increment: defaultService.coinsReward } },
        }),
      ])
    }

    // 5. Confirm check-in back to TotalPass
    await totalPassClient.confirmCheckin(payload.token, config.apiKey, config.integrationCode)
  }

  console.log(`[TotalPass] Check-in processed: ${payload.user_name} (${payload.plan_name})`)
  return NextResponse.json({ status: 'ok', action: 'checkin_confirmed' })
}

async function handleTotalPassBooking(
  payload: TotalPassBookingPayload,
  orgId: string,
  config: TotalPassConfig
) {
  switch (payload.status) {
    case 'booked':
      console.log(`[TotalPass] New booking: ${payload.booking_id} - ${payload.class_name}`)
      // Auto-create booking in FitFlow
      // Find matching service
      const service = await prisma.service.findFirst({
        where: {
          orgId,
          name: { contains: payload.class_name, mode: 'insensitive' },
          isActive: true,
        },
      })

      if (service) {
        let profile = await prisma.profile.findFirst({
          where: { orgId, phone: payload.user_id },
        })

        if (!profile) {
          profile = await prisma.profile.create({
            data: {
              userId: `totalpass_${payload.user_id}`,
              orgId,
              role: 'STUDENT',
              fullName: payload.user_name,
              email: payload.user_email || `totalpass_${payload.user_id}@placeholder.com`,
              phone: payload.user_id,
            },
          })
        }

        const trainer = await prisma.profile.findFirst({
          where: { orgId, role: 'TRAINER' },
        })

        if (trainer) {
          const classTime = new Date(payload.class_datetime)
          await prisma.booking.create({
            data: {
              orgId,
              serviceId: service.id,
              trainerId: trainer.id,
              studentId: profile.id,
              startsAt: classTime,
              endsAt: new Date(classTime.getTime() + service.durationMinutes * 60000),
              status: 'CONFIRMED',
              source: 'WHATSAPP',
              notes: `TotalPass Booking: ${payload.booking_id}`,
            },
          })
        }
      }
      break

    case 'cancelled':
      // Find and cancel matching booking
      const bookingToCancel = await prisma.booking.findFirst({
        where: {
          orgId,
          notes: { contains: payload.booking_id },
          status: { in: ['PENDING', 'CONFIRMED'] },
        },
      })
      if (bookingToCancel) {
        await prisma.booking.update({
          where: { id: bookingToCancel.id },
          data: { status: 'CANCELLED', cancelledAt: new Date(), cancelReason: 'Cancelado via TotalPass' },
        })
      }
      break

    case 'checked_in':
      console.log(`[TotalPass] Booking check-in: ${payload.booking_id}`)
      break
  }

  return NextResponse.json({ status: 'ok', action: `booking_${payload.status}` })
}

export async function GET() {
  return NextResponse.json({ status: 'ok', service: 'FitFlow TotalPass Webhook' })
}
