import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedProfile } from '@/lib/api-auth'

/**
 * PUT /api/prescriptions/[id]
 * Update a prescription (cancel, edit name/code/totalSessions/description/exercises)
 * Body: { isActive?, name?, code?, totalSessions?, description?, exercises? }
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const profile = await getAuthenticatedProfile()
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (profile.role === 'STUDENT') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await params
  const body = await request.json()

  const existing = await prisma.workoutPrescription.findFirst({
    where: { id, orgId: profile.orgId },
  })
  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // TRAINER can only edit their own prescriptions; ADMIN can edit any
  if (profile.role === 'TRAINER' && existing.trainerId !== profile.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const data: Record<string, unknown> = {}
  if (body.name !== undefined) data.name = body.name
  if (body.code !== undefined) data.code = body.code
  if (body.totalSessions !== undefined) data.totalSessions = body.totalSessions
  if (body.description !== undefined) data.description = body.description
  if (body.exercises !== undefined) data.exercises = body.exercises
  if (body.isActive === false) {
    data.isActive = false
    data.completedAt = new Date()
  }

  const updated = await prisma.workoutPrescription.update({
    where: { id },
    data,
    include: {
      student: { select: { id: true, fullName: true } },
      trainer: { select: { id: true, fullName: true } },
    },
  })

  return NextResponse.json(updated)
}
