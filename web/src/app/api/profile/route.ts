import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('id, full_name, email, role, org_id, coins_balance, avatar_url')
      .eq('user_id', user.id)
      .single()

    if (error || !profile) {
      console.error('Profile fetch error:', error)
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Fetch org info separately
    const { data: org } = await supabase
      .from('organizations')
      .select('name, plan, coins_enabled')
      .eq('id', profile.org_id)
      .single()

    return NextResponse.json({
      id: profile.id,
      fullName: profile.full_name,
      email: profile.email,
      role: profile.role,
      orgId: profile.org_id,
      coinsBalance: profile.coins_balance,
      avatarUrl: profile.avatar_url,
      organization: org ? {
        name: org.name,
        plan: org.plan,
        coinsEnabled: org.coins_enabled,
      } : null,
    })
  } catch (e) {
    console.error('Profile GET error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
