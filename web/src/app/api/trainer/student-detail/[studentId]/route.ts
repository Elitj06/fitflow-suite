import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const profile = await prisma.profile.findUnique({
      where: { userId: user.id },
      select: { id: true, orgId: true, role: true },
    })
    if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { studentId, healthNotes, prescriptionId, prescriptionName, prescriptionTotalSessions } = body

    if (!studentId) return NextResponse.json({ error: 'studentId required' }, { status: 400 })

    // Verify student belongs to same org
    const student = await prisma.profile.findFirst({
      where: { id: studentId, orgId: profile.orgId, role: 'STUDENT' },
    })
    if (!student) return NextResponse.json({ error: 'Aluno nao encontrado' }, { status: 404 })

    const results: string[] = []

    // Update health notes
    if (healthNotes !== undefined) {
      await prisma.profile.update({
        where: { id: studentId },
        data: { healthNotes },
      })
      results.push('healthNotes updated')
    }

    // Update existing prescription
    if (prescriptionId && (prescriptionName !== undefined || prescriptionTotalSessions !== undefined)) {
      const updateData: any = {}
      if (prescriptionName !== undefined) updateData.name = prescriptionName
      if (prescriptionTotalSessions !== undefined) updateData.totalSessions = prescriptionTotalSessions

      await prisma.workoutPrescription.update({
        where: { id: prescriptionId },
        data: updateData,
      })
      results.push('prescription updated')
    }

    return NextResponse.json({ success: true, updated: results })
  } catch (e) {
    console.error('Trainer student update error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Create new prescription
export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const profile = await prisma.profile.findUnique({
      where: { userId: user.id },
      select: { id: true, orgId: true, role: true },
    })
    if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { studentId, name, totalSessions, code } = body

    if (!studentId || !totalSessions) {
      return NextResponse.json({ error: 'studentId e totalSessions obrigatorios' }, { status: 400 })
    }

    // Verify student
    const student = await prisma.profile.findFirst({
      where: { id: studentId, orgId: profile.orgId, role: 'STUDENT' },
    })
    if (!student) return NextResponse.json({ error: 'Aluno nao encontrado' }, { status: 404 })

    // Deactivate current active prescription
    await prisma.workoutPrescription.updateMany({
      where: { studentId, isActive: true },
      data: { isActive: false, completedAt: new Date() },
    })

    const prescriptionCode = code || `P-${Date.now().toString(36).toUpperCase()}`
    const prescription = await prisma.workoutPrescription.create({
      data: {
        orgId: profile.orgId,
        studentId,
        trainerId: profile.id,
        code: prescriptionCode,
        name: name || null,
        totalSessions,
        usedSessions: 0,
        isActive: true,
        startDate: new Date(),
      },
    })

    return NextResponse.json(prescription, { status: 201 })
  } catch (e) {
    console.error('Trainer create prescription error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
