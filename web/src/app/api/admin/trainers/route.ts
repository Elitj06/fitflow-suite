import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { createServerSupabaseClient } from '@/lib/supabase/server'

async function getAdminProfile(request: NextRequest) {
  const supabase = await createServerSupabaseClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, org_id, role')
    .eq('user_id', user.id)
    .single()

  if (!profile || profile.role !== 'ADMIN') return null
  return profile
}

const CreateTrainerSchema = z.object({
  fullName: z.string().min(2).max(100),
  email: z.string().email(),
  phone: z.string().max(20).optional(),
  specialties: z.array(z.string()).optional(),
})

const UpdateTrainerSchema = z.object({
  fullName: z.string().min(2).max(100).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(20).optional(),
  specialties: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
})

export async function GET() {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('org_id, role')
      .eq('user_id', user.id)
      .single()

    if (!profile || profile.role !== 'ADMIN') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const trainers = await prisma.profile.findMany({
      where: { orgId: profile.org_id, role: 'TRAINER' },
      orderBy: { fullName: 'asc' },
      include: {
        _count: { select: { trainerBookings: true } },
      },
    })

    return NextResponse.json(trainers.map(t => ({
      id: t.id,
      fullName: t.fullName,
      email: t.email,
      phone: t.phone,
      specialties: t.specialties,
      isActive: t.isActive,
      bookingCount: t._count.trainerBookings,
      createdAt: t.createdAt,
    })))
  } catch (e) {
    console.error('Trainers GET error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const profile = await getAdminProfile(request)
    if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const rawBody = await request.json()
    const parsed = CreateTrainerSchema.safeParse(rawBody)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

    const existing = await prisma.profile.findFirst({
      where: { orgId: profile.org_id, email: parsed.data.email, role: 'TRAINER' },
    })
    if (existing) return NextResponse.json({ error: 'Professor com este email já existe' }, { status: 409 })

    const trainer = await prisma.profile.create({
      data: {
        userId: `manual_${Date.now()}`,
        orgId: profile.org_id,
        role: 'TRAINER',
        fullName: parsed.data.fullName,
        email: parsed.data.email,
        phone: parsed.data.phone || null,
        specialties: parsed.data.specialties || [],
      },
    })

    return NextResponse.json(trainer, { status: 201 })
  } catch (e) {
    console.error('Trainers POST error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
