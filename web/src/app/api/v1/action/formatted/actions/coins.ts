/**
 * FitCoins formatted actions.
 */

import { prisma } from '@/lib/prisma'
import { type ActionResult } from '../lib/constants'

export async function coinsBalanceAction(orgId: string, studentId: string): Promise<ActionResult> {
  if (!studentId) {
    return { text: '❌ Preciso do studentId para ver o saldo de FitCoins.', requiresModelFollowup: true }
  }

  const student = await prisma.profile.findFirst({
    where: { id: studentId, orgId, role: 'STUDENT' },
    select: { fullName: true, coinsBalance: true, id: true },
  })

  if (!student) {
    return { text: '❌ Aluno não encontrado.' }
  }

  const [rewards, checkinCount] = await Promise.all([
    prisma.reward.findMany({
      where: { orgId, isActive: true },
      orderBy: { costCoins: 'asc' },
      take: 5,
    }),
    prisma.checkin.count({ where: { studentId: student.id, orgId } }),
  ])

  const lines = [
    `💰 *FitCoins — ${student.fullName}*`,
    '',
    `Saldo atual: *${student.coinsBalance} FitCoins*`,
  ]

  if (rewards.length > 0) {
    const nearest = rewards.find(r => r.costCoins > student.coinsBalance)
    if (nearest) {
      const missing = nearest.costCoins - student.coinsBalance
      lines.push('', `🎯 Próximo prêmio: *${nearest.name}* (${nearest.costCoins} coins)`)
      lines.push(`Faltam *${missing} FitCoins* — continue treinando! 💪`)
    } else {
      lines.push('', '🎉 Você já tem coins suficientes pra qualquer prêmio disponível!')
    }
  } else {
    lines.push('', '🎁 Catálogo de prêmios em breve — continue acumulando!')
  }

  lines.push('', `📊 Total de check-ins: ${checkinCount}`)

  return { text: lines.join('\n') }
}

export async function coinsLeaderboardAction(orgId: string): Promise<ActionResult> {
  const top = await prisma.profile.findMany({
    where: { orgId, role: 'STUDENT', isActive: true },
    select: { fullName: true, coinsBalance: true },
    orderBy: { coinsBalance: 'desc' },
    take: 10,
  })

  if (top.length === 0) {
    return { text: '📊 Nenhum aluno com FitCoins ainda.' }
  }

  const medals = ['🥇', '🥈', '🥉']
  const lines = top.map((s, i) => {
    const prefix = medals[i] || `${i + 1}.`
    return `${prefix} ${s.fullName} — ${s.coinsBalance} coins`
  })

  return {
    text: `🏆 *Ranking FitCoins — Studio RR*\n\n${lines.join('\n')}\n\nContinue treinando pra subir! 💪`,
  }
}
