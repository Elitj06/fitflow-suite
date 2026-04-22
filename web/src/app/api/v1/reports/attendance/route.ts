/**
 * GET /api/v1/reports/attendance
 *
 * Attendance report — completed, no-shows, cancelled.
 *
 * Query params:
 *   period=week|month (default: week)
 *   studentId (optional)
 *   trainerId (optional)
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
  const studentId = searchParams.get('studentId')
  const trainerId = searchParams.get('trainerId')

  try {
    const now = new Date()
    const days = period === 'month' ? 30 : 7
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)

    const where: any = {
      orgId,
      startsAt: { gte: startDate, lte: now },
    }
    if (studentId) where.studentId = studentId
    if (trainerId) where.trainerId = trainerId

    const bookings = await prisma.booking.findMany({
      where,
      include: {
        student: { select: { id: true, fullName: true } },
      },
    })

    const totalBookings = bookings.length
    let completed = 0
    let noShows = 0
    let cancelled = 0

    const dailyMap: Record<string, { completed: number; noShows: number; cancelled: number }> = {}
    const studentMap: Record<string, { name: string; completed: number; noShows: number; total: number }> = {}

    for (const b of bookings) {
      const dateKey = new Date(b.startsAt.getTime() - 3 * 60 * 60 * 1000)
        .toISOString().substring(0, 10)

      if (!dailyMap[dateKey]) dailyMap[dateKey] = { completed: 0, noShows: 0, cancelled: 0 }

      if (b.status === 'COMPLETED') {
        completed++
        dailyMap[dateKey].completed++
      } else if (b.status === 'NO_SHOW') {
        noShows++
        dailyMap[dateKey].noShows++
      } else if (b.status === 'CANCELLED') {
        cancelled++
        dailyMap[dateKey].cancelled++
      }

      // Student breakdown (only completed + no_show for rate)
      if (b.status === 'COMPLETED' || b.status === 'NO_SHOW') {
        const sid = b.studentId
        if (!studentMap[sid]) {
          studentMap[sid] = { name: b.student?.fullName || 'Desconhecido', completed: 0, noShows: 0, total: 0 }
        }
        studentMap[sid].total++
        if (b.status === 'COMPLETED') studentMap[sid].completed++
        if (b.status === 'NO_SHOW') studentMap[sid].noShows++
      }
    }

    const attendanceRate = totalBookings > 0
      ? Math.round((completed / totalBookings) * 1000) / 10
      : 0

    const dailyBreakdown = Object.entries(dailyMap)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, v]) => ({ date, ...v }))

    const studentBreakdown = Object.entries(studentMap)
      .map(([studentId, v]) => ({
        studentId,
        name: v.name,
        completed: v.completed,
        noShows: v.noShows,
        rate: v.total > 0 ? Math.round((v.completed / v.total) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.completed - a.completed)

    return NextResponse.json({
      period,
      days,
      totalBookings,
      completed,
      noShows,
      cancelled,
      attendanceRate,
      dailyBreakdown,
      studentBreakdown,
    })
  } catch (error) {
    console.error('[v1/reports/attendance] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
