/**
 * GET /api/v1/reports/cancellations
 *
 * Cancellation report.
 *
 * Query params:
 *   period=week|month (default: week)
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
  const trainerId = searchParams.get('trainerId')

  try {
    const now = new Date()
    const days = period === 'month' ? 30 : 7
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)

    // All bookings in period (for rate calculation)
    const whereAll: any = { orgId, startsAt: { gte: startDate, lte: now } }
    if (trainerId) whereAll.trainerId = trainerId
    const totalBookings = await prisma.booking.count({ where: whereAll })

    // Cancelled bookings
    const whereCancelled: any = { ...whereAll, status: 'CANCELLED' }
    const cancelled = await prisma.booking.findMany({
      where: whereCancelled,
      include: {
        student: { select: { fullName: true } },
        trainer: { select: { fullName: true } },
      },
    })

    const totalCancellations = cancelled.length
    const cancellationRate = totalBookings > 0
      ? Math.round((totalCancellations / totalBookings) * 1000) / 10
      : 0

    // Groupings
    const reasons: Record<string, number> = {}
    const byDay: Record<string, number> = {}
    const byStudent: Record<string, number> = {}
    const byTrainer: Record<string, number> = {}

    for (const b of cancelled) {
      const reason = b.cancelReason || 'Sem motivo'
      reasons[reason] = (reasons[reason] || 0) + 1

      const dayKey = new Date(b.startsAt.getTime() - 3 * 60 * 60 * 1000)
        .toISOString().substring(0, 10)
      byDay[dayKey] = (byDay[dayKey] || 0) + 1

      const sName = b.student?.fullName || 'Desconhecido'
      byStudent[sName] = (byStudent[sName] || 0) + 1

      const tName = b.trainer?.fullName || 'Desconhecido'
      byTrainer[tName] = (byTrainer[tName] || 0) + 1
    }

    return NextResponse.json({
      period,
      totalCancellations,
      cancellationRate,
      reasons: Object.entries(reasons)
        .map(([reason, count]) => ({ reason, count }))
        .sort((a, b) => b.count - a.count),
      byDay: Object.entries(byDay)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, count]) => ({ date, count })),
      byStudent: Object.entries(byStudent)
        .sort((a, b) => b[1] - a[1])
        .map(([name, count]) => ({ name, count })),
      byTrainer: Object.entries(byTrainer)
        .sort((a, b) => b[1] - a[1])
        .map(([name, count]) => ({ name, count })),
    })
  } catch (error) {
    console.error('[v1/reports/cancellations] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
