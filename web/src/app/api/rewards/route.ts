import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { createServerSupabaseClient } from '@/lib/supabase/server'

const CreateRewardSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  costCoins: z.number().int().positive(),
  stock: z.number().int().nonnegative().nullable().optional(),
  imageUrl: z.string().url().optional().or(z.literal('')),
})

async function getProfile() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  return prisma.profile.findUnique({ where: { userId: user.id } })
}

export async function GET(request: NextRequest) {
  const profile = await getProfile()
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rewards = await prisma.reward.findMany({
    where: { orgId: profile.orgId },
    orderBy: { costCoins: 'asc' },
  })

  return NextResponse.json(rewards)
}

export async function POST(request: NextRequest) {
  const profile = await getProfile()
  if (!profile || profile.role === 'STUDENT') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const rawBody = await request.json()
  const parsed = CreateRewardSchema.safeParse(rawBody)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
  }
  const body = parsed.data

  const reward = await prisma.reward.create({
    data: {
      orgId: profile.orgId,
      name: body.name,
      description: body.description || null,
      costCoins: body.costCoins,
      stock: body.stock ?? null,
      imageUrl: body.imageUrl || null,
      isActive: true,
    },
  })

  return NextResponse.json(reward, { status: 201 })
}

export async function PUT(request: NextRequest) {
  const profile = await getProfile()
  if (!profile || profile.role === 'STUDENT') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()

  const reward = await prisma.reward.update({
    where: { id: body.id, orgId: profile.orgId },
    data: {
      name: body.name,
      description: body.description,
      costCoins: body.costCoins,
      stock: body.stock,
      imageUrl: body.imageUrl,
      isActive: body.isActive,
    },
  })

  return NextResponse.json(reward)
}
