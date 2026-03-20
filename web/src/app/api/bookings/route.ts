import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createServerSupabaseClient } from '@/lib/supabase/server'

async function getProfile() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  return prisma.profile.findUnique({ where: { userId: user.id }, include: { organization: true } })
}

/**
 * GET /api/bookings?date=2026-03-20&status=confirmed
 */
export async function GET(request: NextRequest) {
  const profile = await getProfile()
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = request.nextUrl
  const date = searchParams.get('date')
  const status = searchParams.get('status')
  const studentId = searchParams.get('studentId')

  const where: any = { orgId: profile.orgId }

  if (date) {
    const d = new Date(date)
    where.startsAt = {
      gte: new Date(d.getFullYear(), d.getMonth(), d.getDate()),
      lt: new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1),
    }
  }
  if (status) where.status = status.toUpperCase()
  if (studentId) where.studentId = studentId
  if (profile.role === 'STUDENT') where.studentId = profile.id
  if (profile.role === 'TRAINER') where.trainerId = profile.id

  const bookings = await prisma.booking.findMany({
    where,
    include: {
      service: { select: { name: true, color: true, durationMinutes: true, coinsReward: true } },
      trainer: { select: { fullName: true } },
      student: { select: { fullName: true, avatarUrl: true } },
      checkin: true,
    },
    orderBy: { startsAt: 'asc' },
  })

  return NextResponse.json(bookings)
}

/**
 * POST /api/bookings — Create a new booking
 */
export async function POST(request: NextRequest) {
  const profile = await getProfile()
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { serviceId, trainerId, studentId, startsAt, notes } = body

  // Validate service exists
  const service = await prisma.service.findFirst({
    where: { id: serviceId, orgId: profile.orgId, isActive: true },
  })
  if (!service) return NextResponse.json({ error: 'Servico nao encontrado' }, { status: 404 })

  // Calculate end time
  const start = new Date(startsAt)
  const end = new Date(start.getTime() + service.durationMinutes * 60000)

  // Check for conflicts
  const conflict = await prisma.booking.findFirst({
    where: {
      orgId: profile.orgId,
      trainerId,
      status: { in: ['PENDING', 'CONFIRMED'] },
      startsAt: { lt: end },
      endsAt: { gt: start },
    },
  })

  if (conflict) {
    return NextResponse.json({ error: 'Horario indisponivel — ja existe agendamento neste periodo' }, { status: 409 })
  }

  // Check capacity for group classes
  if (service.maxCapacity > 1) {
    const currentBookings = await prisma.booking.count({
      where: {
        orgId: profile.orgId,
        serviceId,
        startsAt: start,
        status: { in: ['PENDING', 'CONFIRMED'] },
      },
    })
    if (currentBookings >= service.maxCapacity) {
      return NextResponse.json({ error: 'Aula lotada — capacidade maxima atingida' }, { status: 409 })
    }
  }

  const booking = await prisma.booking.create({
    data: {
      orgId: profile.orgId,
      serviceId,
      trainerId,
      studentId: studentId || profile.id,
      startsAt: start,
      endsAt: end,
      status: 'CONFIRMED',
      source: 'WEB',
      notes,
    },
    include: {
      service: { select: { name: true } },
      student: { select: { fullName: true } },
    },
  })

  return NextResponse.json(booking, { status: 201 })
}
