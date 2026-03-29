import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/dashboard/stats
 * Returns real-time dashboard statistics using Supabase REST
 */
export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('org_id, role')
      .eq('user_id', user.id)
      .single()

    if (profileError || !profile) {
      console.error('Profile fetch error:', profileError)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const orgId = profile.org_id
    const now = new Date()
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()

    // Run all queries in parallel
    const [
      activeStudentsResult,
      todayBookingsResult,
      monthBookingsResult,
      todayCheckinsResult,
      monthCoinsResult,
      activeSubscriptionsResult,
      wellhubCheckinsResult,
      totalpassCheckinsResult,
      chatMessagesTodayResult,
    ] = await Promise.all([
      // Active students
      supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', orgId)
        .eq('role', 'STUDENT')
        .eq('is_active', true),

      // Today's bookings (non-cancelled)
      supabase
        .from('bookings')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', orgId)
        .gte('starts_at', startOfDay)
        .lt('starts_at', endOfDay)
        .neq('status', 'CANCELLED'),

      // This month's bookings (non-cancelled)
      supabase
        .from('bookings')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', orgId)
        .gte('starts_at', startOfMonth)
        .neq('status', 'CANCELLED'),

      // Today's check-ins
      supabase
        .from('checkins')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', orgId)
        .gte('created_at', startOfDay)
        .lt('created_at', endOfDay),

      // Coins earned this month
      supabase
        .from('coin_transactions')
        .select('amount')
        .eq('org_id', orgId)
        .eq('type', 'EARNED')
        .gte('created_at', startOfMonth),

      // Active subscriptions for revenue calculation
      prisma.subscription.findMany({
        where: {
          orgId,
          status: 'ACTIVE',
        },
        select: { price: true, planName: true },
      }),

      // Wellhub check-ins this week (via booking notes — legacy detection)
      supabase
        .from('bookings')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', orgId)
        .gte('starts_at', startOfWeek)
        .ilike('notes', '%wellhub%'),

      // TotalPass check-ins this week
      supabase
        .from('bookings')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', orgId)
        .gte('starts_at', startOfWeek)
        .ilike('notes', '%totalpass%'),

      // Chatbot messages today
      supabase
        .from('chat_messages')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', orgId)
        .gte('created_at', startOfDay)
        .lt('created_at', endOfDay),
    ])

    const activeStudents = activeStudentsResult.count || 0
    const todayBookings = todayBookingsResult.count || 0
    const monthBookings = monthBookingsResult.count || 0
    const todayCheckins = todayCheckinsResult.count || 0
    const coinsEarned = (monthCoinsResult.data || []).reduce((sum: number, t: any) => sum + (t.amount || 0), 0)

    // Revenue: sum from active subscriptions using stored price field
    const revenueMonth = (activeSubscriptionsResult || []).reduce(
      (sum: number, sub: { price: any; planName: string }) => sum + Number(sub.price || 0),
      0
    )

    // Partners: count from legacy notes detection (until source field is fully rolled out)
    const wellhubCheckins = wellhubCheckinsResult.count || 0
    const totalpassCheckins = totalpassCheckinsResult.count || 0

    // Chatbot: return null if table doesn't exist or query fails
    const chatMessagesToday =
      chatMessagesTodayResult.error ? null : (chatMessagesTodayResult.count ?? null)

    return NextResponse.json({
      students: {
        active: activeStudents,
        change: 0,
      },
      bookings: {
        today: todayBookings,
        month: monthBookings,
        change: 0,
      },
      checkins: {
        today: todayCheckins,
      },
      coins: {
        monthEarned: coinsEarned,
        change: 0,
      },
      revenue: {
        month: revenueMonth,
        change: 0,
      },
      chatbot: {
        messagesToday: chatMessagesToday,
        bookingsViaBot: 0,
        salesViaBot: 0,
      },
      partners: {
        wellhubCheckins,
        totalpassCheckins,
      },
    })
  } catch (e) {
    console.error('Dashboard stats error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
