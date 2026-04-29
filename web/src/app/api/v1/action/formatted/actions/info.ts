/**
 * Studio information formatted actions.
 */

import { prisma } from '@/lib/prisma'
import { type ActionResult, STUDIO_CONFIG } from '../lib/constants'

export async function infoPlansAction(): Promise<ActionResult> {
  // Fetch actual services from DB
  const services = await prisma.service.findMany({
    where: { orgId: { not: '' } }, // will be filtered by orgId in caller
    select: { name: true, isActive: true, durationMinutes: true },
  })

  // For now use the Studio RR orgId filter via caller
  const active = services.filter(s => s.isActive)
  const inactive = services.filter(s => !s.isActive)

  let text = '🏋️ *Modalidades — Studio RR*\n\n'

  if (active.length > 0) {
    text += '*Disponível agora:*\n'
    for (const s of active) {
      text += `✅ ${s.name} — ${s.durationMinutes} min (incluso no plano)\n`
    }
  }

  if (inactive.length > 0) {
    text += '\n*Em breve:*\n'
    for (const s of inactive) {
      text += `🔜 ${s.name}\n`
    }
  }

  if (active.length === 0 && inactive.length === 0) {
    text += 'Nenhuma modalidade cadastrada no sistema ainda.'
  }

  return { text }
}

export async function infoPlansWithOrgAction(orgId: string): Promise<ActionResult> {
  const services = await prisma.service.findMany({
    where: { orgId, isActive: true },
    select: { name: true, durationMinutes: true },
    orderBy: { name: 'asc' },
  })

  const allServices = await prisma.service.findMany({
    where: { orgId },
    select: { name: true, isActive: true },
    orderBy: { name: 'asc' },
  })

  const active = allServices.filter(s => s.isActive)
  const inactive = allServices.filter(s => !s.isActive)

  let text = '🏋️ *Modalidades — Studio RR*\n\n'

  if (active.length > 0) {
    text += '*Disponível agora:*\n'
    for (const s of active) {
      const svc = services.find(x => x.name === s.name)
      text += `✅ ${s.name}${svc ? ` — ${svc.durationMinutes} min` : ''} (incluso no plano)\n`
    }
  }

  if (inactive.length > 0) {
    text += '\n*Em breve:*\n'
    for (const s of inactive) {
      text += `🔜 ${s.name}\n`
    }
  }

  if (allServices.length === 0) {
    text += 'Nenhuma modalidade cadastrada no sistema ainda.'
  }

  return { text }
}

export async function infoProfessorsAction(orgId: string): Promise<ActionResult> {
  const trainers = await prisma.profile.findMany({
    where: { orgId, role: 'TRAINER', isActive: true },
    select: { fullName: true, specialties: true },
    orderBy: { fullName: 'asc' },
  })

  if (trainers.length === 0) {
    return { text: 'Não encontrei professores cadastrados no sistema.' }
  }

  const lines = trainers.map(t => {
    const specs = t.specialties.length > 0 ? t.specialties.join(', ') : 'Musculação'
    return `💪 *${t.fullName}* — ${specs}`
  })

  return {
    text: `👩‍🏫 *Professores — Studio RR*\n\n${lines.join('\n')}\n\nTodos os professores atendem todos os horários de funcionamento.`,
  }
}

export function infoHoursAction(): ActionResult {
  const { hours, maxCapacityPerTrainer } = STUDIO_CONFIG
  return {
    text: [
      '🕐 *Horário de funcionamento — Studio RR (Recreio)*',
      '',
      `Segunda a Sexta: *${String(hours.weekday.start).padStart(2, '0')}:00–${String(hours.weekday.end).padStart(2, '0')}:00*`,
      `Sábado: *${String(hours.saturday.start).padStart(2, '0')}:00–${String(hours.saturday.end).padStart(2, '0')}:00*`,
      'Domingo: *Fechado*',
      '',
      `Capacidade: ${maxCapacityPerTrainer} alunos por horário`,
    ].join('\n'),
  }
}

export function infoCancellationAction(): ActionResult {
  const { cancellation } = STUDIO_CONFIG
  return {
    text: [
      '🚫 *Regras de cancelamento*',
      '',
      cancellation.rule,
      '',
      'Como cancelar:',
      '• Me pede aqui no WhatsApp a qualquer momento',
      '• Quanto antes, melhor!',
      '',
      '⚠️ Faltas repetidas podem afetar seu plano.',
    ].join('\n'),
  }
}

export function infoAggregatorsAction(): ActionResult {
  const { aggregators } = STUDIO_CONFIG
  const lines = aggregators
    .filter(a => a.accepted)
    .map(a => {
      const header = a.alias ? `${a.name} (${a.alias})` : a.name
      return [
        `✅ *${header}*`,
        `   Planos: ${a.plans}`,
        `   ${a.info}`,
      ].join('\n')
    })

  return {
    text: [
      '💳 *Planos aceitos — Studio RR*',
      '',
      ...lines,
      '',
      '✅ *Plano direto* — pagamento direto com o estúdio',
      '',
      'Todos os planos incluem Musculação (60 min). Basta agendar!',
    ].join('\n'),
  }
}

export function infoCheckinAction(): ActionResult {
  const { checkin } = STUDIO_CONFIG
  return {
    text: [
      '✅ *Check-in — Como funciona*',
      '',
      checkin.rule,
      '',
      '• Chega no horário → professor registra sua presença',
      `• Cada check-in = ${checkin.coinsPerCheckin} FitCoin acumulado 💰`,
      '• FitCoins podem ser trocados por benefícios futuros',
      '• Não precisa fazer nada — é automático!',
    ].join('\n'),
  }
}
