/**
 * Booking-related formatted actions.
 */

import { prisma } from '@/lib/prisma'
import {
  type ActionResult,
  DAY_NAMES_SHORT,
  STUDIO_CONFIG,
  parseDate,
  parseTime,
  brtToUtc,
  fmtDateBrt,
  fmtTimeBrt,
  fmtFullDateBrt,
  getHourBrt,
} from '../lib/constants'

interface BookParams {
  studentId: string
  name: string
  date: string
  time: string
  serviceId?: string
}

/**
 * Create a booking and return formatted confirmation message.
 *
 * Validates date (no sundays), checks 1-booking-per-day rule,
 * resolves available trainer in parallel, and creates the booking.
 *
 * @param orgId - Organization ID from API key context
 * @param params.studentId - Student profile ID (required)
 * @param params.name - Student full name (required)
 * @param params.date - Date in YYYY-MM-DD format, BRT timezone (required)
 * @param params.time - Time in HH:MM format, BRT timezone (required)
 * @param params.serviceId - Service ID (default: Musculação)
 * @returns ActionResult with formatted confirmation or error message
 */
export async function bookAction(orgId: string, params: BookParams): Promise<ActionResult> {
  const { studentId, name, date, time, serviceId = 'c19d318171d5ca8kywp1blvemz1h450p' } = params

  if (!name || !date || !time || !studentId) {
    return { text: '❌ Dados incompletos para agendar. Preciso de: nome, data, horário e studentId.' }
  }

  const parsedDate = parseDate(date)
  if (!parsedDate) {
    return { text: '❌ Data inválida. Use formato YYYY-MM-DD.' }
  }

  const { year, month, day, dayOfWeek } = parsedDate

  if (dayOfWeek === 0) {
    return { text: `❌ Não é possível agendar — ${date} é Domingo. O estúdio não abre aos domingos.` }
  }

  const parsedTime = parseTime(time)
  if (!parsedTime) {
    return { text: '❌ Horário inválido. Use formato HH:MM.' }
  }

  const startsAt = brtToUtc(year, month, day, parsedTime.hour, parsedTime.minute)
  const endsAt = new Date(startsAt.getTime() + STUDIO_CONFIG.bookingDurationMinutes * 60 * 1000)

  // Check existing booking (1/day per student)
  const dayStart = new Date(Date.UTC(year, month - 1, day, 0, 0, 0))
  const dayEnd = new Date(Date.UTC(year, month - 1, day + 1, 0, 0, 0))

  const existing = await prisma.booking.findFirst({
    where: {
      orgId,
      studentId,
      status: { in: ['PENDING', 'CONFIRMED'] },
      startsAt: { gte: dayStart, lt: dayEnd },
    },
  })

  if (existing) {
    const exTime = fmtTimeBrt(existing.startsAt)
    return { text: `⚠️ ${name} já tem aula agendada nesse dia às ${exTime}. Um agendamento por dia! Pra trocar, cancele o atual primeiro.` }
  }

  // Resolve service
  const service = await prisma.service.findFirst({ where: { id: serviceId, orgId } })
  if (!service) {
    return { text: '❌ Serviço não encontrado.' }
  }

  // Find available trainer (N+1 resolved: fetch counts in parallel)
  const trainers = await prisma.profile.findMany({
    where: { orgId, role: 'TRAINER', isActive: true },
    select: { id: true, fullName: true },
  })

  const trainerCounts = await Promise.all(
    trainers.map(t =>
      prisma.booking.count({
        where: {
          orgId, trainerId: t.id,
          status: { in: ['PENDING', 'CONFIRMED'] },
          startsAt: { lt: endsAt },
          endsAt: { gt: startsAt },
        },
      })
    )
  )

  const availableTrainer = trainers.find((_, i) => trainerCounts[i] < STUDIO_CONFIG.maxCapacityPerTrainer)

  if (!availableTrainer) {
    return { text: `❌ Todos os professores estão lotados nesse horário (${time} de ${date}). Quer tentar outro horário?` }
  }

  // Create booking
  await prisma.booking.create({
    data: {
      orgId,
      serviceId,
      trainerId: availableTrainer.id,
      studentId,
      startsAt,
      endsAt,
      status: 'CONFIRMED',
      source: 'WHATSAPP',
    },
  })

  const dateFmt = fmtDateBrt(startsAt)
  const serviceName = service.name

  return {
    text: [
      `✅ *Agendado!*`,
      `${name} → ${serviceName}`,
      `📅 ${DAY_NAMES_SHORT[dayOfWeek]} ${dateFmt} às ${time}`,
      `💪 Professor: ${availableTrainer.fullName}`,
      '',
      'Chega 5 minutinhos antes, tá bom? 😊',
    ].join('\n'),
  }
}

/**
 * Cancel a booking and return formatted confirmation.
 *
 * Enforces cancellation window (warns if < 2h before start).
 * Cannot cancel COMPLETED bookings.
 *
 * @param orgId - Organization ID
 * @param bookingId - Booking ID to cancel
 * @param studentName - Student name for the confirmation message
 * @returns ActionResult with cancellation message
 */
export async function cancelAction(orgId: string, bookingId: string, studentName: string): Promise<ActionResult> {
  if (!bookingId) {
    return { text: '❌ Preciso do ID do agendamento para cancelar.', requiresModelFollowup: true }
  }

  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, orgId },
    include: { service: { select: { name: true } } },
  })

  if (!booking) return { text: '❌ Agendamento não encontrado.' }
  if (booking.status === 'CANCELLED') return { text: '⚠️ Esse agendamento já está cancelado.' }
  if (booking.status === 'COMPLETED') return { text: '⚠️ Essa aula já foi concluída — não dá pra cancelar depois.' }

  const now = new Date()
  const hoursBefore = (booking.startsAt.getTime() - now.getTime()) / (1000 * 60 * 60)

  const warnings: string[] = []
  if (hoursBefore <= 0) {
    warnings.push('⚠️ Horário já passou — aula contabilizada como realizada.')
  } else if (hoursBefore < STUDIO_CONFIG.cancellation.deadlineHours) {
    warnings.push(`⚠️ Menos de ${STUDIO_CONFIG.cancellation.deadlineHours}h de antecedência — pode contar como falta.`)
  }

  await prisma.booking.update({
    where: { id: bookingId },
    data: { status: 'CANCELLED', cancelledAt: now, cancelReason: 'Cancelado via WhatsApp' },
  })

  const dateFmt = fmtDateBrt(booking.startsAt)
  const timeFmt = fmtTimeBrt(booking.startsAt)

  return {
    text: [
      `✅ *Cancelado!*`,
      `${studentName} → ${booking.service.name} em ${dateFmt} às ${timeFmt}`,
      ...warnings,
      '',
      'Quer reagendar pra outro dia?',
    ].join('\n'),
  }
}

/**
 * List all non-cancelled bookings for a given date, formatted as agenda.
 *
 * @param orgId - Organization ID
 * @param date - Date in YYYY-MM-DD format
 * @returns ActionResult with formatted agenda (✅ completed, 🔵 pending)
 */
export async function agendaAction(orgId: string, date: string): Promise<ActionResult> {
  const parsed = parseDate(date)
  if (!parsed) return { text: '❌ Data inválida.' }

  const { year, month, day } = parsed
  const dayStart = new Date(Date.UTC(year, month - 1, day, 0, 0, 0))
  const dayEnd = new Date(Date.UTC(year, month - 1, day, 23, 59, 59))

  const bookings = await prisma.booking.findMany({
    where: { orgId, status: { not: 'CANCELLED' }, startsAt: { gte: dayStart, lte: dayEnd } },
    include: {
      student: { select: { fullName: true } },
      trainer: { select: { fullName: true } },
    },
    orderBy: { startsAt: 'asc' },
  })

  const dateFmt = fmtFullDateBrt(dayStart)

  if (bookings.length === 0) {
    return { text: `📋 *Agenda de ${dateFmt}*\n\nNenhum agendamento. Dia tranquilo! 😌` }
  }

  const lines = bookings.map(b => {
    const time = fmtTimeBrt(b.startsAt)
    const icon = b.status === 'COMPLETED' ? '✅' : '🔵'
    return `${icon} ${time} — ${b.student.fullName} (${b.trainer.fullName})`
  })

  return {
    text: `📋 *Agenda de ${dateFmt}*\n${bookings.length} agendamentos\n\n${lines.join('\n')}`,
  }
}

/**
 * Show available time slots for a given date.
 *
 * Generates all possible slots based on day of week (weekday 06-21, sat 08-12),
 * then subtracts slots with existing bookings.
 *
 * @param orgId - Organization ID
 * @param date - Date in YYYY-MM-DD format
 * @returns ActionResult with available slots list
 */
export async function availabilityAction(orgId: string, date: string): Promise<ActionResult> {
  const parsed = parseDate(date)
  if (!parsed) return { text: '❌ Data inválida.' }

  const { dayOfWeek } = parsed

  if (dayOfWeek === 0) {
    return { text: `📅 ${date} é domingo — o estúdio não abre.` }
  }

  const hoursConfig = dayOfWeek === 6 ? STUDIO_CONFIG.hours.saturday : STUDIO_CONFIG.hours.weekday
  if (!hoursConfig) return { text: `📅 ${date} — estúdio fechado.` }

  const allSlots: string[] = []
  for (let h = hoursConfig.start; h < hoursConfig.end; h++) {
    allSlots.push(`${String(h).padStart(2, '0')}:00`)
  }

  const { year, month, day } = parsed
  const dayStart = new Date(Date.UTC(year, month - 1, day, 0, 0, 0))
  const dayEnd = new Date(Date.UTC(year, month - 1, day, 23, 59, 59))

  const bookings = await prisma.booking.findMany({
    where: { orgId, status: { not: 'CANCELLED' }, startsAt: { gte: dayStart, lte: dayEnd } },
    select: { startsAt: true },
  })

  const bookedHours = new Set(bookings.map(b => getHourBrt(b.startsAt)))
  const available = allSlots.filter(s => !bookedHours.has(s))
  const dateFmt = fmtFullDateBrt(dayStart)

  if (available.length === 0) {
    return { text: `📅 *${dateFmt}*\n\nLotado! Todos os horários estão ocupados. 😬` }
  }

  return {
    text: `🕐 *Horários livres — ${dateFmt}*\n\n${available.map(s => `• ${s}`).join('\n')}\n\n${available.length} horários disponíveis de ${allSlots.length} totais.`,
  }
}

/**
 * Search students by name (case-insensitive, contains).
 *
 * Returns up to 5 results. If multiple found, sets requiresModelFollowup=true
 * so the agent asks the user to choose.
 *
 * @param orgId - Organization ID
 * @param name - Search query (partial name accepted)
 * @returns ActionResult with found student(s)
 */
export async function searchStudentAction(orgId: string, name: string): Promise<ActionResult> {
  if (!name) return { text: '❌ Preciso de um nome pra buscar.' }

  const students = await prisma.profile.findMany({
    where: { orgId, role: 'STUDENT', fullName: { contains: name, mode: 'insensitive' } },
    select: { id: true, fullName: true, isActive: true },
    take: 5,
  })

  if (students.length === 0) {
    return { text: `🔍 Não encontrei nenhum aluno com "${name}".\n\nPode ser que o nome esteja diferente no cadastro. Pede pro Tjader ou pro Rafael verificar.` }
  }

  if (students.length === 1) {
    const s = students[0]
    return { text: `✅ Encontrei: *${s.fullName}*${s.isActive ? '' : ' (inativo)'}\n\nstudentId: ${s.id}\n\nPronto pra agendar! Qual dia e horário?` }
  }

  const list = students.map((s, i) => `${i + 1}. ${s.fullName}${s.isActive ? '' : ' (inativo)'}`).join('\n')
  return {
    text: `🔍 Encontrei ${students.length} alunos:\n\n${list}\n\nQual deles?`,
    requiresModelFollowup: true,
  }
}
