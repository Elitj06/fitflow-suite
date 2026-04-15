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

  if (!profile || profile.role === 'STUDENT') return null
  return profile
}

const UpdateStudentSchema = z.object({
  fullName: z.string().min(2).max(100).optional(),
  email: z.string().email().optional(),
  phone: z.string().max(20).optional(),
  source: z.string().max(50).optional(),
  healthNotes: z.string().max(2000).optional(),
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
    const parsed = UpdateStudentSchema.safeParse(rawBody)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })

    // Verify student belongs to same org
    const student = await prisma.profile.findFirst({
      where: { id, orgId: profile.org_id, role: 'STUDENT' },
    })
    if (!student) return NextResponse.json({ error: 'Aluno não encontrado' }, { status: 404 })

    const updated = await prisma.profile.update({
      where: { id },
      data: parsed.data,
    })

    return NextResponse.json(updated)
  } catch (e) {
    console.error('Student PATCH error:', e)
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
    if (profile.role !== 'ADMIN') return NextResponse.json({ error: 'Apenas admin pode excluir' }, { status: 403 })

    const { id } = await params

    const student = await prisma.profile.findFirst({
      where: { id, orgId: profile.org_id, role: 'STUDENT' },
    })
    if (!student) return NextResponse.json({ error: 'Aluno não encontrado' }, { status: 404 })

    // Check for future bookings
    const futureBookings = await prisma.booking.count({
      where: {
        studentId: id,
        startsAt: { gte: new Date() },
        status: { notIn: ['CANCELLED'] },
      },
    })

    if (futureBookings > 0) {
      return NextResponse.json({
        error: `Aluno possui ${futureBookings} agendamento(s) futuro(s). Cancele os agendamentos antes de excluir.`,
      }, { status: 409 })
    }

    // Soft delete — deactivate
    await prisma.profile.update({
      where: { id },
      data: { isActive: false },
    })

    return NextResponse.json({ success: true, message: 'Aluno desativado com sucesso' })
  } catch (e) {
    console.error('Student DELETE error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
