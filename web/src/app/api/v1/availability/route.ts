import { NextRequest, NextResponse } from 'next/server'
import { verifyApiKey } from '@/lib/api-auth'

export async function GET(request: NextRequest) {
  const ctx = await verifyApiKey(request)
  if (!ctx) {
    return NextResponse.json({ error: 'Invalid or missing API key' }, { status: 401 })
  }

  const { orgId } = ctx
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

  const headers = {
    'apikey': serviceKey,
    'Authorization': `Bearer ${serviceKey}`,
    'Content-Type': 'application/json',
  }

  try {
    // Buscar serviços ativos via Supabase REST
    const servicesRes = await fetch(
      `${supabaseUrl}/rest/v1/services?org_id=eq.${orgId}&is_active=eq.true&select=id,name,duration_minutes`,
      { headers, cache: 'no-store' }
    )
    const services = await servicesRes.json()

    // Buscar schedule slots via Supabase REST
    const slotsRes = await fetch(
      `${supabaseUrl}/rest/v1/schedule_slots?org_id=eq.${orgId}&is_active=eq.true&select=id,day_of_week,start_time,service_id,services(id,name,duration_minutes)`,
      { headers, cache: 'no-store' }
    )
    const slots = await slotsRes.json()

    if (!Array.isArray(slots) || slots.length === 0) {
      return NextResponse.json({
        available: [],
        services: Array.isArray(services) ? services.map((s: any) => ({
          id: s.id, name: s.name, duration: s.duration_minutes
        })) : [],
        message: 'Horários específicos não cadastrados. Entre em contato para agendar.',
      })
    }

    // Buscar bookings dos próximos 7 dias
    const now = new Date()
    const sevenDaysLater = new Date(now)
    sevenDaysLater.setDate(sevenDaysLater.getDate() + 7)

    const bookingsRes = await fetch(
      `${supabaseUrl}/rest/v1/bookings?org_id=eq.${orgId}&starts_at=gte.${now.toISOString()}&starts_at=lte.${sevenDaysLater.toISOString()}&status=in.(PENDING,CONFIRMED)&select=starts_at,service_id`,
      { headers, cache: 'no-store' }
    )
    const bookings = await bookingsRes.json()
    const bookedKeys = new Set(
      Array.isArray(bookings) ? bookings.map((b: any) => `${b.service_id}-${new Date(b.starts_at).toISOString().substring(0, 16)}`) : []
    )

    // Gerar disponibilidade
    const available: any[] = []
    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const date = new Date(now)
      date.setDate(date.getDate() + dayOffset)
      const dayOfWeek = date.getDay()
      const daySlots = slots.filter((s: any) => s.day_of_week === dayOfWeek)

      for (const slot of daySlots) {
        const slotDate = new Date(date)
        const [h, m] = (slot.start_time as string).split(':').map(Number)
        slotDate.setHours(h, m, 0, 0)
        if (slotDate <= now) continue

        const key = `${slot.service_id}-${slotDate.toISOString().substring(0, 16)}`
        if (!bookedKeys.has(key)) {
          available.push({
            date: slotDate.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }),
            time: slot.start_time,
            service: slot.services?.name || '',
            serviceId: slot.service_id,
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
