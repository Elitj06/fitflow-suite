/**
 * GET /api/v1/reports/students
 *
 * Student report — active count, new, source breakdown, top by bookings.
 *
 * Query params:
 *   period=week|month (default: week)
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
  const period = searchParams.get('period') || 'week'

  try {
    const now = new Date()
    const days = period === 'month' ? 30 : 7
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)

    // Total active students
    const totalActive = await prisma.profile.count({
      where: { orgId, role: 'STUDENT', isActive: true },
    })

    // New students in period
    const totalNew = await prisma.profile.count({
      where: {
        orgId,
        role: 'STUDENT',
        isActive: true,
        createdAt: { gte: startDate },
      },
    })

    // Source breakdown
    const sourceRows = await prisma.profile.groupBy({
      by: ['source'],
      where: { orgId, role: 'STUDENT', isActive: true },
      _count: { source: true },
    })
    const sourceBreakdown = sourceRows
      .map((r) => ({ source: r.source || 'direct', count: r._count.source }))
      .sort((a, b) => b.count - a.count)

    // Aggregators (wellhub, totalpass, etc.)
    const aggregators: Record<string, number> = {}
    for (const s of sourceRows) {
      const key = s.source || 'direct'
      aggregators[key] = (aggregators[key] || 0) + s._count.source
    }

    // Bookings in period
    const bookings = await prisma.booking.findMany({
      where: {
        orgId,
        startsAt: { gte: startDate, lte: now },
        status: { not: 'CANCELLED' },
      },
      include: {
        student: { select: { id: true, fullName: true } },
      },
    })

    // Students with bookings
    const studentsWithBookings = new Set(bookings.map((b) => b.studentId))
    const totalWithBookings = studentsWithBookings.size

    // Top 10 by bookings
    const bookingCounts: Record<string, { name: string; bookings: number }> = {}
    for (const b of bookings) {
      const sid = b.studentId
      if (!bookingCounts[sid]) {
        bookingCounts[sid] = { name: b.student?.fullName || 'Desconhecido', bookings: 0 }
      }
      bookingCounts[sid].bookings++
    }

    const topByBookings = Object.values(bookingCounts)
      .sort((a, b) => b.bookings - a.bookings)
      .slice(0, 10)

    return NextResponse.json({
      period,
      totalActive,
      totalWithBookings,
      totalNew,
      sourceBreakdown,
      topByBookings,
      aggregators,
    })
  } catch (error) {
    console.error('[v1/reports/students] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
