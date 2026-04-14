import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedProfile } from '@/lib/api-auth'

/**
 * POST /api/prescriptions
 * Create a workout prescription (TRAINER/ADMIN only)
 * Body: { studentId, code, totalSessions, name?, description?, exercises?, branchId? }
 */
export async function POST(request: NextRequest) {
  const profile = await getAuthenticatedProfile()
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (profile.role === 'STUDENT') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { studentId, code, totalSessions, name, description, exercises, branchId } = await request.json()
  if (!studentId || !code || !totalSessions) {
    return NextResponse.json({ error: 'studentId, code, totalSessions are required' }, { status: 422 })
  }

  // Deactivate any existing active prescription for this student
  await prisma.workoutPrescription.updateMany({
    where: { orgId: profile.orgId, studentId, isActive: true },
    data: { isActive: false, completedAt: new Date() },
  })

  const prescription = await prisma.workoutPrescription.create({
    data: {
      orgId: profile.orgId,
      studentId,
      trainerId: profile.id,
      code,
      name: name || null,
      description: description || null,
      exercises: exercises || undefined,
      totalSessions,
      startDate: new Date(),
      branchId: branchId || null,
    },
    include: {
      student: { select: { id: true, fullName: true } },
    },
  })

  return NextResponse.json(prescription, { status: 201 })
}

/**
 * GET /api/prescriptions?studentId=xxx&active=true
 * List prescriptions (filtered by student and/or active status)
 * TRAINER sees only their own prescriptions; ADMIN sees all
 */
export async function GET(request: NextRequest) {
  const profile = await getAuthenticatedProfile()
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const studentId = request.nextUrl.searchParams.get('studentId')
  const activeOnly = request.nextUrl.searchParams.get('active') === 'true'

  const prescriptions = await prisma.workoutPrescription.findMany({
    where: {
      orgId: profile.orgId,
      ...(studentId ? { studentId } : {}),
      ...(activeOnly ? { isActive: true } : {}),
      ...(profile.role === 'TRAINER' ? { trainerId: profile.id } : {}),
    },
    include: {
      student: { select: { id: true, fullName: true, phone: true } },
      trainer: { select: { id: true, fullName: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(prescriptions)
}
