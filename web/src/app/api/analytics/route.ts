import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('org_id, role')
      .eq('user_id', user.id)
      .single()

    if (!profile || profile.role === 'STUDENT') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const orgId = profile.org_id
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()
    const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString()

    // Queries paralelas
    const [
      activeStudents,
      bookings30d,
      weekCheckins,
      allCheckins,
      topStudents,
      servicesData,
      branchesData,
      bookingsByTrainer,
    ] = await Promise.all([
      // Total alunos ativos
      supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', orgId)
        .eq('role', 'STUDENT')
        .eq('is_active', true),

      // Agendamentos últimos 30 dias (não cancelados)
      supabase
        .from('bookings')
        .select('id, trainer_id, branch_id, service_id, starts_at, status')
        .eq('org_id', orgId)
        .gte('starts_at', thirtyDaysAgo)
        .neq('status', 'CANCELLED'),

      // Check-ins desta semana
      supabase
        .from('checkins')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', orgId)
        .gte('created_at', startOfWeek),

      // All checkins (for presence rate)
      supabase
        .from('checkins')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', orgId)
        .gte('created_at', thirtyDaysAgo),

      // Top 5 alunos por coins_balance (proxy para mais frequentes)
      supabase
        .from('profiles')
        .select('full_name, coins_balance')
        .eq('org_id', orgId)
        .eq('role', 'STUDENT')
        .eq('is_active', true)
        .order('coins_balance', { ascending: false })
        .limit(5),

      // Services
      supabase
        .from('services')
        .select('id, name')
        .eq('org_id', orgId),

      // Branches
      supabase
        .from('branches')
        .select('id, name')
        .eq('org_id', orgId),

      // All trainers
      supabase
        .from('profiles')
        .select('id, full_name')
        .eq('org_id', orgId)
        .eq('role', 'TRAINER'),
    ])

    // Build lookup maps
    const serviceMap = Object.fromEntries(
      (servicesData.data || []).map((s: { id: string; name: string }) => [s.id, s.name])
    )
    const branchMap = Object.fromEntries(
      (branchesData.data || []).map((b: { id: string; name: string }) => [b.id, b.name])
    )
    const trainerMap = Object.fromEntries(
      (bookingsByTrainer.data || []).map((t: { id: string; full_name: string }) => [t.id, t.full_name])
    )

    // Process bookings for analytics
    const bookings = bookings30d.data || []
    const totalBookings = bookings.length
    const totalCheckins = allCheckins.count || 0

    // Presence rate: checkins / bookings in last 30d
    const presenceRate = totalBookings > 0
      ? Math.round((totalCheckins / totalBookings) * 100)
      : 0

    // Bookings by service
    const serviceCounts: Record<string, { name: string; count: number }> = {}
    for (const b of bookings) {
      const name = serviceMap[b.service_id] || 'Desconhecido'
      if (!serviceCounts[b.service_id]) {
        serviceCounts[b.service_id] = { name, count: 0 }
      }
      serviceCounts[b.service_id].count++
    }

    // Bookings by trainer
    const trainerCounts: Record<string, { name: string; count: number }> = {}
    for (const b of bookings) {
      const name = trainerMap[b.trainer_id] || 'Desconhecido'
      if (!trainerCounts[b.trainer_id]) {
        trainerCounts[b.trainer_id] = { name, count: 0 }
      }
      trainerCounts[b.trainer_id].count++
    }

    // Bookings by branch
    const branchCounts: Record<string, { name: string; count: number }> = {}
    for (const b of bookings) {
      const name = branchMap[b.branch_id] || 'Desconhecido'
      if (!branchCounts[b.branch_id]) {
        branchCounts[b.branch_id] = { name, count: 0 }
      }
      branchCounts[b.branch_id].count++
    }

    // Peak hours: group by hour
    const hourCounts: Record<number, number> = {}
    for (const b of bookings) {
      const hour = new Date(b.starts_at).getHours()
      hourCounts[hour] = (hourCounts[hour] || 0) + 1
    }

    // Weekly frequency
    const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
    const weeklyFrequency = dayNames.map(day => ({ day, value: 0 }))
    for (const b of bookings) {
      const dow = new Date(b.starts_at).getDay()
      weeklyFrequency[dow].value++
    }

    return NextResponse.json({
      activeStudents: activeStudents.count || 0,
      bookings30d: totalBookings,
      weekCheckins: weekCheckins.count || 0,
      presenceRate,
      monthRevenue: 0,
      topStudents: (topStudents.data || []).map((s: { full_name: string; coins_balance: number }) => ({
        name: s.full_name,
        checkins: s.coins_balance || 0,
        streak: Math.floor((s.coins_balance || 0) / 3),
      })),
      weeklyFrequency,
      services: Object.values(serviceCounts)
        .sort((a, b) => b.count - a.count)
        .slice(0, 10),
      trainers: Object.values(trainerCounts)
        .sort((a, b) => b.count - a.count),
      branches: Object.values(branchCounts)
        .sort((a, b) => b.count - a.count),
      peakHours: Object.entries(hourCounts)
        .sort(([, a], [, b]) => b - a)
        .map(([hour, count]) => ({
          hour: `${hour.padStart(2, '0')}:00`,
          bookings: count,
        })),
    })
  } catch (e) {
    console.error('Analytics error:', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
