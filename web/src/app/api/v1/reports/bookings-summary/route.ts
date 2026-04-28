/**
 * GET /api/v1/reports/bookings-summary?month=YYYY-MM
 * Returns a ready-to-use summary of bookings for a given month:
 * total, breakdown by trainer, by day of week, by time slot.
 * Used by Laura to generate reports WITHOUT mental math.
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyApiKey } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

const DAY_NAMES_PT: Record<number, string> = {
  0: 'Dom', 1: 'Seg', 2: 'Ter', 3: 'Qua',
  4: 'Qui', 5: 'Sex', 6: 'Sáb',
}

export async function GET(request: NextRequest) {
  const ctx = await verifyApiKey(request)
  if (!ctx) {
    return NextResponse.json({ error: 'Invalid or missing API key' }, { status: 401 })
  }

  const { orgId } = ctx
  const { searchParams } = request.nextUrl
  const monthStr = searchParams.get('month') // YYYY-MM

  if (!monthStr || !/^\d{4}-\d{2}$/.test(monthStr)) {
    return NextResponse.json({ error: 'Provide month=YYYY-MM' }, { status: 400 })
  }

  const [year, month] = monthStr.split('-').map(Number)
  const startOfMonth = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0))
  const endOfMonth = new Date(Date.UTC(year, month, 1, 0, 0, 0))

  // Fetch all confirmed/pending bookings for the month
  const bookings = await prisma.booking.findMany({
    where: {
      orgId,
      status: { in: ['PENDING', 'CONFIRMED'] },
      startsAt: { gte: startOfMonth, lt: endOfMonth },
    },
    include: {
      trainer: { select: { id: true, fullName: true } },
      student: { select: { id: true, fullName: true } },
      service: { select: { id: true, name: true } },
    },
    orderBy: { startsAt: 'asc' },
  })

  // By trainer
  const byTrainer: Record<string, { name: string; count: number; students: Set<string> }> = {}
  for (const b of bookings) {
    const tid = b.trainer?.id || 'unknown'
    if (!byTrainer[tid]) {
      byTrainer[tid] = { name: b.trainer?.fullName || 'Sem professor', count: 0, students: new Set() }
    }
    byTrainer[tid].count++
    if (b.student?.id) byTrainer[tid].students.add(b.student.id)
  }

  const trainerRanking = Object.values(byTrainer)
    .sort((a, b) => b.count - a.count)
    .map(t => ({
      name: t.name,
      bookings: t.count,
      uniqueStudents: t.students.size,
      percentage: +((t.count / bookings.length) * 100).toFixed(1),
    }))

  // By day of week
  const byDay: Record<number, number> = {}
  for (const b of bookings) {
    const dow = b.startsAt.getUTCDay()
    byDay[dow] = (byDay[dow] || 0) + 1
  }
  const dayBreakdown = Object.entries(byDay)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([dow, count]) => ({
      day: DAY_NAMES_PT[Number(dow)] || `Day ${dow}`,
      dayOfWeek: Number(dow),
      bookings: count,
    }))

  // By time slot (top 10 busiest)
  const byTime: Record<string, number> = {}
  for (const b of bookings) {
    const hour = b.startsAt.toLocaleTimeString('en-US', {
      timeZone: 'America/Sao_Paulo',
      hour: '2-digit', minute: '2-digit', hour12: false,
    })
    byTime[hour] = (byTime[hour] || 0) + 1
  }
  const topSlots = Object.entries(byTime)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)
    .map(([time, count]) => ({ time, bookings: count }))

  // Unique students
  const uniqueStudents = new Set(bookings.map(b => b.student?.id).filter(Boolean))

  return NextResponse.json({
    month: monthStr,
    totalBookings: bookings.length,
    uniqueStudents: uniqueStudents.size,
    trainerRanking,
    dayBreakdown,
    topTimeSlots: topSlots,
  })
}
