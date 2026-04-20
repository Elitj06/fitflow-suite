/**
 * GET /api/v1/students?search=&phone=
 *
 * Search students by name or phone. Used by Laura to identify students.
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
  const search = searchParams.get('search')
  const phone = searchParams.get('phone')

  if (!search && !phone) {
    return NextResponse.json({ error: 'Provide search=name or phone=number' }, { status: 400 })
  }

  try {
    const where: any = { orgId, role: 'STUDENT', isActive: true }

    if (phone) {
      where.phone = { contains: phone.replace(/\D/g, '').slice(-9) }
    } else if (search) {
      where.fullName = { contains: search, mode: 'insensitive' }
    }

    const students = await prisma.profile.findMany({
      where,
      select: {
        id: true,
        fullName: true,
        phone: true,
        email: true,
        coinsBalance: true,
      },
      orderBy: { fullName: 'asc' },
      take: 10,
    })

    return NextResponse.json(students)
  } catch (error) {
    console.error('[v1/students] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
