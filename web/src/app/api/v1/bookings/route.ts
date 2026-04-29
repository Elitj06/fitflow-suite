/**
 * POST /api/v1/bookings
 *
 * Public endpoint for external agents (Laura/OpenClaw) to create bookings
 * on behalf of clients via WhatsApp or other channels.
 *
 * Authentication: x-api-key header
 */

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyApiKey } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

// Studio schedule exceptions (holidays/special days)
// Updated by admin — each entry defines if studio is CLOSED or has SPECIAL hours
// If a date is not listed, normal hours apply (Seg-Sex 6h-21h, Sáb 8h-12h, Dom fechado)
const SCHEDULE_EXCEPTIONS: Record<string, { status: 'CLOSED' | 'SPECIAL', label: string, hours?: string }> = {
  // Exemplo (removido até Rafael confirmar):
  // '2026-01-01': { status: 'CLOSED', label: 'Confraternização Universal' },
  // '2026-12-25': { status: 'CLOSED', label: 'Natal' },
  // '2026-11-02': { status: 'SPECIAL', label: 'Finados', hours: '08:00-14:00' },
}

function getScheduleException(dateStr: string): { blocked: boolean; message: string } | null {
  const exc = SCHEDULE_EXCEPTIONS[dateStr]
  if (!exc) return null
  if (exc.status === 'CLOSED') {
    return { blocked: true, message: `O estúdio não funciona em ${exc.label}. Escolha outro dia.` }
  }
  if (exc.status === 'SPECIAL') {
    return { blocked: false, message: `Atenção: ${exc.label} — funcionamento especial: ${exc.hours}` }
  }
  return null
}

const CreateBookingSchema = z.object({
  studentId: z.string().min(1),
  name: z.string().min(1).max(200),
  serviceId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  time: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be HH:MM'),
  trainerId: z.string().optional(),
  notes: z.string().max(500).optional(),
  phone: z.string().min(8).max(30).optional(), // Ignorado — studentId é obrigatório
});

/**
 * GET /api/v1/bookings?date=YYYY-MM-DD&phone=xxx
 *
 * Public endpoint for external agents (Laura/OpenClaw) to list bookings.
 * Authentication: x-api-key header
 */
export async function GET(request: NextRequest) {
  const ctx = await verifyApiKey(request)
  if (!ctx) {
    return NextResponse.json({ error: 'Invalid or missing API key' }, { status: 401 })
  }

  const { orgId } = ctx
  const { searchParams } = request.nextUrl
  const date = searchParams.get('date')
  const phone = searchParams.get('phone')

  const where: any = { orgId, status: { not: 'CANCELLED' } }

  if (date) {
    const [year, month, day] = date.split('-').map(Number)
    const start = new Date(Date.UTC(year, month - 1, day, 0, 0, 0))
    const end = new Date(Date.UTC(year, month - 1, day, 23, 59, 59))
    where.startsAt = { gte: start, lte: end }
  }

  if (phone) {
    const student = await prisma.profile.findFirst({
      where: { orgId, phone: { contains: phone.slice(-9) }, role: 'STUDENT' },
    })
    if (!student) return NextResponse.json([])
    where.studentId = student.id
  }

  const bookings = await prisma.booking.findMany({
    where,
    include: {
      service: { select: { id: true, name: true } },
      trainer: { select: { id: true, fullName: true } },
      student: { select: { id: true, fullName: true, phone: true } },
    },
    orderBy: { startsAt: 'asc' },
  })

  return NextResponse.json(bookings)
}

export async function POST(request: NextRequest) {
  const ctx = await verifyApiKey(request)
  if (!ctx) {
    return NextResponse.json({ error: 'Invalid or missing API key' }, { status: 401 })
  }

  const { orgId } = ctx

  let rawBody: unknown
  try {
    rawBody = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = CreateBookingSchema.safeParse(rawBody)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }

  const { phone, name, serviceId, date, time, trainerId, notes, studentId } = parsed.data

  try {
    // Validate service belongs to org
    const service = await prisma.service.findFirst({
      where: { id: serviceId, orgId, isActive: true },
    })
    if (!service) {
      return NextResponse.json({ error: 'Service not found or inactive' }, { status: 404 })
    }

    // Find or pick a trainer
    let resolvedTrainerId = trainerId
    if (!resolvedTrainerId) {
      // Find first available trainer for this service (via schedule slots)
      const slot = await prisma.scheduleSlot.findFirst({
        where: { orgId, serviceId, isActive: true },
        select: { trainerId: true },
      })
      if (slot) {
        resolvedTrainerId = slot.trainerId
      } else {
        // Fall back to any trainer in the org
        const trainer = await prisma.profile.findFirst({
          where: { orgId, role: { in: ['TRAINER', 'ADMIN'] }, isActive: true },
          select: { id: true },
        })
        resolvedTrainerId = trainer?.id
      }
    }

    if (!resolvedTrainerId) {
      return NextResponse.json({ error: 'No trainer available for this service' }, { status: 422 })
    }

    // Parse date and time into a full datetime in America/Sao_Paulo
    // BRT is always UTC-3 (Brazil abolished DST in 2019)
    const [year, month, day] = date.split('-').map(Number)
    const [hour, minute] = time.split(':').map(Number)

    // Check day of week using LOCAL date (before converting to UTC)
    // This avoids the bug where Friday 21h BRT becomes Saturday 00h UTC
    const localDate = new Date(year, month - 1, day)
    const localDayOfWeek = localDate.getDay() // 0=Sunday, using local date
    if (localDayOfWeek === 0) {
      return NextResponse.json(
        { error: 'O estúdio não funciona aos domingos. Escolha outro dia.' },
        { status: 422 }
      )
    }

    // BRT = UTC-3 (no DST in Brazil since 2019)
    const startsAt = new Date(Date.UTC(year, month - 1, day, hour + 3, minute))
    const endsAt = new Date(startsAt.getTime() + service.durationMinutes * 60000)

    // Check schedule exceptions (holidays / special hours)
    const exception = getScheduleException(date)
    if (exception?.blocked) {
      return NextResponse.json(
        { error: exception.message },
        { status: 422 }
      )
    }

    // Capacity limits: 5 students per trainer per slot, 22 total per slot
    const MAX_STUDENTS_PER_TRAINER = 5
    const MAX_STUDENTS_PER_SLOT = 22

    // Check total capacity first (hard limit)
    const totalBookings = await prisma.booking.count({
      where: {
        orgId,
        status: { in: ['PENDING', 'CONFIRMED'] },
        startsAt: { lt: endsAt },
        endsAt: { gt: startsAt },
      },
    })
    if (totalBookings >= MAX_STUDENTS_PER_SLOT) {
      return NextResponse.json(
        { error: `Horário lotado — ${MAX_STUDENTS_PER_SLOT} vagas já preenchidas.` },
        { status: 409 }
      )
    }

    // Check trainer capacity — if full, auto-assign to another available trainer
    let reassignedTrainer = false
    const trainerBookings = await prisma.booking.count({
      where: {
        orgId,
        trainerId: resolvedTrainerId,
        status: { in: ['PENDING', 'CONFIRMED'] },
        startsAt: { lt: endsAt },
        endsAt: { gt: startsAt },
      },
    })
    if (trainerBookings >= MAX_STUDENTS_PER_TRAINER) {
      // Try to find another trainer with capacity
      const allTrainers = await prisma.profile.findMany({
        where: { orgId, role: { in: ['TRAINER', 'ADMIN'] }, isActive: true },
        select: { id: true, fullName: true },
      })
      
      for (const trainer of allTrainers) {
        if (trainer.id === resolvedTrainerId) continue
        const trainerCount = await prisma.booking.count({
          where: {
            orgId,
            trainerId: trainer.id,
            status: { in: ['PENDING', 'CONFIRMED'] },
            startsAt: { lt: endsAt },
            endsAt: { gt: startsAt },
          },
        })
        if (trainerCount < MAX_STUDENTS_PER_TRAINER) {
          resolvedTrainerId = trainer.id
          reassignedTrainer = true
          break
        }
      }
      
      if (!reassignedTrainer) {
        return NextResponse.json(
          { error: `Todos os professores estão com ${MAX_STUDENTS_PER_TRAINER} alunos nesse horário. Nenhum disponível.` },
          { status: 409 }
        )
      }
    }

    // Find student by studentId (required)
    const student = await prisma.profile.findFirst({
      where: { id: studentId, orgId, role: 'STUDENT' },
    })

    if (!student) {
      return NextResponse.json(
        { error: 'Aluno não encontrado. Verifique o studentId.' },
        { status: 404 }
      )
    }

    // Resolve trainer info for confirmation message
    const trainer = await prisma.profile.findUnique({
      where: { id: resolvedTrainerId },
      select: { fullName: true },
    })

    // Check if student already has a booking on this date (1 per day)
    const existingBooking = await prisma.booking.findFirst({
      where: {
        orgId,
        studentId: student.id,
        status: { in: ['PENDING', 'CONFIRMED'] },
        startsAt: { gte: new Date(startsAt.getFullYear(), startsAt.getMonth(), startsAt.getDate()) },
        endsAt: { lt: new Date(startsAt.getFullYear(), startsAt.getMonth(), startsAt.getDate() + 1) },
      },
    })
    if (existingBooking) {
      return NextResponse.json(
        { error: `Aluno já possui agendamento nesse dia (${date}). Um agendamento por dia. Cancele o anterior antes de criar um novo.` },
        { status: 409 }
      )
    }

    // Create the booking
    const booking = await prisma.booking.create({
      data: {
        orgId,
        serviceId: service.id,
        trainerId: resolvedTrainerId,
        studentId: student.id,
        startsAt,
        endsAt,
        status: 'CONFIRMED',
        source: 'WHATSAPP',
        notes,
      },
    })

    // Build human-friendly confirmation message
    const dateFormatted = startsAt.toLocaleDateString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      day: '2-digit',
      month: '2-digit',
    })
    const timeFormatted = startsAt.toLocaleTimeString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      hour: '2-digit',
      minute: '2-digit',
    })
    const trainerName = trainer?.fullName ?? 'Instrutor'
    const confirmationMessage = reassignedTrainer
      ? `Agendado! ${service.name}, ${dateFormatted} às ${timeFormatted} com ${trainerName}. (Professor realocado automaticamente — o solicitado estava com ${MAX_STUDENTS_PER_TRAINER} alunos nesse horário.)`
      : `Agendado! ${service.name}, ${dateFormatted} às ${timeFormatted} com ${trainerName}.`

    return NextResponse.json(
      {
        success: true,
        bookingId: booking.id,
        trainerReassigned: reassignedTrainer || undefined,
        confirmationMessage,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('[v1/bookings POST] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
