import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createServerSupabaseClient } from '@/lib/supabase/server'

async function getProfile() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  return prisma.profile.findUnique({ where: { userId: user.id } })
}

export async function GET() {
  const profile = await getProfile()
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const leaderboard = await prisma.profile.findMany({
    where: { orgId: profile.orgId, role: 'STUDENT', isActive: true },
    select: {
      id: true, fullName: true, coinsBalance: true,
      _count: { select: { checkins: true } },
    },
    orderBy: { coinsBalance: 'desc' },
    take: 20,
  })
  return NextResponse.json(leaderboard)
}
