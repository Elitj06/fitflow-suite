import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedProfile } from '@/lib/api-auth'

export async function GET() {
  const profile = await getAuthenticatedProfile()
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
