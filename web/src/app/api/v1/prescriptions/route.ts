/**
 * GET /api/v1/prescriptions?studentId=xxx
 *
 * List workout prescriptions for a student.
 *
 * Query params:
 *   studentId (required)
 *   active=true|false (optional filter)
 *   limit=20 (default)
 *
 * Authentication: x-api-key header
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyApiKey } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const ctx = await verifyApiKey(request)
  if (!ctx) {
    return NextResponse.json({ error: 'Invalid or missing API key' }, { status: 401 })
  }

  const { orgId } = ctx
  const { searchParams } = request.nextUrl
  const studentId = searchParams.get('studentId')

  if (!studentId) {
    return NextResponse.json({ error: 'studentId is required' }, { status: 400 })
  }

  try {
    const active = searchParams.get('active')
    const limit = Math.min(Math.max(Number(searchParams.get('limit')) || 20, 1), 100)

    const where: any = { orgId, studentId }
    if (active === 'true') where.isActive = true
    if (active === 'false') where.isActive = false

    const prescriptions = await prisma.workoutPrescription.findMany({
      where,
      select: {
        id: true,
        code: true,
        name: true,
        totalSessions: true,
        usedSessions: true,
        isActive: true,
        startDate: true,
        completedAt: true,
        trainer: { select: { id: true, fullName: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })

    return NextResponse.json(prescriptions)
  } catch (error) {
    console.error('[v1/prescriptions] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
