import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const profile = await prisma.profile.findUnique({
    where: { userId: user.id },
    include: { organization: { select: { name: true, plan: true, coinsEnabled: true } } },
  })

  if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

  return NextResponse.json({
    id: profile.id,
    fullName: profile.fullName,
    email: profile.email,
    role: profile.role,
    avatarUrl: profile.avatarUrl,
    coinsBalance: profile.coinsBalance,
    orgId: profile.orgId,
    organization: profile.organization,
  })
}
