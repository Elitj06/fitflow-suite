import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createServerSupabaseClient } from '@/lib/supabase/server'

async function getProfile() {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  return prisma.profile.findUnique({ where: { userId: user.id } })
}

/**
 * POST /api/coins/redeem
 * Redeem FitCoins for a reward
 * Body: { rewardId }
 */
export async function POST(request: NextRequest) {
  const profile = await getProfile()
  if (!profile) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { rewardId } = await request.json()

  const reward = await prisma.reward.findFirst({
    where: { id: rewardId, orgId: profile.orgId, isActive: true },
  })

  if (!reward) return NextResponse.json({ error: 'Recompensa nao encontrada' }, { status: 404 })
  if (profile.coinsBalance < reward.costCoins) {
    return NextResponse.json({ error: `Saldo insuficiente. Voce tem ${profile.coinsBalance} coins, precisa de ${reward.costCoins}` }, { status: 400 })
  }
  if (reward.stock !== null && reward.stock <= 0) {
    return NextResponse.json({ error: 'Recompensa esgotada' }, { status: 400 })
  }

  // Atomic: deduct coins + create transaction + decrement stock
  const result = await prisma.$transaction(async (tx) => {
    const transaction = await tx.coinTransaction.create({
      data: {
        profileId: profile.id,
        orgId: profile.orgId,
        amount: -reward.costCoins,
        type: 'SPENT',
        description: `Resgatou: ${reward.name}`,
        referenceId: reward.id,
      },
    })

    await tx.profile.update({
      where: { id: profile.id },
      data: { coinsBalance: { decrement: reward.costCoins } },
    })

    if (reward.stock !== null) {
      await tx.reward.update({
        where: { id: reward.id },
        data: { stock: { decrement: 1 } },
      })
    }

    return transaction
  })

  return NextResponse.json({
    success: true,
    transactionId: result.id,
    reward: reward.name,
    coinsSpent: reward.costCoins,
    newBalance: profile.coinsBalance - reward.costCoins,
  })
}
