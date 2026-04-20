/**
 * GET /api/v1/trainers
 *
 * List active trainers for the org. Used by Laura to know available professors.
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

  try {
    const trainers = await prisma.profile.findMany({
      where: {
        orgId,
        role: 'TRAINER',
        isActive: true,
      },
      select: {
        id: true,
        fullName: true,
        specialties: true,
      },
      orderBy: { fullName: 'asc' },
    })

    return NextResponse.json(trainers)
  } catch (error) {
    console.error('[v1/trainers] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
