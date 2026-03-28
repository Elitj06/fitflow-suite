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

    // Queries paralelas
    const [
      activeStudents,
      weekCheckins,
      topStudents,
    ] = await Promise.all([
      // Total alunos ativos
      supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', orgId)
        .eq('role', 'STUDENT')
        .eq('is_active', true),

      // Check-ins desta semana
      supabase
        .from('checkins')
        .select('id', { count: 'exact', head: true })
        .eq('org_id', orgId)
        .gte('created_at', startOfWeek),

      // Top 5 alunos por coins_balance (proxy para mais frequentes)
      supabase
        .from('profiles')
        .select('full_name, coins_balance')
        .eq('org_id', orgId)
        .eq('role', 'STUDENT')
        .eq('is_active', true)
        .order('coins_balance', { ascending: false })
        .limit(5),
    ])

    return NextResponse.json({
      activeStudents: activeStudents.count || 0,
      weekCheckins: weekCheckins.count || 0,
      presenceRate: 87, // calculado futuramente com dados reais de booking
      monthRevenue: 0,  // integrar com Stripe futuramente
      topStudents: (topStudents.data || []).map(s => ({
        name: s.full_name,
        checkins: s.coins_balance || 0,
        streak: Math.floor((s.coins_balance || 0) / 3),
      })),
      weeklyFrequency: [
        { day: 'Seg', value: 0 },
        { day: 'Ter', value: 0 },
        { day: 'Qua', value: 0 },
        { day: 'Qui', value: 0 },
        { day: 'Sex', value: 0 },
        { day: 'Sáb', value: 0 },
        { day: 'Dom', value: 0 },
      ],
    })
  } catch (e) {
    console.error('Analytics error:', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
