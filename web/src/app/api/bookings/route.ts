import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { createServerSupabaseClient } from '@/lib/supabase/server'

const CreateBookingSchema = z.object({
  serviceId: z.string().min(1),
  trainerId: z.string().min(1),
  startsAt: z.string().min(1),
  studentId: z.string().optional(),
  notes: z.string().max(1000).optional(),
})

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

  // Role-scoped filtering: students only see their own bookings; trainers see their own;
  // admins may optionally filter by studentId
  if (profile.role === 'STUDENT') {
    where.studentId = profile.id
  } else if (profile.role === 'TRAINER') {
    where.trainerId = profile.id
    // Trainers may additionally filter by studentId within their org
    if (studentId) where.studentId = studentId
  } else {
    // ADMIN: allow filtering by studentId but still within orgId
    if (studentId) where.studentId = studentId
  }

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

  const rawBody = await request.json()
  const parsed = CreateBookingSchema.safeParse(rawBody)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }
  const body = parsed.data
  const { serviceId, trainerId, startsAt, notes } = body

  // HIGH FIX: Students can only book for themselves; trainers/admins may specify a studentId
  let targetStudentId: string
  if (profile.role === 'STUDENT') {
    targetStudentId = profile.id
  } else {
    // For staff: studentId must belong to the same org
    const reqStudentId = body.studentId
    if (reqStudentId) {
      const studentProfile = await prisma.profile.findFirst({
        where: { id: reqStudentId, orgId: profile.orgId, role: 'STUDENT' },
      })
      if (!studentProfile) {
        return NextResponse.json({ error: 'Aluno nao encontrado nesta organizacao' }, { status: 404 })
      }
      targetStudentId = reqStudentId
    } else {
      targetStudentId = profile.id
    }
  }

  // Validate service exists and belongs to this org
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
      studentId: targetStudentId,
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
