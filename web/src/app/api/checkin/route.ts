import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { wellhubClient } from '@/lib/wellhub/client'

async function getProfile() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  return prisma.profile.findUnique({ where: { userId: user.id } })
}

/**
 * POST /api/checkin
 * Register a check-in for a booking and award FitCoins
 * 
 * Body: { bookingId, method: 'QR_CODE' | 'MANUAL' | 'WHATSAPP' }
 */
export async function POST(request: NextRequest) {
  const profile = await getProfile()
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (profile.role === 'STUDENT') return NextResponse.json({ error: 'Apenas trainers podem registrar check-in' }, { status: 403 })

  const { bookingId, method = 'MANUAL' } = await request.json()

  // Get booking with service info
  const booking = await prisma.booking.findFirst({
    where: {
      id: bookingId,
      orgId: profile.orgId,
      status: { in: ['PENDING', 'CONFIRMED'] },
    },
    include: {
      service: true,
      student: true,
      checkin: true,
    },
  })

  if (!booking) return NextResponse.json({ error: 'Agendamento nao encontrado ou ja concluido' }, { status: 404 })
  if (booking.checkin) return NextResponse.json({ error: 'Check-in ja realizado' }, { status: 409 })

  const coinsToAward = booking.service.coinsReward

  // Atomic transaction: create checkin + update booking + award coins
  const result = await prisma.$transaction(async (tx) => {
    // 1. Create checkin record
    const checkin = await tx.checkin.create({
      data: {
        bookingId: booking.id,
        studentId: booking.studentId,
        orgId: profile.orgId,
        method: method as any,
        coinsAwarded: coinsToAward,
      },
    })

    // 2. Update booking status
    await tx.booking.update({
      where: { id: booking.id },
      data: {
        status: 'COMPLETED',
        checkedInAt: new Date(),
      },
    })

    // 3. Award FitCoins
    if (coinsToAward > 0) {
      await tx.coinTransaction.create({
        data: {
          profileId: booking.studentId,
          orgId: profile.orgId,
          amount: coinsToAward,
          type: 'EARNED',
          description: `Check-in: ${booking.service.name}`,
          referenceId: checkin.id,
        },
      })

      await tx.profile.update({
        where: { id: booking.studentId },
        data: { coinsBalance: { increment: coinsToAward } },
      })
    }

    return { checkin, coinsAwarded: coinsToAward }
  })

  // If student is a Wellhub user, report the check-in event
  if (booking.student.phone?.startsWith('wellhub_') || booking.student.healthNotes?.includes('Wellhub')) {
    const wellhubUserId = booking.student.phone?.replace('wellhub_', '') || booking.student.userId
    await wellhubClient.reportCheckin(wellhubUserId, new Date().toISOString())
  }

  return NextResponse.json({
    success: true,
    checkinId: result.checkin.id,
    coinsAwarded: result.coinsAwarded,
    studentName: booking.student.fullName,
    serviceName: booking.service.name,
    newBalance: (await prisma.profile.findUnique({
      where: { id: booking.studentId },
      select: { coinsBalance: true },
    }))?.coinsBalance || 0,
  })
}

/**
 * GET /api/checkin?date=2026-03-20
 * Get today's check-in status for all bookings
 */
export async function GET(request: NextRequest) {
  const profile = await getProfile()
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const date = request.nextUrl.searchParams.get('date') || new Date().toISOString().split('T')[0]
  const d = new Date(date)
  const startOfDay = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const endOfDay = new Date(startOfDay.getTime() + 86400000)

  const bookings = await prisma.booking.findMany({
    where: {
      orgId: profile.orgId,
      startsAt: { gte: startOfDay, lt: endOfDay },
      status: { in: ['PENDING', 'CONFIRMED', 'COMPLETED'] },
      ...(profile.role === 'TRAINER' ? { trainerId: profile.id } : {}),
    },
    include: {
      service: { select: { name: true, coinsReward: true, color: true } },
      student: { select: { id: true, fullName: true, avatarUrl: true, coinsBalance: true } },
      checkin: true,
    },
    orderBy: { startsAt: 'asc' },
  })

  return NextResponse.json(
    bookings.map((b) => ({
      id: b.id,
      time: b.startsAt.toISOString(),
      student: b.student.fullName,
      studentId: b.student.id,
      service: b.service.name,
      serviceColor: b.service.color,
      coinsReward: b.service.coinsReward,
      checkedIn: !!b.checkin,
      checkinMethod: b.checkin?.method || null,
      source: b.source,
    }))
  )
}
