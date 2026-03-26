/**
 * DELETE /api/v1/bookings/[id]
 *
 * Public endpoint for external agents (Laura/OpenClaw) to cancel a booking.
 * Validates that the booking belongs to the organization associated with the API key.
 *
 * Authentication: x-api-key header
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyApiKey } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ctx = await verifyApiKey(request)
  if (!ctx) {
    return NextResponse.json({ error: 'Invalid or missing API key' }, { status: 401 })
  }

  const { orgId } = ctx
  const { id: bookingId } = await params

  if (!bookingId) {
    return NextResponse.json({ error: 'Booking ID is required' }, { status: 400 })
  }

  try {
    // Find the booking and validate org ownership
    const booking = await prisma.booking.findFirst({
      where: { id: bookingId, orgId },
      include: {
        service: { select: { name: true } },
        student: { select: { fullName: true } },
      },
    })

    if (!booking) {
      return NextResponse.json(
        { error: 'Booking not found or does not belong to this organization' },
        { status: 404 }
      )
    }

    if (booking.status === 'CANCELLED') {
      return NextResponse.json(
        { error: 'Booking is already cancelled' },
        { status: 409 }
      )
    }

    if (booking.status === 'COMPLETED') {
      return NextResponse.json(
        { error: 'Cannot cancel a completed booking' },
        { status: 409 }
      )
    }

    // Get optional cancel reason from query string or body
    let cancelReason = request.nextUrl.searchParams.get('reason') ?? 'Cancelado via agente virtual'
    try {
      const body = await request.json()
      if (body?.reason) cancelReason = body.reason
    } catch {
      // Body may be empty — ignore
    }

    // Cancel the booking
    await prisma.booking.update({
      where: { id: bookingId },
      data: {
        status: 'CANCELLED',
        cancelledAt: new Date(),
        cancelReason,
      },
    })

    const dateFormatted = booking.startsAt.toLocaleDateString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      day: '2-digit',
      month: '2-digit',
    })
    const timeFormatted = booking.startsAt.toLocaleTimeString('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      hour: '2-digit',
      minute: '2-digit',
    })

    return NextResponse.json({
      success: true,
      bookingId,
      message: `Agendamento cancelado: ${booking.service.name}, ${dateFormatted} às ${timeFormatted}.`,
    })
  } catch (error) {
    console.error('[v1/bookings DELETE] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
