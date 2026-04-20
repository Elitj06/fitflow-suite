/**
 * GET /api/v1/reports/summary
 *
 * General business summary for admins. Revenue, active students,
 * bookings today/month, checkins, etc.
 * Used by Laura when admins ask "como está a academia?".
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

  try {
    const now = new Date()
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

    const [
      activeStudents,
      todayBookings,
      monthBookings,
      todayCheckins,
      weekBookings,
      monthRevenue,
    ] = await Promise.all([
      prisma.profile.count({
        where: { orgId, role: 'STUDENT', isActive: true },
      }),
      prisma.booking.count({
        where: {
          orgId,
          status: { not: 'CANCELLED' },
          startsAt: { gte: startOfDay },
        },
      }),
      prisma.booking.count({
        where: {
          orgId,
          status: { not: 'CANCELLED' },
          startsAt: { gte: startOfMonth },
        },
      }),
      prisma.checkin.count({
        where: {
          orgId,
          createdAt: { gte: startOfDay },
        },
      }),
      prisma.booking.count({
        where: {
          orgId,
          status: { not: 'CANCELLED' },
          startsAt: { gte: startOfWeek },
        },
      }),
      prisma.subscription.aggregate({
        where: { orgId, status: 'ACTIVE' },
        _sum: { price: true },
      }),
    ])

    return NextResponse.json({
      students: { active: activeStudents },
      bookings: {
        today: todayBookings,
        thisWeek: weekBookings,
        thisMonth: monthBookings,
      },
      checkins: { today: todayCheckins },
      revenue: {
        month: Number(monthRevenue._sum.price || 0),
      },
    })
  } catch (error) {
    console.error('[v1/reports/summary] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
