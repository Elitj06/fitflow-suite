import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createServerSupabaseClient } from '@/lib/supabase/server'

async function getProfile() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  return prisma.profile.findUnique({ where: { userId: user.id } })
}

export async function GET(request: NextRequest) {
  const profile = await getProfile()
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const services = await prisma.service.findMany({
    where: { orgId: profile.orgId },
    orderBy: { name: 'asc' },
  })

  return NextResponse.json(services)
}

export async function POST(request: NextRequest) {
  const profile = await getProfile()
  if (!profile || profile.role === 'STUDENT') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const service = await prisma.service.create({
    data: {
      orgId: profile.orgId,
      name: body.name,
      description: body.description || null,
      durationMinutes: body.durationMinutes,
      price: body.price,
      maxCapacity: body.maxCapacity || 1,
      category: body.category || 'PERSONAL',
      color: body.color || '#6366f1',
      coinsReward: body.coinsReward ?? 1,
    },
  })

  return NextResponse.json(service, { status: 201 })
}

export async function PUT(request: NextRequest) {
  const profile = await getProfile()
  if (!profile || profile.role === 'STUDENT') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const service = await prisma.service.update({
    where: { id: body.id, orgId: profile.orgId },
    data: {
      name: body.name,
      description: body.description,
      durationMinutes: body.durationMinutes,
      price: body.price,
      maxCapacity: body.maxCapacity,
      category: body.category,
      color: body.color,
      coinsReward: body.coinsReward,
      isActive: body.isActive,
    },
  })

  return NextResponse.json(service)
}
