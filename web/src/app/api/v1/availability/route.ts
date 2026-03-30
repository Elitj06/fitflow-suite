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
    // Buscar serviços ativos da organização
    const services = await prisma.service.findMany({
      where: { orgId, isActive: true },
      select: { id: true, name: true, durationMinutes: true },
    })

    // Buscar slots de agenda
    let slots: Array<{
      id: string
      dayOfWeek: number
      startTime: string
      serviceId: string
      service: { id: string; name: string; durationMinutes: number }
    }> = []

    try {
      const rawSlots = await prisma.scheduleSlot.findMany({
        where: { orgId, isActive: true },
        select: {
          id: true,
          dayOfWeek: true,
          startTime: true,
          serviceId: true,
          service: { select: { id: true, name: true, durationMinutes: true } },
        },
      })
      slots = rawSlots
    } catch {
      // Sem slots cadastrados — retornar serviços disponíveis
    }

    if (slots.length === 0) {
      // Sem horários cadastrados ainda — retornar serviços para orientar o cliente
      return NextResponse.json({
        available: [],
        services: services.map(s => ({ id: s.id, name: s.name, duration: s.durationMinutes })),
        message: 'Horários específicos não cadastrados. Entre em contato para agendar.',
      })
    }

    // Gerar disponibilidade para os próximos 7 dias
    const now = new Date()
    const available: Array<{
      date: string
      time: string
      service: string
      serviceId: string
      slotId: string
    }> = []

    // Buscar bookings existentes
    const sevenDaysLater = new Date(now)
    sevenDaysLater.setDate(sevenDaysLater.getDate() + 7)

    const bookings = await prisma.booking.findMany({
      where: { orgId, startsAt: { gte: now, lte: sevenDaysLater }, status: { in: ['PENDING', 'CONFIRMED'] } },
      select: { startsAt: true, serviceId: true },
    })

    const bookedKeys = new Set(bookings.map(b => `${b.serviceId}-${b.startsAt.toISOString().substring(0, 16)}`))

    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const date = new Date(now)
      date.setDate(date.getDate() + dayOffset)
      const dayOfWeek = date.getDay()
      const daySlots = slots.filter(s => s.dayOfWeek === dayOfWeek)

      for (const slot of daySlots) {
        const slotDate = new Date(date)
        const [h, m] = slot.startTime.split(':').map(Number)
        slotDate.setHours(h, m, 0, 0)
        if (slotDate <= now) continue

        const key = `${slot.serviceId}-${slotDate.toISOString().substring(0, 16)}`
        if (!bookedKeys.has(key)) {
          available.push({
            date: slotDate.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }),
            time: slot.startTime,
            service: slot.service.name,
            serviceId: slot.service.id,
            slotId: slot.id,
          })
        }
      }
    }

    return NextResponse.json({ available })
  } catch (error) {
    console.error('[v1/availability]', error)
    return NextResponse.json({ error: 'Internal server error', detail: String(error) }, { status: 500 })
  }
}
