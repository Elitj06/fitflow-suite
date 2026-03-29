import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedProfile } from '@/lib/api-auth'

export async function GET() {
  const profile = await getAuthenticatedProfile()
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
