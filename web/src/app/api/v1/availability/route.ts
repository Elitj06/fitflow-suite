/**
 * GET /api/v1/availability
 *
 * Public endpoint for external agents (Laura/OpenClaw) to query
 * available schedule slots for the next 7 days.
 *
 * Authentication: x-api-key header
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyApiKey } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const ctx = await verifyApiKey(request)
  if (!ctx) {
    return NextResponse.json({ error: 'Invalid or missing API key' }, { status: 401 })
  }

  const { orgId } = ctx

  try {
    const now = new Date()
    const sevenDaysLater = new Date(now)
    sevenDaysLater.setDate(sevenDaysLater.getDate() + 7)

    // Fetch active schedule slots with service and trainer info
    const slots = await prisma.scheduleSlot.findMany({
      where: { orgId, isActive: true },
      include: {
        service: { select: { id: true, name: true, durationMinutes: true } },
        trainer: { select: { fullName: true } },
      },
    })

    if (slots.length === 0) {
      return NextResponse.json({ available: [] })
    }

    // Fetch existing bookings in the next 7 days to detect conflicts
    const bookings = await prisma.booking.findMany({
      where: {
        orgId,
        startsAt: { gte: now, lte: sevenDaysLater },
        status: { in: ['PENDING', 'CONFIRMED'] },
      },
      select: { startsAt: true, trainerId: true, serviceId: true },
    })

    const bookedKeys = new Set(
      bookings.map(
        (b) =>
          `${b.trainerId}-${b.serviceId}-${b.startsAt.toISOString().substring(0, 16)}`
      )
    )

    // Build list of available slots for the next 7 days
    const available: Array<{
      date: string
      time: string
      service: string
      serviceId: string
      trainer: string
      slotId: string
    }> = []

    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const date = new Date(now)
      date.setDate(date.getDate() + dayOffset)
      const dayOfWeek = date.getDay()

      const daySlots = slots.filter((s) => s.dayOfWeek === dayOfWeek)

      for (const slot of daySlots) {
        const slotDate = new Date(date)
        const [slotHour, slotMinute] = slot.startTime.split(':').map(Number)
        slotDate.setHours(slotHour, slotMinute, 0, 0)

        // Skip past slots
        if (slotDate <= now) continue

        const key = `${slot.trainerId}-${slot.serviceId}-${slotDate.toISOString().substring(0, 16)}`
        if (!bookedKeys.has(key)) {
          // Format date as YYYY-MM-DD in org's local time (America/Sao_Paulo)
          const dateStr = slotDate.toLocaleDateString('en-CA', {
            timeZone: 'America/Sao_Paulo',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
          })

          available.push({
            date: dateStr,
            time: slot.startTime,
            service: slot.service.name,
            serviceId: slot.service.id,
            trainer: slot.trainer.fullName,
            slotId: slot.id,
          })
        }
      }
    }

    return NextResponse.json({ available })
  } catch (error) {
    console.error('[v1/availability] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
