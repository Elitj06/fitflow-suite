import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createServerSupabaseClient } from '@/lib/supabase/server'

async function getProfile() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  return prisma.profile.findUnique({ where: { userId: user.id } })
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const profile = await getProfile()
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { status } = await request.json()
  const booking = await prisma.booking.findFirst({
    where: { id: params.id, orgId: profile.orgId },
  })
  if (!booking) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const updated = await prisma.booking.update({
    where: { id: params.id },
    data: { status },
  })
  return NextResponse.json(updated)
}
