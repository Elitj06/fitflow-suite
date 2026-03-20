import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createServerSupabaseClient } from '@/lib/supabase/server'

async function getProfile() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  return prisma.profile.findUnique({ where: { userId: user.id } })
}

/**
 * GET /api/dashboard/stats
 * Returns real-time dashboard statistics
 */
export async function GET(request: NextRequest) {
  const profile = await getProfile()
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const orgId = profile.orgId
  const now = new Date()
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const endOfDay = new Date(startOfDay.getTime() + 86400000)
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)

  const [
    activeStudents,
    lastMonthStudents,
    todayBookings,
    monthBookings,
    lastMonthBookings,
    todayCheckins,
    monthCoinsEarned,
    lastMonthCoinsEarned,
    monthRevenue,
    lastMonthRevenue,
    chatMessagesToday,
    botBookings,
    botSales,
    wellhubCheckins,
    totalpassCheckins,
  ] = await Promise.all([
    // Active students this month
    prisma.profile.count({ where: { orgId, role: 'STUDENT', isActive: true } }),
    // Active students last month (approximate)
    prisma.profile.count({ where: { orgId, role: 'STUDENT', isActive: true, createdAt: { lt: startOfMonth } } }),
    // Today's bookings
    prisma.booking.count({ where: { orgId, startsAt: { gte: startOfDay, lt: endOfDay }, status: { not: 'CANCELLED' } } }),
    // This month bookings
    prisma.booking.count({ where: { orgId, startsAt: { gte: startOfMonth }, status: { not: 'CANCELLED' } } }),
    // Last month bookings
    prisma.booking.count({ where: { orgId, startsAt: { gte: startOfLastMonth, lte: endOfLastMonth }, status: { not: 'CANCELLED' } } }),
    // Today check-ins
    prisma.checkin.count({ where: { orgId, createdAt: { gte: startOfDay, lt: endOfDay } } }),
    // Coins earned this month
    prisma.coinTransaction.aggregate({
      where: { orgId, type: 'EARNED', createdAt: { gte: startOfMonth } },
      _sum: { amount: true },
    }),
    // Coins earned last month
    prisma.coinTransaction.aggregate({
      where: { orgId, type: 'EARNED', createdAt: { gte: startOfLastMonth, lte: endOfLastMonth } },
      _sum: { amount: true },
    }),
    // Revenue this month (from subscriptions)
    prisma.subscription.aggregate({
      where: { orgId, status: 'ACTIVE' },
      _sum: { price: true },
    }),
    // Revenue last month
    prisma.subscription.aggregate({
      where: { orgId, status: 'ACTIVE', createdAt: { lt: startOfMonth } },
      _sum: { price: true },
    }),
    // Chat messages today
    prisma.chatMessage.count({ where: { orgId, createdAt: { gte: startOfDay } } }),
    // Bookings via chatbot
    prisma.booking.count({ where: { orgId, source: 'WHATSAPP', createdAt: { gte: startOfMonth } } }),
    // "Sales" via chatbot (subscriptions created from WhatsApp source)
    prisma.subscription.count({ where: { orgId, createdAt: { gte: startOfMonth } } }),
    // Wellhub check-ins this month
    prisma.checkin.count({
      where: {
        orgId,
        createdAt: { gte: startOfMonth },
        booking: { student: { healthNotes: { contains: 'Wellhub' } } },
      },
    }),
    // TotalPass check-ins this month
    prisma.checkin.count({
      where: {
        orgId,
        createdAt: { gte: startOfMonth },
        booking: { notes: { contains: 'TotalPass' } },
      },
    }),
  ])

  // Calculate percentage changes
  const studentChange = lastMonthStudents > 0
    ? Math.round(((activeStudents - lastMonthStudents) / lastMonthStudents) * 100)
    : 0

  const bookingChange = lastMonthBookings > 0
    ? Math.round(((monthBookings - lastMonthBookings) / lastMonthBookings) * 100)
    : 0

  const coinsThisMonth = monthCoinsEarned._sum.amount || 0
  const coinsLastMonth = lastMonthCoinsEarned._sum.amount || 0
  const coinsChange = coinsLastMonth > 0
    ? Math.round(((coinsThisMonth - coinsLastMonth) / coinsLastMonth) * 100)
    : 0

  return NextResponse.json({
    students: {
      active: activeStudents,
      change: studentChange,
    },
    bookings: {
      today: todayBookings,
      month: monthBookings,
      change: bookingChange,
    },
    checkins: {
      today: todayCheckins,
    },
    coins: {
      monthEarned: coinsThisMonth,
      change: coinsChange,
    },
    revenue: {
      month: Number(monthRevenue._sum.price || 0),
      change: 0,
    },
    chatbot: {
      messagesToday: chatMessagesToday,
      bookingsViaBot: botBookings,
      salesViaBot: botSales,
    },
    partners: {
      wellhubCheckins,
      totalpassCheckins,
    },
  })
}
