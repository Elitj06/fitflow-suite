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
      activeStudentsRes,
      bookings30d,
      weekCheckinsRes,
      completedBookings30d,
      bookingsPerStudent30d,
      bookingsPerStudentWeek,
      servicesData,
      branchesData,
      bookingsByTrainer,
      bookingsByStatus30d,
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
        .select('id, student_id, trainer_id, branch_id, service_id, starts_at, status')
        .eq('org_id', orgId)
        .gte('starts_at', thirtyDaysAgo)
        .neq('status', 'CANCELLED'),

      // Check-ins desta semana
      supabase
        .from('bookings')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', orgId)
        .eq('status', 'COMPLETED')
        .gte('starts_at', startOfWeek)
        .neq('status', 'CANCELLED'),

      // Completed bookings (proxy for checkins) last 30d
      supabase
        .from('bookings')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', orgId)
        .eq('status', 'COMPLETED')
        .gte('starts_at', thirtyDaysAgo),

      // Top alunos por agendamentos (real data, not coins)
      supabase
        .from('bookings')
        .select('student_id')
        .eq('org_id', orgId)
        .neq('status', 'CANCELLED')
        .gte('starts_at', thirtyDaysAgo),

      // This week bookings for weekly frequency
      supabase
        .from('bookings')
        .select('student_id')
        .eq('org_id', orgId)
        .eq('status', 'COMPLETED')
        .gte('starts_at', startOfWeek),

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

      // Bookings grouped by status for status breakdown
      supabase
        .from('bookings')
        .select('status')
        .eq('org_id', orgId)
        .gte('starts_at', thirtyDaysAgo),
    ])

    // Build lookup maps
    const serviceMap = Object.fromEntries(
      (servicesData.data || []).map((s: { id: string; name: string }) => [s.id, s.name])
    )
    const branchMap = Object.fromEntries(
      (branchesData.data || []).map((b: { id: string; name: string }) => [b.id, b.name])
    )
    // Build trainer lookup from ALL profiles in the org (not just role=TRAINER)
    // This includes ADMIN profiles that may have bookings (e.g. Rafael as ADMIN)
    // Strategy: collect unique trainer_ids from bookings, then fetch their profiles
    const uniqueTrainerIds = [...new Set(bookings.map((b: { trainer_id: string | null }) => b.trainer_id).filter(Boolean))] as string[]
    let trainerMap: Record<string, string> = {}
    
    if (uniqueTrainerIds.length > 0) {
      const { data: trainerProfiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', uniqueTrainerIds)
      
      trainerMap = Object.fromEntries(
        (trainerProfiles || []).map((t: { id: string; full_name: string }) => [t.id, t.full_name])
      )
    }
    
    // Also fetch ALL org profiles as fallback (includes names for non-trainer profiles)
    const { data: allOrgProfiles } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('org_id', orgId)
    
    // Merge: specific trainer lookup takes priority, org profiles as fallback
    for (const t of (allOrgProfiles || []) as { id: string; full_name: string }[]) {
      if (!trainerMap[t.id]) {
        trainerMap[t.id] = t.full_name
      }
    }

    // Process bookings for analytics
    const bookings = bookings30d.data || []
    const totalBookings = bookings.length
    const completedBookings = completedBookings30d.count || 0
    const weekCompletedBookings = weekCheckinsRes.count || 0

    // Presence rate: completed / total bookings in last 30d
    const presenceRate = totalBookings > 0
      ? Math.round((completedBookings / totalBookings) * 100)
      : 0

    // Status breakdown
    const statusCounts: Record<string, number> = {}
    for (const b of (bookingsByStatus30d.data || [])) {
      statusCounts[b.status] = (statusCounts[b.status] || 0) + 1
    }

    // Top students by booking count (real data)
    const studentBookingCounts: Record<string, number> = {}
    for (const b of (bookingsPerStudent30d.data || [])) {
      studentBookingCounts[b.student_id] = (studentBookingCounts[b.student_id] || 0) + 1
    }

    // Get top 5 student names
    const topStudentIds = Object.entries(studentBookingCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([id]) => id)

    const { data: topStudentProfiles } = topStudentIds.length > 0
      ? await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', topStudentIds)
      : { data: [] as { id: string; full_name: string }[] | null }

    const topStudentMap = Object.fromEntries(
      (topStudentProfiles || []).map((s: { id: string; full_name: string }) => [s.id, s.full_name])
    )

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
      const name = branchMap[b.branch_id] || (b.branch_id ? 'Desconhecido' : 'Sem unidade')
      if (!branchCounts[b.branch_id]) {
        branchCounts[b.branch_id] = { name, count: 0 }
      }
      branchCounts[b.branch_id].count++
    }

    // Peak hours: group by BRT hour (UTC-3)
    const hourCounts: Record<number, number> = {}
    for (const b of bookings) {
      // starts_at is stored in UTC; convert to BRT (UTC-3) for display
      const utcHour = new Date(b.starts_at).getHours()
      const brtHour = (utcHour - 3 + 24) % 24
      hourCounts[brtHour] = (hourCounts[brtHour] || 0) + 1
    }

    // Weekly frequency (by BRT day of week)
    const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']
    const weeklyFrequency = dayNames.map(day => ({ day, value: 0 }))
    for (const b of bookings) {
      // Convert UTC starts_at to BRT to get correct day of week
      const utcDate = new Date(b.starts_at)
      const brtDate = new Date(utcDate.getTime() - 3 * 60 * 60 * 1000)
      const dow = brtDate.getUTCDay()
      weeklyFrequency[dow].value++
    }

    return NextResponse.json({
      activeStudents: activeStudentsRes.count || 0,
      bookings30d: totalBookings,
      weekCheckins: weekCompletedBookings,
      presenceRate,
      monthRevenue: 0,
      statusBreakdown: statusCounts,
      topStudents: topStudentIds.map(id => ({
        name: topStudentMap[id] || 'Desconhecido',
        checkins: studentBookingCounts[id] || 0,
        streak: Math.floor((studentBookingCounts[id] || 0) / 3),
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
