import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { z } from 'zod'

const ServiceSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
  durationMinutes: z.number().min(15).max(480).default(60),
  price: z.number().min(0).default(0),
  maxCapacity: z.number().min(1).default(10),
  category: z.enum(['PERSONAL', 'GROUP', 'EVALUATION', 'OTHER']).default('GROUP'),
  color: z.string().default('#6366f1'),
  coinsReward: z.number().min(0).default(1),
  location: z.string().max(200).optional(), // outdoor, praia, condomínio, etc.
  modality: z.string().max(100).optional(), // modalidade personalizada
})

async function getProfile(supabase: any) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase.from('profiles').select('org_id, role').eq('user_id', user.id).single()
  return data
}

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()
    const profile = await getProfile(supabase)
    if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('org_id', profile.org_id)
      .eq('is_active', true)
      .order('name')

    if (error) throw error
    
    return NextResponse.json((data || []).map((s: any) => ({
      id: s.id,
      name: s.name,
      description: s.description,
      durationMinutes: s.duration_minutes,
      price: s.price,
      maxCapacity: s.max_capacity,
      category: s.category,
      color: s.color,
      coinsReward: s.coins_reward,
      location: s.location,
      modality: s.modality,
      isActive: s.is_active,
    })))
  } catch (e) {
    console.error('Services GET error:', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const profile = await getProfile(supabase)
    if (!profile || profile.role === 'STUDENT') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const parsed = ServiceSchema.parse(body)

    const { data, error } = await supabase
      .from('services')
      .insert({
        org_id: profile.org_id,
        name: parsed.name,
        description: parsed.description || null,
        duration_minutes: parsed.durationMinutes,
        price: parsed.price,
        max_capacity: parsed.maxCapacity,
        category: parsed.category,
        color: parsed.color,
        coins_reward: parsed.coinsReward,
        location: parsed.location || null,
        modality: parsed.modality || null,
        is_active: true,
      })
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data, { status: 201 })
  } catch (e: any) {
    if (e?.name === 'ZodError') {
      return NextResponse.json({ error: 'Dados inválidos', details: e.errors }, { status: 400 })
    }
    console.error('Services POST error:', e)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const profile = await getProfile(supabase)
    if (!profile || profile.role === 'STUDENT') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = request.nextUrl
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 })

    const { error } = await supabase
      .from('services')
      .update({ is_active: false })
      .eq('id', id)
      .eq('org_id', profile.org_id)

    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (e) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
