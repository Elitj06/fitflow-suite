import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getAuthenticatedProfile } from '@/lib/api-auth'

export async function GET() {
  const profile = await getAuthenticatedProfile()
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const where = profile.role === 'STUDENT'
    ? { orgId: profile.orgId, profileId: profile.id }
    : { orgId: profile.orgId }

  const transactions = await prisma.coinTransaction.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 50,
  })
  return NextResponse.json(transactions)
}
