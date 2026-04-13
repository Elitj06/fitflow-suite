import { NextRequest, NextResponse } from 'next/server'
import { verifyApiKey } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/v1/prescriptions/active?phone=xxx
 * Public endpoint for external agents (Laura) to check active prescription
 * Auth: x-api-key header
 */
export async function GET(request: NextRequest) {
  const ctx = await verifyApiKey(request)
  if (!ctx) return NextResponse.json({ error: 'Invalid or missing API key' }, { status: 401 })

  const phone = request.nextUrl.searchParams.get('phone')
  if (!phone) return NextResponse.json({ error: 'phone parameter required' }, { status: 422 })

  // Find student by phone (match last 9 digits)
  const student = await prisma.profile.findFirst({
    where: {
      orgId: ctx.orgId,
      phone: { contains: phone.slice(-9) },
      role: 'STUDENT',
      isActive: true,
    },
  })

  if (!student) {
    return NextResponse.json({ active: false, prescription: null })
  }

  const prescription = await prisma.workoutPrescription.findFirst({
    where: {
      orgId: ctx.orgId,
      studentId: student.id,
      isActive: true,
    },
    select: {
      id: true,
      code: true,
      name: true,
      totalSessions: true,
      usedSessions: true,
      startDate: true,
    },
  })

  if (!prescription) {
    return NextResponse.json({ active: false, prescription: null })
  }

  return NextResponse.json({
    active: true,
    prescription: {
      ...prescription,
      remaining: prescription.totalSessions - prescription.usedSessions,
      studentId: student.id,
      studentName: student.fullName,
    },
  })
}
