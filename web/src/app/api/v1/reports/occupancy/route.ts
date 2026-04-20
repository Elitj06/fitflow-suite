/**
 * GET /api/v1/reports/occupancy
 *
 * Reports on booking occupancy, peak hours, daily averages.
 * Used by Laura to answer admin questions.
 *
 * Query params:
 *   period=week|month (default: week)
 *   trainerId=xxx (optional filter)
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
  const trainerId = searchParams.get('trainerId')

  try {
    const now = new Date()
    const periodDays = period === 'month' ? 30 : 7
    const startDate = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000)

    const where: any = {
      orgId,
      status: { not: 'CANCELLED' },
      startsAt: { gte: startDate, lte: now },
    }
    if (trainerId) where.trainerId = trainerId

    const bookings = await prisma.booking.findMany({
      where,
      include: {
        trainer: { select: { id: true, fullName: true } },
      },
      orderBy: { startsAt: 'asc' },
    })

    // Peak hours: group by hour (BRT)
    const hourCounts: Record<number, number> = {}
    const dayCounts: Record<string, number> = {}
    const trainerCounts: Record<string, { name: string; count: number }> = {}

    for (const b of bookings) {
      const brtHour = new Date(b.startsAt.getTime() - 3 * 60 * 60 * 1000).getHours()
      hourCounts[brtHour] = (hourCounts[brtHour] || 0) + 1

      const dayKey = new Date(b.startsAt.getTime() - 3 * 60 * 60 * 1000)
        .toISOString().substring(0, 10)
      dayCounts[dayKey] = (dayCounts[dayKey] || 0) + 1

      const tid = b.trainerId
      if (!trainerCounts[tid]) {
        trainerCounts[tid] = { name: b.trainer.fullName, count: 0 }
      }
      trainerCounts[tid].count++
    }

    // Peak hour
    const peakHour = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0]
    const sortedHours = Object.entries(hourCounts)
      .sort((a, b) => Number(a[0]) - Number(b[0]))
      .map(([h, c]) => ({ hour: `${h}:00`, bookings: c }))

    // Daily average
    const totalBookings = bookings.length
    const uniqueDays = Object.keys(dayCounts).length
    const dailyAverage = uniqueDays > 0 ? Math.round((totalBookings / uniqueDays) * 10) / 10 : 0

    // Trainer ranking
    const trainerRanking = Object.values(trainerCounts)
      .sort((a, b) => b.count - a.count)

    // Busiest day
    const busiestDay = Object.entries(dayCounts).sort((a, b) => b[1] - a[1])[0]

    return NextResponse.json({
      period,
      days: periodDays,
      totalBookings,
      dailyAverage,
      busiestDay: busiestDay ? { date: busiestDay[0], bookings: busiestDay[1] } : null,
      peakHour: peakHour ? { hour: `${peakHour[0]}:00`, bookings: peakHour[1] } : null,
      hourlyDistribution: sortedHours,
      trainerRanking,
    })
  } catch (error) {
    console.error('[v1/reports/occupancy] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
