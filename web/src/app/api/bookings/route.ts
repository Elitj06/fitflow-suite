import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedProfile } from '@/lib/api-auth'

const CreateBookingSchema = z.object({
  serviceId: z.string().min(1),
  trainerId: z.string().min(1),
  startsAt: z.string().min(1),
  studentId: z.string().optional(),
  notes: z.string().max(1000).optional(),
  prescriptionId: z.string().optional(),
})

/**
 * GET /api/bookings?date=2026-03-20&status=confirmed
 */
export async function GET(request: NextRequest) {
  const profile = await getAuthenticatedProfile()
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = request.nextUrl
  const date = searchParams.get('date')
  const status = searchParams.get('status')
  const studentId = searchParams.get('studentId')

  const where: any = { orgId: profile.orgId }

  if (date) {
    // Use America/Sao_Paulo timezone bounds so bookings in BRT evening show on correct date
    const [y, m, d] = date.split('-').map(Number)
    const dayStart = new Date(Date.UTC(y, m - 1, d, 3, 0, 0))  // 00:00 BRT = 03:00 UTC
    const dayEnd = new Date(Date.UTC(y, m - 1, d + 1, 2, 59, 59))  // 23:59 BRT = 02:59 UTC next day
    where.startsAt = { gte: dayStart, lte: dayEnd }
  }
  if (status) {
    where.status = status.toUpperCase()
  } else {
    // By default, exclude cancelled bookings from schedule view
    where.status = { not: 'CANCELLED' }
  }

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
      trainer: { select: { id: true, fullName: true } },
      student: { select: { id: true, fullName: true, avatarUrl: true } },
      checkin: true,
      prescription: { select: { id: true, code: true, name: true, totalSessions: true, usedSessions: true, isActive: true } },
    },
    orderBy: { startsAt: 'asc' },
  })

  return NextResponse.json(bookings)
}

/**
 * POST /api/bookings — Create a new booking
 */
export async function POST(request: NextRequest) {
  const profile = await getAuthenticatedProfile()
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

  // Check for conflicts — only block if the SAME student already has a booking at this time
  const studentConflict = await prisma.booking.findFirst({
    where: {
      orgId: profile.orgId,
      studentId: targetStudentId,
      status: { in: ['PENDING', 'CONFIRMED'] },
      startsAt: { lt: end },
      endsAt: { gt: start },
    },
  })

  if (studentConflict) {
    return NextResponse.json({ error: 'Este aluno ja possui agendamento neste horario' }, { status: 409 })
  }

  // Check capacity for group classes AND create booking atomically
  // Uses a transaction to prevent race conditions (overbooking)
  try {
    const booking = await prisma.$transaction(async (tx) => {
      if (service.maxCapacity > 1) {
        const currentBookings = await tx.booking.count({
          where: {
            orgId: profile.orgId,
            serviceId,
            startsAt: start,
            status: { in: ['PENDING', 'CONFIRMED'] },
          },
        })
        if (currentBookings >= service.maxCapacity) {
          throw new Error('CAPACITY_EXCEEDED')
        }
      }

      return tx.booking.create({
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
          prescriptionId: body.prescriptionId || null,
        },
        include: {
          service: { select: { name: true } },
          student: { select: { fullName: true } },
        },
      })
    }, {
      isolationLevel: 'Serializable',
    })

    return NextResponse.json(booking, { status: 201 })
  } catch (txError: any) {
    if (txError.message === 'CAPACITY_EXCEEDED') {
      return NextResponse.json({ error: 'Aula lotada — capacidade maxima atingida' }, { status: 409 })
    }
    throw txError
  }
}
