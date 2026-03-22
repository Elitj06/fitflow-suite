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

  const now = new Date()
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

  const [totalBalance, monthEarned, monthSpent] = await Promise.all([
    prisma.profile.aggregate({
      where: { orgId: profile.orgId, role: 'STUDENT' },
      _sum: { coinsBalance: true },
    }),
    prisma.coinTransaction.aggregate({
      where: { orgId: profile.orgId, type: 'EARNED', createdAt: { gte: startOfMonth } },
      _sum: { amount: true },
    }),
    prisma.coinTransaction.aggregate({
      where: { orgId: profile.orgId, type: 'SPENT', createdAt: { gte: startOfMonth } },
      _sum: { amount: true },
    }),
  ])

  return NextResponse.json({
    totalBalance: totalBalance._sum.coinsBalance || 0,
    monthEarned: monthEarned._sum.amount || 0,
    monthSpent: Math.abs(monthSpent._sum.amount || 0),
  })
}
