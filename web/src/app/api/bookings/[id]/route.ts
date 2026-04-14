import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedProfile } from '@/lib/api-auth'

const STUDENT_ALLOWED_STATUSES = ['CANCELLED'] as const
const STAFF_ALLOWED_STATUSES = ['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'NO_SHOW', 'RESCHEDULED'] as const

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const profile = await getAuthenticatedProfile()
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()

  // Build tenant-scoped where clause
  const bookingWhere: Record<string, unknown> = {
    id,
    orgId: profile.orgId,
  }

  if (profile.role === 'STUDENT') {
    bookingWhere.studentId = profile.id
  }

  const booking = await prisma.booking.findFirst({ where: bookingWhere })
  if (!booking) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const updateData: Record<string, unknown> = {}

  // Status update
  if (body.status !== undefined) {
    const normalizedStatus = String(body.status).toUpperCase()
    if (profile.role === 'STUDENT') {
      if (!(STUDENT_ALLOWED_STATUSES as readonly string[]).includes(normalizedStatus)) {
        return NextResponse.json({ error: 'Estudantes só podem cancelar agendamentos' }, { status: 403 })
      }
    } else {
      if (!(STAFF_ALLOWED_STATUSES as readonly string[]).includes(normalizedStatus)) {
        return NextResponse.json({ error: 'Status inválido' }, { status: 400 })
      }
    }
    updateData.status = normalizedStatus
    if (normalizedStatus === 'CANCELLED') updateData.cancelledAt = new Date()
  }

  // dayNotes
  if (body.dayNotes !== undefined) {
    updateData.dayNotes = body.dayNotes
  }

  // Staff-only fields
  if (profile.role !== 'STUDENT') {
    if (body.trainerId !== undefined) {
      // Validate trainer belongs to org
      const trainer = await prisma.profile.findFirst({
        where: { id: body.trainerId, orgId: profile.orgId, role: 'TRAINER' },
      })
      if (!trainer) return NextResponse.json({ error: 'Professor não encontrado' }, { status: 404 })
      updateData.trainerId = body.trainerId
    }

    if (body.startsAt !== undefined) {
      updateData.startsAt = new Date(body.startsAt)
    }

    if (body.endsAt !== undefined) {
      updateData.endsAt = new Date(body.endsAt)
    }

    if (body.prescriptionId !== undefined) {
      updateData.prescriptionId = body.prescriptionId || null
    }
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: 'Nenhum campo para atualizar' }, { status: 400 })
  }

  const updated = await prisma.booking.update({
    where: { id },
    data: updateData,
    include: {
      service: { select: { name: true, color: true, durationMinutes: true, coinsReward: true } },
      trainer: { select: { id: true, fullName: true } },
      student: { select: { id: true, fullName: true, avatarUrl: true } },
      checkin: true,
      prescription: { select: { id: true, code: true, name: true, totalSessions: true, usedSessions: true, isActive: true } },
    },
  })
  return NextResponse.json(updated)
}
