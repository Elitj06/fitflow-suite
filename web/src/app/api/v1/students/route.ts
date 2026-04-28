/**
 * GET /api/v1/students
 *
 * List students. If no params, returns all active students.
 * With search/phone, returns matching students (limit 10).
 *
 * Query params:
 *   search=name (optional)
 *   phone=number (optional)
 *   limit=50 (default, only when listing all)
 *   offset=0 (default, only when listing all)
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
  const search = searchParams.get('search')
  const phone = searchParams.get('phone')

  try {
    // Search mode — keep existing behavior
    if (search || phone) {
      const where: any = { orgId, role: 'STUDENT', isActive: true }

      if (phone) {
        where.phone = { contains: phone.replace(/\D/g, '').slice(-9) }
      } else if (search) {
        // Search with accent-insensitive matching using raw SQL
        const normalizedSearch = search
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
        
        const students = await prisma.
queryRaw<Array<{id: string, fullName: string, phone: string | null, email: string, source: string, isActive: boolean, createdAt: Date}>>`
          SELECT id, full_name as "fullName", phone, email, source, is_active as "isActive", created_at as "createdAt"
          FROM profiles
          WHERE org_id = ${orgId}
            AND role = 'STUDENT'
            AND is_active = true
            AND (
              unaccent(full_name) ILIKE ${'%' + normalizedSearch + '%'}
              OR full_name ILIKE ${'%' + search + '%'}
            )
          ORDER BY full_name ASC
          LIMIT 10
        `
        return NextResponse.json(students)
      }

      const students = await prisma.profile.findMany({
        where,
        select: {
          id: true,
          fullName: true,
          phone: true,
          email: true,
          source: true,
          isActive: true,
          createdAt: true,
        },
        orderBy: { fullName: 'asc' },
        take: 10,
      })

      return NextResponse.json(students)
    }

    // List all mode
    const limit = Math.min(Math.max(Number(searchParams.get('limit')) || 50, 1), 200)
    const offset = Math.max(Number(searchParams.get('offset')) || 0, 0)

    const students = await prisma.profile.findMany({
      where: { orgId, role: 'STUDENT', isActive: true },
      select: {
        id: true,
        fullName: true,
        phone: true,
        email: true,
        source: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { fullName: 'asc' },
      take: limit,
      skip: offset,
    })

    return NextResponse.json(students)
  } catch (error) {
    console.error('[v1/students] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
