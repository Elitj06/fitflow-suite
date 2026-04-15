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

const UpdateTrainerSchema = z.object({
  fullName: z.string().min(2).max(100).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(20).optional(),
  specialties: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
})

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const profile = await getAdminProfile(request)
    if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const rawBody = await request.json()
    const parsed = UpdateTrainerSchema.safeParse(rawBody)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

    const trainer = await prisma.profile.findFirst({
      where: { id, orgId: profile.org_id, role: 'TRAINER' },
    })
    if (!trainer) return NextResponse.json({ error: 'Professor não encontrado' }, { status: 404 })

    const updated = await prisma.profile.update({
      where: { id },
      data: parsed.data,
    })

    return NextResponse.json(updated)
  } catch (e) {
    console.error('Trainer PATCH error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const profile = await getAdminProfile(request)
    if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params

    const trainer = await prisma.profile.findFirst({
      where: { id, orgId: profile.org_id, role: 'TRAINER' },
    })
    if (!trainer) return NextResponse.json({ error: 'Professor não encontrado' }, { status: 404 })

    // Check for future bookings
    const futureBookings = await prisma.booking.count({
      where: {
        trainerId: id,
        startsAt: { gte: new Date() },
        status: { notIn: ['CANCELLED'] },
      },
    })

    if (futureBookings > 0) {
      return NextResponse.json({
        error: `Professor possui ${futureBookings} agendamento(s) futuro(s). Reasse ou cancele os agendamentos antes de excluir.`,
      }, { status: 409 })
    }

    // Soft delete
    await prisma.profile.update({
      where: { id },
      data: { isActive: false },
    })

    return NextResponse.json({ success: true, message: 'Professor desativado com sucesso' })
  } catch (e) {
    console.error('Trainer DELETE error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
