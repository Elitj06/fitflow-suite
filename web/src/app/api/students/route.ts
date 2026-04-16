import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { prisma } from '@/lib/prisma'
import { createServerSupabaseClient } from '@/lib/supabase/server'

const CreateStudentSchema = z.object({
  fullName: z.string().min(2).max(100),
  email: z.string().email(),
  phone: z.string().max(20).optional(),
  birthDate: z.string().optional(),
  emergencyContact: z.string().max(200).optional(),
  healthNotes: z.string().max(2000).optional(),
  source: z.string().max(50).optional(),
})

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, org_id, role')
      .eq('user_id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (profile.role === 'STUDENT') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = request.nextUrl
    const search = searchParams.get('search')
    const sourceFilter = searchParams.get('source')
    const status = searchParams.get('status')
    const isSearching = search && search.trim().length >= 2

    // Build base query
    let query = supabase
      .from('profiles')
      .select('id, full_name, email, phone, coins_balance, is_active, avatar_url, health_notes, source, created_at')
      .eq('org_id', profile.org_id)
      .eq('role', 'STUDENT')
      .order('full_name')

    // Status filter
    if (status === 'active') {
      query = query.eq('is_active', true)
    } else if (status === 'inactive') {
      query = query.eq('is_active', false)
    }

    // Source filter
    if (sourceFilter === 'wellhub') {
      query = query.eq('source', 'wellhub')
    } else if (sourceFilter === 'totalpass') {
      query = query.eq('source', 'totalpass')
    } else if (sourceFilter === 'direct') {
      query = query.eq('source', 'direct')
    }

    // Database-side search filter — applied BEFORE the query executes
    if (isSearching) {
      const term = search.trim()
      query = query.or(`full_name.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%`)
      // When searching, limit to 100 results (search is precise, no need for more)
      query = query.limit(100)
    } else {
      query = query.limit(5000)
    }

    const { data: students, error: queryError } = await query

    if (queryError) {
      console.error('Students query error:', queryError)
      return NextResponse.json({ error: 'Query failed' }, { status: 500 })
    }

    // TRAINER role: restrict to students with existing bookings
    // BUT: when actively searching, show ALL org students so trainer
    //       can find and book students they haven't worked with yet
    let filtered = students || []
    if (profile.role === 'TRAINER' && !isSearching) {
      const trainerId = profile.id
      const { data: trainerBookings } = await supabase
        .from('bookings')
        .select('student_id')
        .eq('trainer_id', trainerId)
        .limit(10000)
      const trainerStudentIds = new Set((trainerBookings || []).map((b: any) => b.student_id))
      filtered = filtered.filter((s: any) => trainerStudentIds.has(s.id))
    }

    // Only fetch counts when explicitly requested (heavy queries)
    const includeCounts = searchParams.get('include_counts') === 'true'
    let checkinCounts: Record<string, number> = {}
    let bookingCounts: Record<string, number> = {}

    if (includeCounts) {
      const studentIds = filtered.map(s => s.id)
      const chunkSize = 200
      for (let i = 0; i < studentIds.length; i += chunkSize) {
        const chunk = studentIds.slice(i, i + chunkSize)
        const [checkinsRes, bookingsRes] = await Promise.all([
          supabase.from('checkins').select('student_id').in('student_id', chunk),
          supabase.from('bookings').select('student_id').in('student_id', chunk),
        ])
        ;(checkinsRes.data || []).forEach((c: any) => { checkinCounts[c.student_id] = (checkinCounts[c.student_id] || 0) + 1 })
        ;(bookingsRes.data || []).forEach((b: any) => { bookingCounts[b.student_id] = (bookingCounts[b.student_id] || 0) + 1 })
      }
    }

    return NextResponse.json(filtered.map(s => ({
      id: s.id,
      fullName: s.full_name,
      email: s.email,
      phone: s.phone,
      coinsBalance: s.coins_balance,
      isActive: s.is_active,
      avatarUrl: s.avatar_url,
      healthNotes: s.health_notes,
      source: s.source || null,
      createdAt: s.created_at,
      _count: {
        studentBookings: bookingCounts[s.id] || 0,
        checkins: checkinCounts[s.id] || 0,
      },
    })))
  } catch (e) {
    console.error('Students GET error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, org_id, role')
      .eq('user_id', user.id)
      .single()

    if (profileError || !profile || profile.role === 'STUDENT') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const rawBody = await request.json()
    const parsed = CreateStudentSchema.safeParse(rawBody)
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 })
    }
    const body = parsed.data

    const existing = await prisma.profile.findFirst({
      where: { orgId: profile.org_id, email: body.email, role: 'STUDENT' },
    })
    if (existing) return NextResponse.json({ error: 'Aluno com este email ja existe' }, { status: 409 })

    const student = await prisma.profile.create({
      data: {
        userId: `manual_${Date.now()}`,
        orgId: profile.org_id,
        role: 'STUDENT',
        fullName: body.fullName,
        email: body.email,
        phone: body.phone || null,
        birthDate: body.birthDate ? new Date(body.birthDate) : null,
        emergencyContact: body.emergencyContact || null,
        healthNotes: body.healthNotes || null,
        source: body.source || 'direct',
      },
    })

    return NextResponse.json(student, { status: 201 })
  } catch (e) {
    console.error('Students POST error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
