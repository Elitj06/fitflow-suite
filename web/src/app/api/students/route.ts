import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createServerSupabaseClient } from '@/lib/supabase/server'

async function getProfile() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  return prisma.profile.findUnique({ where: { userId: user.id } })
}

export async function GET(request: NextRequest) {
  const profile = await getProfile()
  if (!profile || profile.role === 'STUDENT') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = request.nextUrl
  const search = searchParams.get('search')
  const source = searchParams.get('source')
  const status = searchParams.get('status')

  const where: any = { orgId: profile.orgId, role: 'STUDENT' }
  if (search) {
    where.OR = [
      { fullName: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { phone: { contains: search } },
    ]
  }
  if (status === 'active') where.isActive = true
  if (status === 'inactive') where.isActive = false
  if (source === 'wellhub') where.healthNotes = { contains: 'Wellhub' }
  if (source === 'totalpass') where.healthNotes = { contains: 'TotalPass' }

  const students = await prisma.profile.findMany({
    where,
    select: {
      id: true, fullName: true, email: true, phone: true,
      coinsBalance: true, isActive: true, avatarUrl: true,
      healthNotes: true, createdAt: true,
      _count: { select: { studentBookings: true, checkins: true } },
    },
    orderBy: { fullName: 'asc' },
  })

  return NextResponse.json(students)
}

export async function POST(request: NextRequest) {
  const profile = await getProfile()
  if (!profile || profile.role === 'STUDENT') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()

  // Check if student already exists
  const existing = await prisma.profile.findFirst({
    where: { orgId: profile.orgId, email: body.email, role: 'STUDENT' },
  })
  if (existing) return NextResponse.json({ error: 'Aluno com este email ja existe' }, { status: 409 })

  const student = await prisma.profile.create({
    data: {
      userId: `manual_${Date.now()}`,
      orgId: profile.orgId,
      role: 'STUDENT',
      fullName: body.fullName,
      email: body.email,
      phone: body.phone || null,
      birthDate: body.birthDate ? new Date(body.birthDate) : null,
      emergencyContact: body.emergencyContact || null,
      healthNotes: body.healthNotes || null,
    },
  })

  return NextResponse.json(student, { status: 201 })
}
