import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createServerSupabaseClient()
    const { data: { user }, error } = await supabase.auth.getUser()
    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const profile = await prisma.profile.findUnique({
      where: { userId: user.id },
      select: { id: true, orgId: true, role: true },
    })
    if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = request.nextUrl
    const studentId = searchParams.get('studentId')
    if (!studentId) return NextResponse.json({ error: 'studentId required' }, { status: 400 })

    // Get student profile
    const student = await prisma.profile.findFirst({
      where: { id: studentId, orgId: profile.orgId, role: 'STUDENT' },
      select: {
        id: true, fullName: true, email: true, phone: true,
        healthNotes: true, emergencyContact: true, birthDate: true,
        avatarUrl: true, coinsBalance: true, isActive: true, source: true,
        createdAt: true,
      },
    })
    if (!student) return NextResponse.json({ error: 'Aluno nao encontrado' }, { status: 404 })

    // Active prescription
    const activePrescription = await prisma.workoutPrescription.findFirst({
      where: { studentId, isActive: true },
      orderBy: { createdAt: 'desc' },
    })

    // Prescription history
    const prescriptionHistory = await prisma.workoutPrescription.findMany({
      where: { studentId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true, code: true, name: true, totalSessions: true,
        usedSessions: true, isActive: true, startDate: true,
        completedAt: true, createdAt: true,
        trainer: { select: { id: true, fullName: true } },
      },
    })

    // Recent bookings with checkin info
    const recentBookings = await prisma.booking.findMany({
      where: { studentId },
      orderBy: { startsAt: 'desc' },
      take: 30,
      select: {
        id: true, startsAt: true, endsAt: true, status: true,
        source: true, notes: true,
        service: { select: { name: true, color: true } },
        trainer: { select: { id: true, fullName: true } },
        checkin: { select: { id: true, checkedInAt: true } },
      },
    })

    // Checkin stats
    const totalCheckins = await prisma.checkin.count({
      where: { studentId },
    })

    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
    const recentCheckins = await prisma.checkin.count({
      where: { studentId, checkedInAt: { gte: thirtyDaysAgo } },
    })

    return NextResponse.json({
      student,
      activePrescription,
      prescriptionHistory,
      recentBookings,
      stats: {
        totalCheckins,
        recentCheckins30d: recentCheckins,
        memberSince: student.createdAt,
      },
    })
  } catch (e) {
    console.error('Trainer student detail error:', e)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
