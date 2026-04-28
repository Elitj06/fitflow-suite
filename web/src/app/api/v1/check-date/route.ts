/**
 * GET /api/v1/check-date?date=YYYY-MM-DD
 * Returns day of week, whether studio is open, and valid hours.
 * Used by Laura to validate dates before booking without mental math.
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyApiKey } from '@/lib/api-auth'

const DAY_NAMES_PT: Record<number, string> = {
  0: 'domingo',
  1: 'segunda-feira',
  2: 'terça-feira',
  3: 'quarta-feira',
  4: 'quinta-feira',
  5: 'sexta-feira',
  6: 'sábado',
}

export async function GET(request: NextRequest) {
  const ctx = await verifyApiKey(request)
  if (!ctx) {
    return NextResponse.json({ error: 'Invalid or missing API key' }, { status: 401 })
  }

  const { searchParams } = request.nextUrl
  const dateStr = searchParams.get('date')

  if (!dateStr || !/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return NextResponse.json({ error: 'Provide date=YYYY-MM-DD' }, { status: 400 })
  }

  const [year, month, day] = dateStr.split('-').map(Number)
  const d = new Date(Date.UTC(year, month - 1, day))
  const dayOfWeek = d.getUTCDay()
  const dayName = DAY_NAMES_PT[dayOfWeek]

  let isOpen = false
  let hours: string | null = null

  if (dayOfWeek === 0) {
    isOpen = false
  } else if (dayOfWeek === 6) {
    isOpen = true
    hours = '08:00-12:00'
  } else {
    isOpen = true
    hours = '06:00-21:00'
  }

  const validSlots: string[] = []
  if (isOpen && hours) {
    const parts = hours.split('-')
    const startH = parseInt(parts[0].split(':')[0])
    const endH = parseInt(parts[1].split(':')[0])
    for (let h = startH; h < endH; h++) {
      validSlots.push(`${String(h).padStart(2, '0')}:00`)
    }
  }

  return NextResponse.json({
    date: dateStr,
    dayOfWeek,
    dayName,
    isOpen,
    hours,
    validSlots,
    studio: 'Studio RR - Recreio',
  })
}
