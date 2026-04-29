/**
 * GET /api/v1/action/formatted?action=<type>&<params>
 *
 * Unified formatted endpoint for Laura.
 * Returns ready-to-send WhatsApp text — no model processing needed.
 * Laura just forwards the `text` field as-is.
 *
 * Authentication: x-api-key header
 */

import { NextRequest, NextResponse } from 'next/server'
import { verifyApiKey } from '@/lib/api-auth'
import { prisma } from '@/lib/prisma'

const DAY_NAMES: Record<number, string> = {
  0: 'Domingo', 1: 'Segunda', 2: 'Terça', 3: 'Quarta',
  4: 'Quinta', 5: 'Sexta', 6: 'Sábado',
}

const DAY_NAMES_SHORT: Record<number, string> = {
  0: 'Dom', 1: 'Seg', 2: 'Ter', 3: 'Qua',
  4: 'Qui', 5: 'Sex', 6: 'Sáb',
}

const MONTH_NAMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

// Studio info constants (updated by admin)
const STUDIO_INFO = {
  name: 'Studio RR',
  unit: 'Recreio',
  maxCapacity: 22,
  hours: { weekday: '06:00–21:00', saturday: '08:00–12:00', sunday: 'Fechado' },
  cancellationRule: 'Cancelar até 2h antes do horário. Após isso, conta como falta.',
  checkinRule: 'Check-in feito pelo professor na hora da aula. Cada check-in = 1 FitCoin.',
  aggregators: {
    wellhub: { accepted: true, plans: 'Wellhub Silver+', info: 'Plano empresarial via Gympass/Wellhub. O aluno cadastra o Studio RR no app e agenda normalmente.' },
    totalpass: { accepted: true, plans: 'TotalPass TP3+', info: 'Plano empresarial via TotalPass. O aluno cadastra o Studio RR no app e agenda normalmente.' },
  },
  services: [
    { name: 'Musculação', available: true, duration: '60 min', included: true },
    { name: 'Personal Training', available: false, note: 'Em breve' },
    { name: 'Pilates', available: false, note: 'Em breve' },
    { name: 'Funcional', available: false, note: 'Em breve' },
  ],
}

export async function GET(request: NextRequest) {
  const ctx = await verifyApiKey(request)
  if (!ctx) {
    return NextResponse.json({ error: 'Invalid or missing API key' }, { status: 401 })
  }

  const { orgId } = ctx
  const { searchParams } = request.nextUrl
  const action = searchParams.get('action') || ''

  try {
    let text: string
    let requiresModelFollowup = false

    switch (action) {
      // ─── AGENDAMENTO ───
      case 'book': {
        const studentName = searchParams.get('name') || ''
        const date = searchParams.get('date') || ''
        const time = searchParams.get('time') || ''
        const studentId = searchParams.get('studentId') || ''
        const serviceId = searchParams.get('serviceId') || 'c19d318171d5ca8kywp1blvemz1h450p'

        if (!studentName || !date || !time || !studentId) {
          text = '❌ Dados incompletos para agendar. Preciso de: nome, data, horário e studentId.'
          break
        }

        // Validate date first
        const [y, m, d] = date.split('-').map(Number)
        const dateObj = new Date(Date.UTC(y, m - 1, d))
        const dow = dateObj.getUTCDay()
        if (dow === 0) {
          text = `❌ Não é possível agendar — ${date} é ${DAY_NAMES[dow]}. O estúdio não abre aos domingos.`
          break
        }

        // Check existing booking (1/day)
        const existing = await prisma.booking.findFirst({
          where: {
            orgId, studentId,
            status: { in: ['PENDING', 'CONFIRMED'] },
            startsAt: {
              gte: new Date(Date.UTC(y, m - 1, d, 0, 0, 0)),
              lt: new Date(Date.UTC(y, m - 1, d + 1, 0, 0, 0)),
            },
          },
        })
        if (existing) {
          const exTime = existing.startsAt.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' })
          text = `⚠️ ${studentName} já tem aula agendada nesse dia às ${exTime}. Um agendamento por dia! Pra trocar, cancele o atual primeiro.`
          break
        }

        // Create booking via internal logic
        const [hh, mm] = time.split(':').map(Number)
        const startsAt = new Date(Date.UTC(y, m - 1, d, hh - 3, mm || 0, 0)) // BRT offset
        const endsAt = new Date(startsAt.getTime() + 60 * 60 * 1000)

        const service = await prisma.service.findFirst({ where: { id: serviceId, orgId } })

        // Find available trainer
        const trainers = await prisma.profile.findMany({
          where: { orgId, role: 'TRAINER', isActive: true },
          select: { id: true, fullName: true },
        })

        const MAX_STUDENTS = STUDIO_INFO.maxCapacity
        let resolvedTrainerId: string | null = null
        let trainerName = 'Instrutor'

        for (const t of trainers) {
          const count = await prisma.booking.count({
            where: {
              orgId, trainerId: t.id,
              status: { in: ['PENDING', 'CONFIRMED'] },
              startsAt: { lt: endsAt },
              endsAt: { gt: startsAt },
            },
          })
          if (count < MAX_STUDENTS) {
            resolvedTrainerId = t.id
            trainerName = t.fullName
            break
          }
        }

        if (!resolvedTrainerId) {
          text = `❌ Todos os professores estão lotados nesse horário (${time} de ${date}). Todos com ${MAX_STUDENTS} alunos. Quer tentar outro horário?`
          break
        }

        const booking = await prisma.booking.create({
          data: {
            orgId, serviceId, trainerId: resolvedTrainerId, studentId,
            startsAt, endsAt, status: 'CONFIRMED', source: 'WHATSAPP',
          },
        })

        const dateFmt = startsAt.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit' })
        text = `✅ *Agendado!*\n${studentName} → ${service?.name || 'Musculação'}\n📅 ${DAY_NAMES_SHORT[dow]} ${dateFmt} às ${time}\n💪 Professor: ${trainerName}\n\nChega 5 minutinhos antes, tá bom? 😊`
        break
      }

      case 'cancel': {
        const bookingId = searchParams.get('bookingId') || ''
        const studentName = searchParams.get('name') || 'Aluno'

        if (!bookingId) {
          text = '❌ Preciso do ID do agendamento para cancelar.'
          requiresModelFollowup = true
          break
        }

        const booking = await prisma.booking.findFirst({
          where: { id: bookingId, orgId },
          include: { service: { select: { name: true } } },
        })

        if (!booking) {
          text = '❌ Agendamento não encontrado.'
          break
        }
        if (booking.status === 'CANCELLED') {
          text = '⚠️ Esse agendamento já está cancelado.'
          break
        }
        if (booking.status === 'COMPLETED') {
          text = '⚠️ Essa aula já foi concluída — não dá pra cancelar depois.'
          break
        }

        // Check if within cancellation window
        const now = new Date()
        const hoursBefore = (booking.startsAt.getTime() - now.getTime()) / (1000 * 60 * 60)
        let warning = ''
        if (hoursBefore < 2 && hoursBefore > 0) {
          warning = '\n\n⚠️ Menos de 2h de antecedência — pode contar como falta.'
        } else if (hoursBefore <= 0) {
          warning = '\n\n⚠️ Horário já passou — aula contabilizada como realizada.'
        }

        await prisma.booking.update({
          where: { id: bookingId },
          data: { status: 'CANCELLED', cancelledAt: new Date(), cancelReason: 'Cancelado via WhatsApp' },
        })

        const dateFmt = booking.startsAt.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit' })
        const timeFmt = booking.startsAt.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' })

        text = `✅ *Cancelado!*\n${studentName} → ${booking.service.name} em ${dateFmt} às ${timeFmt}${warning}\n\nQuer reagendar pra outro dia?`
        break
      }

      case 'agenda': {
        const date = searchParams.get('date') || new Date().toISOString().split('T')[0]
        const [y, m, d] = date.split('-').map(Number)
        const startOfDay = new Date(Date.UTC(y, m - 1, d, 0, 0, 0))
        const endOfDay = new Date(Date.UTC(y, m - 1, d, 23, 59, 59))
        const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay()

        const bookings = await prisma.booking.findMany({
          where: {
            orgId, status: { not: 'CANCELLED' },
            startsAt: { gte: startOfDay, lte: endOfDay },
          },
          include: {
            student: { select: { fullName: true } },
            trainer: { select: { fullName: true } },
            service: { select: { name: true } },
          },
          orderBy: { startsAt: 'asc' },
        })

        const dateFmt = startOfDay.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'long', day: '2-digit', month: '2-digit' })

        if (bookings.length === 0) {
          text = `📋 *Agenda de ${dateFmt}*\n\nNenhum agendamento pra hoje. Dia tranquilo! 😌`
        } else {
          const lines = bookings.map((b, i) => {
            const time = b.startsAt.toLocaleTimeString('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' })
            const status = b.status === 'COMPLETED' ? '✅' : '🔵'
            return `${status} ${time} — ${b.student.fullName} (${b.trainer.fullName})`
          })
          text = `📋 *Agenda de ${dateFmt}*\n${bookings.length} agendamentos\n\n${lines.join('\n')}`
        }
        break
      }

      case 'availability': {
        const date = searchParams.get('date') || new Date().toISOString().split('T')[0]
        const [y, m, d] = date.split('-').map(Number)
        const dateObj = new Date(Date.UTC(y, m - 1, d))
        const dow = dateObj.getUTCDay()

        if (dow === 0) {
          text = `📅 ${date} é domingo — o estúdio não abre.`
          break
        }

        const hours = dow === 6 ? { start: 8, end: 12 } : { start: 6, end: 21 }
        const allSlots: string[] = []
        for (let h = hours.start; h < hours.end; h++) {
          allSlots.push(`${String(h).padStart(2, '0')}:00`)
        }

        // Check booked slots
        const startOfDay = new Date(Date.UTC(y, m - 1, d, 0, 0, 0))
        const endOfDay = new Date(Date.UTC(y, m - 1, d, 23, 59, 59))

        const bookings = await prisma.booking.findMany({
          where: {
            orgId, status: { not: 'CANCELLED' },
            startsAt: { gte: startOfDay, lte: endOfDay },
          },
          select: { startsAt: true },
        })

        const bookedHours = new Set(bookings.map(b => {
          return b.startsAt.toLocaleTimeString('en-US', { timeZone: 'America/Sao_Paulo', hour: '2-digit', hour12: false })
        }))

        const available = allSlots.filter(s => !bookedHours.has(s))
        const dateFmt = dateObj.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'long', day: '2-digit', month: '2-digit' })

        if (available.length === 0) {
          text = `📅 *${dateFmt}*\n\nLotado! Todos os horários estão ocupados. 😬`
        } else {
          text = `🕐 *Horários livres — ${dateFmt}*\n\n${available.map(s => `• ${s}`).join('\n')}\n\n${available.length} horários disponíveis de ${allSlots.length} totais.`
        }
        break
      }

      case 'search-student': {
        const name = searchParams.get('name') || ''
        if (!name) {
          text = '❌ Preciso de um nome pra buscar.'
          break
        }

        const students = await prisma.profile.findMany({
          where: { orgId, role: 'STUDENT', fullName: { contains: name, mode: 'insensitive' } },
          select: { id: true, fullName: true, isActive: true },
          take: 5,
        })

        if (students.length === 0) {
          text = `🔍 Não encontrei nenhum aluno com "${name}".\n\nPode ser que o nome esteja diferente no cadastro. Pede pro Tjader ou pro Rafael verificar.`
        } else if (students.length === 1) {
          const s = students[0]
          text = `✅ Encontrei: *${s.fullName}*${s.isActive ? '' : ' (inativo)'}\n\nstudentId: ${s.id}\n\nPronto pra agendar! Qual dia e horário?`
        } else {
          const list = students.map((s, i) => `${i + 1}. ${s.fullName}${s.isActive ? '' : ' (inativo)'}`).join('\n')
          text = `🔍 Encontrei ${students.length} alunos:\n\n${list}\n\nQual deles?`
          requiresModelFollowup = true
        }
        break
      }

      // ─── INFORMAÇÕES DO ESTÚDIO ───
      case 'info-plans': {
        const activeServices = STUDIO_INFO.services.filter(s => s.available)
        const upcoming = STUDIO_INFO.services.filter(s => !s.available)

        let msg = `🏋️ *Modalidades — Studio RR*\n\n`
        msg += `*Disponível agora:*\n`
        for (const s of activeServices) {
          msg += `✅ ${s.name} — ${s.duration}${s.included ? ' (incluso no plano)' : ''}\n`
        }
        if (upcoming.length > 0) {
          msg += `\n*Em breve:*\n`
          for (const s of upcoming) {
            msg += `🔜 ${s.name}${s.note ? ` — ${s.note}` : ''}\n`
          }
        }
        text = msg
        break
      }

      case 'info-professors': {
        const trainers = await prisma.profile.findMany({
          where: { orgId, role: 'TRAINER', isActive: true },
          select: { fullName: true, specialties: true },
        })

        if (trainers.length === 0) {
          text = 'Não encontrei professores cadastrados no sistema.'
        } else {
          const lines = trainers.map(t => {
            const specs = t.specialties.length > 0 ? t.specialties.join(', ') : 'Musculação'
            return `💪 *${t.fullName}* — ${specs}`
          })
          text = `👩‍🏫 *Professores — Studio RR*\n\n${lines.join('\n')}\n\nTodos os professores atendem todos os horários de funcionamento.`
        }
        break
      }

      case 'info-hours': {
        text = `🕐 *Horário de funcionamento — Studio RR (Recreio)*\n\n`
        text += `Segunda a Sexta: *${STUDIO_INFO.hours.weekday}*\n`
        text += `Sábado: *${STUDIO_INFO.hours.saturday}*\n`
        text += `Domingo: *Fechado*\n\n`
        text += `Capacidade: ${STUDIO_INFO.maxCapacity} alunos por horário`
        break
      }

      case 'info-cancellation': {
        text = `🚫 *Regras de cancelamento*\n\n`
        text += `${STUDIO_INFO.cancellationRule}\n\n`
        text += `Como cancelar:\n`
        text += `• Me pede aqui no WhatsApp a qualquer momento\n`
        text += `• Quanto antes, melhor!\n\n`
        text += `⚠️ Faltas repetidas podem afetar seu plano.`
        break
      }

      case 'info-aggregators': {
        text = `💳 *Planos aceitos — Studio RR*\n\n`
        text += `✅ *Wellhub* (Gympass)\n`
        text += `   Planos: ${STUDIO_INFO.aggregators.wellhub.plans}\n`
        text += `   ${STUDIO_INFO.aggregators.wellhub.info}\n\n`
        text += `✅ *TotalPass*\n`
        text += `   Planos: ${STUDIO_INFO.aggregators.totalpass.plans}\n`
        text += `   ${STUDIO_INFO.aggregators.totalpass.info}\n\n`
        text += `✅ *Plano direto* — pagamento direto com o estúdio\n\n`
        text += `Todos os planos incluem Musculação (60 min). Basta agendar!`
        break
      }

      case 'info-checkin': {
        text = `✅ *Check-in — Como funciona*\n\n`
        text += `${STUDIO_INFO.checkinRule}\n\n`
        text += `• Chega no horário → professor registra sua presença\n`
        text += `• Cada check-in = 1 FitCoin acumulado 💰\n`
        text += `• FitCoins podem ser trocados por benefícios futuros\n`
        text += `• Não precisa fazer nada — é automático!`
        break
      }

      // ─── FITCOINS ───
      case 'coins-balance': {
        const studentId = searchParams.get('studentId') || ''
        const studentName = searchParams.get('name') || 'Aluno'

        if (!studentId) {
          text = '❌ Preciso do studentId para ver o saldo de FitCoins.'
          requiresModelFollowup = true
          break
        }

        const student = await prisma.profile.findFirst({
          where: { id: studentId, orgId, role: 'STUDENT' },
          select: { fullName: true, coinsBalance: true, id: true },
        })

        if (!student) {
          text = '❌ Aluno não encontrado.'
          break
        }

        // Get rewards for next goal
        const rewards = await prisma.reward.findMany({
          where: { orgId, isActive: true },
          orderBy: { costCoins: 'asc' },
          take: 5,
        })

        let coinsMsg = `💰 *FitCoins — ${student.fullName}*\n\n`
        coinsMsg += `Saldo atual: *${student.coinsBalance} FitCoins*\n`

        if (rewards.length > 0) {
          const nearest = rewards.find(r => r.costCoins > student.coinsBalance)
          if (nearest) {
            const missing = nearest.costCoins - student.coinsBalance
            coinsMsg += `\n🎯 Próximo prêmio: *${nearest.name}* (${nearest.costCoins} coins)\n`
            coinsMsg += `Faltam *${missing} FitCoins* — continue treinando! 💪`
          } else {
            coinsMsg += `\n🎉 Você já tem coins suficientes pra qualquer prêmio disponível!`
          }
        } else {
          coinsMsg += `\n🎁 Catálogo de prêmios em breve — continue acumulando!`
        }

        // Get checkin count
        const checkinCount = await prisma.checkin.count({
          where: { studentId: student.id, orgId },
        })
        coinsMsg += `\n\n📊 Total de check-ins: ${checkinCount}`

        text = coinsMsg
        break
      }

      case 'coins-leaderboard': {
        const top = await prisma.profile.findMany({
          where: { orgId, role: 'STUDENT', isActive: true },
          select: { fullName: true, coinsBalance: true },
          orderBy: { coinsBalance: 'desc' },
          take: 10,
        })

        if (top.length === 0) {
          text = '📊 Nenhum aluno com FitCoins ainda.'
        } else {
          const lines = top.map((s, i) => {
            const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`
            return `${medal} ${s.fullName} — ${s.coinsBalance} coins`
          })
          text = `🏆 *Ranking FitCoins — Studio RR*\n\n${lines.join('\n')}\n\nContinue treinando pra subir! 💪`
        }
        break
      }

      // ─── RELATÓRIOS (mantém os existentes) ───
      case 'report-demand':
        text = await generateDemandReport(orgId, searchParams.get('month'))
        break
      case 'report-general':
        text = await generateGeneralReport(orgId)
        break
      case 'report-attendance':
        text = await generateAttendanceReport(orgId, searchParams.get('period') || 'month')
        break

      default:
        return NextResponse.json({
          error: `Unknown action: "${action}"`,
          available: [
            'book', 'cancel', 'agenda', 'availability', 'search-student',
            'info-plans', 'info-professors', 'info-hours', 'info-cancellation',
            'info-aggregators', 'info-checkin',
            'coins-balance', 'coins-leaderboard',
            'report-demand', 'report-general', 'report-attendance',
          ],
        }, { status: 400 })
    }

    return NextResponse.json({ action, text, requiresModelFollowup: requiresModelFollowup || undefined })
  } catch (error) {
    console.error(`[v1/action/formatted] Error for action=${action}:`, error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// ─── Report generators ───

async function generateDemandReport(orgId: string, monthStr: string | null): Promise<string> {
  const now = new Date()
  const month = monthStr || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  if (!/^\d{4}-\d{2}$/.test(month)) return '❌ Mês inválido. Use formato YYYY-MM'

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

  if (bookings.length === 0) return `📊 *Demanda — ${monthName}*\n\nNenhum agendamento encontrado.`

  const slotCounts: Record<string, number> = {}
  for (const b of bookings) {
    const hour = b.startsAt.toLocaleTimeString('en-US', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit', hour12: false })
    slotCounts[hour] = (slotCounts[hour] || 0) + 1
  }
  const slotRanking = Object.entries(slotCounts).sort(([, a], [, b]) => b - a)

  const trainerCounts: Record<string, { name: string; count: number }> = {}
  for (const b of bookings) {
    const name = b.trainer?.fullName || 'Sem professor'
    trainerCounts[name] = trainerCounts[name] || { name, count: 0 }
    trainerCounts[name].count++
  }

  const uniqueStudents = new Set(bookings.map(b => b.student?.id).filter(Boolean)).size
  const top = slotRanking[0]

  let text = `📊 *Demanda — ${monthName}*\n\n`
  text += `*Total:* ${bookings.length} agendamentos | ${uniqueStudents} alunos\n`
  text += `*🔥 Pico:* ${top[0]} com ${top[1]} aulas (${((top[1] / bookings.length) * 100).toFixed(0)}%)\n\n`
  text += `*Por horário:*\n${slotRanking.map(([t, c], i) => `${i === 0 ? '🔥' : '  '} ${i + 1}. *${t}* — ${c}`).join('\n')}\n\n`
  text += `*Por professor:*\n${Object.values(trainerCounts).sort((a, b) => b.count - a.count).map((t, i) => `${i + 1}. ${t.name} — ${t.count}`).join('\n')}`
  return text
}

async function generateGeneralReport(orgId: string): Promise<string> {
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

  const dateStr = now.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo', weekday: 'long', day: '2-digit', month: '2-digit' })

  return `📊 *Resumo — Studio RR*\n${dateStr}\n\n👥 Alunos ativos: *${active}*\n📅 Hoje: *${today}* agendamentos\n📋 Semana: *${week}*\n📆 Mês: *${month}*\n✅ Check-ins hoje: *${checkins}*`
}

async function generateAttendanceReport(orgId: string, period: string): Promise<string> {
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

  return `📊 *Presença — ${label}*\n\nTotal: *${total}*\n✅ Compareceu: *${completed}* (${rate}%)\n❌ Cancelou: *${cancelled}*\n⚠️ Não apareceu: *${noShows}*\n⏳ Pendentes: *${pending}*`
}
