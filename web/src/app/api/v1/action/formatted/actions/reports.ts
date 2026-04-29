/**
 * Report formatted actions.
 */

import { prisma } from '@/lib/prisma'
import {
  type ActionResult,
  MONTH_NAMES,
  fmtFullDateBrt,
  getHourBrt,
} from '../lib/constants'

export async function reportDemandAction(orgId: string, monthStr: string | null): Promise<ActionResult> {
  const now = new Date()
  const month = monthStr || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

  if (!/^\d{4}-\d{2}$/.test(month)) {
    return { text: '❌ Mês inválido. Use formato YYYY-MM' }
  }

  const [year, mon] = month.split('-').map(Number)
  const start = new Date(Date.UTC(year, mon - 1, 1))
  const end = new Date(Date.UTC(year, mon, 1))
  const monthName = `${MONTH_NAMES[mon - 1]} ${year}`

  const bookings = await prisma.booking.findMany({
    where: { orgId, status: { in: ['PENDING', 'CONFIRMED'] }, startsAt: { gte: start, lt: end } },
    include: {
      trainer: { select: { id: true, fullName: true } },
      student: { select: { id: true, fullName: true } },
    },
  })

  if (bookings.length === 0) {
    return { text: `📊 *Demanda — ${monthName}*\n\nNenhum agendamento encontrado.` }
  }

  // Aggregate by time slot
  const slotCounts: Record<string, number> = {}
  for (const b of bookings) {
    const hour = getHourBrt(b.startsAt)
    slotCounts[hour] = (slotCounts[hour] || 0) + 1
  }
  const slotRanking = Object.entries(slotCounts).sort(([, a], [, b]) => b - a)

  // Aggregate by trainer
  const trainerCounts: Record<string, { name: string; count: number; students: Set<string> }> = {}
  for (const b of bookings) {
    const name = b.trainer?.fullName || 'Sem professor'
    if (!trainerCounts[name]) trainerCounts[name] = { name, count: 0, students: new Set() }
    trainerCounts[name].count++
    if (b.student?.id) trainerCounts[name].students.add(b.student.id)
  }

  const uniqueStudents = new Set(bookings.map(b => b.student?.id).filter(Boolean)).size
  const [topSlot, topCount] = slotRanking[0]
  const topPct = ((topCount / bookings.length) * 100).toFixed(0)

  const slotLines = slotRanking.map(([t, c], i) =>
    `${i === 0 ? '🔥' : '  '} ${i + 1}. *${t}* — ${c}`
  )

  const trainerLines = Object.values(trainerCounts)
    .sort((a, b) => b.count - a.count)
    .map((t, i) => `${i + 1}. ${t.name} — ${t.count} (${t.students.size} alunos)`)

  return {
    text: [
      `📊 *Demanda — ${monthName}*`,
      '',
      `*Total:* ${bookings.length} agendamentos | ${uniqueStudents} alunos`,
      `*🔥 Pico:* ${topSlot} com ${topCount} aulas (${topPct}%)`,
      '',
      '*Por horário:*',
      slotLines.join('\n'),
      '',
      '*Por professor:*',
      trainerLines.join('\n'),
    ].join('\n'),
  }
}

export async function reportGeneralAction(orgId: string): Promise<ActionResult> {
  const now = new Date()
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
  const startOfWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

  const [active, today, week, month, checkins] = await Promise.all([
    prisma.profile.count({ where: { orgId, role: 'STUDENT', isActive: true } }),
    prisma.booking.count({ where: { orgId, status: { not: 'CANCELLED' }, startsAt: { gte: startOfDay } } }),
    prisma.booking.count({ where: { orgId, status: { not: 'CANCELLED' }, startsAt: { gte: startOfWeek } } }),
    prisma.booking.count({ where: { orgId, status: { not: 'CANCELLED' }, startsAt: { gte: startOfMonth } } }),
    prisma.checkin.count({ where: { orgId, createdAt: { gte: startOfDay } } }),
  ])

  const dateStr = fmtFullDateBrt(now)

  return {
    text: [
      `📊 *Resumo — Studio RR*`,
      dateStr,
      '',
      `👥 Alunos ativos: *${active}*`,
      `📅 Hoje: *${today}* agendamentos`,
      `📋 Semana: *${week}*`,
      `📆 Mês: *${month}*`,
      `✅ Check-ins hoje: *${checkins}*`,
    ].join('\n'),
  }
}

export async function reportAttendanceAction(orgId: string, period: string): Promise<ActionResult> {
  const days = period === 'month' ? 30 : 7
  const start = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
  const label = period === 'month' ? 'últimos 30 dias' : 'últimos 7 dias'

  const bookings = await prisma.booking.findMany({ where: { orgId, startsAt: { gte: start } } })
  const total = bookings.length
  const completed = bookings.filter(b => b.status === 'COMPLETED').length
  const cancelled = bookings.filter(b => b.status === 'CANCELLED').length
  const noShows = bookings.filter(b => b.status === 'NO_SHOW').length
  const pending = bookings.filter(b => ['PENDING', 'CONFIRMED'].includes(b.status)).length
  const rate = total > 0 ? ((completed / total) * 100).toFixed(1) : '0'

  return {
    text: [
      `📊 *Presença — ${label}*`,
      '',
      `Total: *${total}*`,
      `✅ Compareceu: *${completed}* (${rate}%)`,
      `❌ Cancelou: *${cancelled}*`,
      `⚠️ Não apareceu: *${noShows}*`,
      `⏳ Pendentes: *${pending}*`,
    ].join('\n'),
  }
}
