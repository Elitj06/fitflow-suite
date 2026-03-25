import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'
import { prisma } from '@/lib/prisma'
import { createServerSupabaseClient } from '@/lib/supabase/server'

async function getProfile() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  return prisma.profile.findUnique({ where: { userId: user.id } })
}

// GET /api/checkin/qr?bookingId=xxx
// Returns the QR code data for a booking
export async function GET(request: NextRequest) {
  const profile = await getProfile()
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const bookingId = request.nextUrl.searchParams.get('bookingId')
  if (!bookingId) return NextResponse.json({ error: 'bookingId required' }, { status: 400 })

  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, orgId: profile.orgId },
    include: { student: { select: { fullName: true } }, service: { select: { name: true } } },
  })
  if (!booking) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Generate HMAC-signed QR token to prevent forgery
  const secret = process.env.QR_SECRET || 'fitflow-qr-secret'
  const timestamp = Math.floor(Date.now() / 1000)
  const hmac = crypto.createHmac('sha256', secret).update(`${booking.id}:${timestamp}`).digest('hex')
  const qrData = `${booking.id}:${timestamp}:${hmac}`

  return NextResponse.json({
    bookingId: booking.id,
    studentName: booking.student.fullName,
    serviceName: booking.service.name,
    startsAt: booking.startsAt,
    qrData,
  })
}
