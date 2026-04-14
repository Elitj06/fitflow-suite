import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('org_id, role')
      .eq('user_id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: trainers, error } = await supabase
      .from('profiles')
      .select('id, full_name, role')
      .eq('org_id', profile.org_id)
      .in('role', ['ADMIN', 'TRAINER'])
      .eq('is_active', true)
      .order('full_name')

    if (error) {
      return NextResponse.json({ error: 'Query failed' }, { status: 500 })
    }

    return NextResponse.json((trainers || []).map(t => ({
      id: t.id,
      fullName: t.full_name,
      role: t.role,
    })))
  } catch (e) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
