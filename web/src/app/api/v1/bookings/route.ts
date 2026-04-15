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

const CreateBookingSchema = z.object({
  phone: z.string().min(8).max(30),
  name: z.string().min(1).max(200),
  serviceId: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  time: z.string().regex(/^\d{2}:\d{2}$/, 'Time must be HH:MM'),
  trainerId: z.string().optional(),
  notes: z.string().max(500).optional(),
})

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

  const { phone, name, serviceId, date, time, trainerId, notes } = parsed.data

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

    // Parse date and time into a full datetime
    // FIX: Usar Intl para resolver o offset correto de America/Sao_Paulo
    // incluindo horário de verão automaticamente
    const [year, month, day] = date.split('-').map(Number)
    const [hour, minute] = time.split(':').map(Number)

    // Criar a data como local em São Paulo usando o formato ISO
    // e deixar o runtime resolver o offset correto (incluindo DST)
    const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`

    // Calcular o offset real de São Paulo para esta data específica
    const tempDate = new Date(dateStr + 'Z') // UTC temporário
    const spFormatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Sao_Paulo',
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12: false,
    })
    const spParts = spFormatter.formatToParts(tempDate)
    const spHour = parseInt(spParts.find(p => p.type === 'hour')?.value || '0')
    const utcHour = tempDate.getUTCHours()
    const offsetHours = spHour - utcHour
    // O offset real é a diferença; para converter SP->UTC, subtraímos o offset
    const startsAt = new Date(Date.UTC(year, month - 1, day, hour - offsetHours, minute))
    const endsAt = new Date(startsAt.getTime() + service.durationMinutes * 60000)

    // Check for trainer conflicts
    const conflict = await prisma.booking.findFirst({
      where: {
        orgId,
        trainerId: resolvedTrainerId,
        status: { in: ['PENDING', 'CONFIRMED'] },
        startsAt: { lt: endsAt },
        endsAt: { gt: startsAt },
      },
    })
    if (conflict) {
      return NextResponse.json(
        { error: 'Time slot unavailable — trainer already booked' },
        { status: 409 }
      )
    }

    // Find or create student profile by phone
    let student = await prisma.profile.findFirst({
      where: { orgId, phone: { contains: phone.slice(-9) }, role: 'STUDENT' },
    })

    if (!student) {
      // Create a minimal student profile (no Supabase auth — agent-created)
      // We use a placeholder userId that is unique but not tied to Supabase auth
      const placeholderUserId = `agent-${orgId}-${phone.replace(/\D/g, '')}`
      student = await prisma.profile.create({
        data: {
          userId: placeholderUserId,
          orgId,
          role: 'STUDENT',
          fullName: name,
          phone,
          email: `${phone.replace(/\D/g, '')}@whatsapp.fitflow`,
        },
      })
    }

    // Resolve trainer info for confirmation message
    const trainer = await prisma.profile.findUnique({
      where: { id: resolvedTrainerId },
      select: { fullName: true },
    })

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
    const confirmationMessage = `Agendado! ${service.name}, ${dateFormatted} às ${timeFormatted} com ${trainerName}.`

    return NextResponse.json(
      {
        success: true,
        bookingId: booking.id,
        confirmationMessage,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('[v1/bookings POST] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
