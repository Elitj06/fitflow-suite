import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createServerSupabaseClient } from '@/lib/supabase/server'

async function getProfile() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  return prisma.profile.findUnique({ where: { userId: user.id } })
}

// Statuses a STUDENT is allowed to set on their own bookings
const STUDENT_ALLOWED_STATUSES = ['CANCELLED'] as const

// All statuses TRAINER/ADMIN may set
const STAFF_ALLOWED_STATUSES = ['PENDING', 'CONFIRMED', 'CANCELLED', 'COMPLETED', 'NO_SHOW'] as const

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const profile = await getProfile()
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { status } = body

  if (!status || typeof status !== 'string') {
    return NextResponse.json({ error: 'status field is required' }, { status: 400 })
  }

  // HIGH FIX: Enforce role-based status transition rules
  if (profile.role === 'STUDENT') {
    if (!(STUDENT_ALLOWED_STATUSES as readonly string[]).includes(status.toUpperCase())) {
      return NextResponse.json(
        { error: 'Estudantes só podem cancelar agendamentos' },
        { status: 403 }
      )
    }
  } else {
    if (!(STAFF_ALLOWED_STATUSES as readonly string[]).includes(status.toUpperCase())) {
      return NextResponse.json({ error: 'Status inválido' }, { status: 400 })
    }
  }

  const normalizedStatus = status.toUpperCase()

  // Build tenant-scoped where clause
  const bookingWhere: Record<string, unknown> = {
    id: params.id,
    orgId: profile.orgId,
  }

  // Students can only update their own bookings
  if (profile.role === 'STUDENT') {
    bookingWhere.studentId = profile.id
  }

  const booking = await prisma.booking.findFirst({ where: bookingWhere })
  if (!booking) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const updateData: Record<string, unknown> = { status: normalizedStatus }
  if (normalizedStatus === 'CANCELLED') {
    updateData.cancelledAt = new Date()
  }

  const updated = await prisma.booking.update({
    where: { id: params.id },
    data: updateData,
  })
  return NextResponse.json(updated)
}
