/**
 * GET /api/v1/reports/formatted?type=demand|general|attendance&month=YYYY-MM&period=week|month
 *
 * Returns a READY-TO-SEND WhatsApp message with report data.
 * No model processing needed — Laura just forwards the text as-is.
 *
 * Authentication: x-api-key header
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyApiKey } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

const DAY_NAMES_PT: Record<number, string> = {
  0: 'Domingo', 1: 'Segunda', 2: 'Terça', 3: 'Quarta',
  4: 'Quinta', 5: 'Sexta', 6: 'Sábado',
}

const DAY_NAMES_SHORT: Record<number, string> = {
  0: 'Dom', 1: 'Seg', 2: 'Ter', 3: 'Qua',
  4: 'Qui', 5: 'Sex', 6: 'Sáb',
}

const MONTH_NAMES_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

export async function GET(request: NextRequest) {
  const ctx = await verifyApiKey(request)
  if (!ctx) {
    return NextResponse.json({ error: 'Invalid or missing API key' }, { status: 401 })
  }

  const { orgId } = ctx
  const { searchParams } = request.nextUrl
  const type = searchParams.get('type') || 'demand'
  const monthStr = searchParams.get('month')
  const period = searchParams.get('period') || 'month'

  try {
    let text: string

    switch (type) {
      case 'demand':
        text = await generateDemandReport(orgId, monthStr)
        break
      case 'general':
        text = await generateGeneralReport(orgId)
        break
      case 'attendance':
        text = await generateAttendanceReport(orgId, period)
        break
      default:
        return NextResponse.json({ error: 'Invalid type. Use: demand, general, attendance' }, { status: 400 })
    }

    return NextResponse.json({ type, text })
  } catch (error) {
    console.error('[v1/reports/formatted] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

async function generateDemandReport(orgId: string, monthStr: string | null): Promise<string> {
  const now = new Date()
  const month = monthStr || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  if (!/^\d{4}-\d{2}$/.test(month)) {
    return '❌ Mês inválido. Use formato YYYY-MM (ex: 2026-05)'
  }

  const [year, mon] = month.split('-').map(Number)
  const startOfMonth = new Date(Date.UTC(year, mon - 1, 1, 0, 0, 0))
  const endOfMonth = new Date(Date.UTC(year, mon, 1, 0, 0, 0))
  const monthName = `${MONTH_NAMES_PT[mon - 1]} ${year}`

  const bookings = await prisma.booking.findMany({
    where: {
      orgId,
      status: { in: ['PENDING', 'CONFIRMED'] },
      startsAt: { gte: startOfMonth, lt: endOfMonth },
    },
    include: {
      trainer: { select: { id: true, fullName: true } },
      student: { select: { id: true, fullName: true } },
      service: { select: { id: true, name: true } },
    },
    orderBy: { startsAt: 'asc' },
  })

  if (bookings.length === 0) {
    return `📊 *Relatório de Demanda — ${monthName}*\n\nNenhum agendamento encontrado neste período.`
  }

  // Time slot ranking
  const slotCounts: Record<string, number> = {}
  for (const b of bookings) {
    const hour = b.startsAt.toLocaleTimeString('en-US', {
      timeZone: 'America/Sao_Paulo',
      hour: '2-digit', minute: '2-digit', hour12: false,
    })
    slotCounts[hour] = (slotCounts[hour] || 0) + 1
  }

  const slotRanking = Object.entries(slotCounts)
    .sort(([, a], [, b]) => b - a)
    .map(([time, count], i) => {
      const medal = i === 0 ? '🔥' : i < 3 ? '⭐' : '  '
      return `${medal} ${i + 1}. *${time}* — ${count} aulas`
    })

  // Trainer ranking
  const trainerCounts: Record<string, { name: string; count: number; students: Set<string> }> = {}
  for (const b of bookings) {
    const tid = b.trainer?.id || 'unknown'
    if (!trainerCounts[tid]) {
      trainerCounts[tid] = { name: b.trainer?.fullName || 'Sem professor', count: 0, students: new Set() }
    }
    trainerCounts[tid].count++
    if (b.student?.id) trainerCounts[tid].students.add(b.student.id)
  }

  const trainerRanking = Object.values(trainerCounts)
    .sort((a, b) => b.count - a.count)
    .map((t, i) => `${i + 1}. ${t.name} — ${t.count} aulas (${t.students.size} alunos)`)

  // Day of week distribution
  const dayCounts: Record<number, number> = {}
  for (const b of bookings) {
    const dow = b.startsAt.getUTCDay()
    dayCounts[dow] = (dayCounts[dow] || 0) + 1
  }

  const dayRanking = Object.entries(dayCounts)
    .sort(([, a], [, b]) => b - a)
    .map(([dow, count]) => `${DAY_NAMES_SHORT[Number(dow)]} — ${count}`)

  // Peak info
  const topSlot = Object.entries(slotCounts).sort(([, a], [, b]) => b - a)[0]
  const uniqueStudents = new Set(bookings.map(b => b.student?.id).filter(Boolean)).size

  // Peak concentration
  const topCount = topSlot[1]
  const topPct = ((topCount / bookings.length) * 100).toFixed(0)

  let text = `📊 *Relatório de Demanda — ${monthName}*\n\n`
  text += `*Total:* ${bookings.length} agendamentos | ${uniqueStudents} alunos\n\n`

  text += `*🔥 Horário de pico:* ${topSlot[0]} com ${topCount} aulas (${topPct}% do total)\n\n`

  text += `*Ranking por horário:*\n${slotRanking.join('\n')}\n\n`

  text += `*Ranking por professor:*\n${trainerRanking.join('\n')}\n\n`

  text += `*Distribuição por dia:*\n${dayRanking.join(' | ')}`

  return text
}

async function generateGeneralReport(orgId: string): Promise<string> {
  const now = new Date()
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  const [
    activeStudents,
    todayBookings,
    weekBookings,
    monthBookings,
    todayCheckins,
  ] = await Promise.all([
    prisma.profile.count({
      where: { orgId, role: 'STUDENT', isActive: true },
    }),
    prisma.booking.count({
      where: { orgId, status: { not: 'CANCELLED' }, startsAt: { gte: startOfDay } },
    }),
    prisma.booking.count({
      where: { orgId, status: { not: 'CANCELLED' }, startsAt: { gte: startOfWeek } },
    }),
    prisma.booking.count({
      where: { orgId, status: { not: 'CANCELLED' }, startsAt: { gte: startOfMonth } },
    }),
    prisma.checkin.count({
      where: { orgId, createdAt: { gte: startOfDay } },
    }),
  ])

  const dayName = DAY_NAMES_PT[now.getDay()]
  const dateStr = now.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })

  let text = `📊 *Resumo do Studio RR*\n`
  text += `${dayName}, ${dateStr}\n\n`
  text += `👥 Alunos ativos: *${activeStudents}*\n`
  text += `📅 Agendamentos hoje: *${todayBookings}*\n`
  text += `📋 Agendamentos esta semana: *${weekBookings}*\n`
  text += `📆 Agendamentos este mês: *${monthBookings}*\n`
  text += `✅ Check-ins hoje: *${todayCheckins}*`

  return text
}

async function generateAttendanceReport(orgId: string, period: string): Promise<string> {
  const now = new Date()
  const days = period === 'month' ? 30 : 7
  const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)

  const bookings = await prisma.booking.findMany({
    where: {
      orgId,
      startsAt: { gte: startDate },
    },
    include: {
      student: { select: { id: true, fullName: true } },
    },
  })

  const total = bookings.length
  const completed = bookings.filter(b => b.status === 'COMPLETED').length
  const cancelled = bookings.filter(b => b.status === 'CANCELLED').length
  const noShows = bookings.filter(b => b.status === 'NO_SHOW').length
  const pending = bookings.filter(b => ['PENDING', 'CONFIRMED'].includes(b.status)).length

  const attendanceRate = total > 0 ? ((completed / total) * 100).toFixed(1) : '0'
  const cancellationRate = total > 0 ? ((cancelled / total) * 100).toFixed(1) : '0'

  const periodLabel = period === 'month' ? 'últimos 30 dias' : 'últimos 7 dias'

  let text = `📊 *Relatório de Presença — ${periodLabel}*\n\n`
  text += `Total de agendamentos: *${total}*\n`
  text += `✅ Compareceu: *${completed}* (${attendanceRate}%)\n`
  text += `❌ Cancelou: *${cancelled}* (${cancellationRate}%)\n`
  text += `⚠️ Não apareceu: *${noShows}*\n`
  text += `⏳ Pendentes: *${pending}*\n`

  return text
}
