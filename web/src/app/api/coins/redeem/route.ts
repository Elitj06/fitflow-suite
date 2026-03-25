import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { createServerSupabaseClient } from '@/lib/supabase/server'

async function getAuthUserId(): Promise<string | null> {
  const supabase = await createServerSupabaseClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user?.id ?? null
}

/**
 * POST /api/coins/redeem
 * Redeem FitCoins for a reward
 * Body: { rewardId }
 *
 * HIGH FIX (Race Condition): The balance check and deduction are now fully inside
 * the same Prisma interactive transaction. The profile row is re-read WITH a
 * database-level lock (SELECT ... FOR UPDATE via raw query) so concurrent requests
 * cannot both pass the balance check before either has committed the deduction.
 */
export async function POST(request: NextRequest) {
  const userId = await getAuthUserId()
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { rewardId } = body

  if (!rewardId || typeof rewardId !== 'string') {
    return NextResponse.json({ error: 'rewardId is required' }, { status: 400 })
  }

  // Run everything inside a serializable transaction to eliminate TOCTOU race
  let result: { transactionId: string; rewardName: string; coinsSpent: number; newBalance: number }
  try {
    result = await prisma.$transaction(
    async (tx) => {
      // Lock the profile row so concurrent redemptions are serialized
      const profiles = await tx.$queryRaw<Array<{ id: string; orgId: string; coinsBalance: number; role: string }>>`
        SELECT id, "orgId", "coinsBalance", role
        FROM "Profile"
        WHERE "userId" = ${userId}
        LIMIT 1
        FOR UPDATE
      `
      if (profiles.length === 0) throw new Error('PROFILE_NOT_FOUND')
      const profile = profiles[0]

      // Verify reward belongs to same org and is active
      const reward = await tx.reward.findFirst({
        where: { id: rewardId, orgId: profile.orgId, isActive: true },
      })
      if (!reward) throw new Error('REWARD_NOT_FOUND')

      // Re-check balance inside the transaction (prevents TOCTOU)
      if (profile.coinsBalance < reward.costCoins) {
        throw new Error(`INSUFFICIENT_BALANCE:${profile.coinsBalance}:${reward.costCoins}`)
      }

      // Re-check stock inside the transaction
      if (reward.stock !== null && reward.stock <= 0) {
        throw new Error('OUT_OF_STOCK')
      }

      // Deduct coins
      const updatedProfile = await tx.profile.update({
        where: { id: profile.id },
        data: { coinsBalance: { decrement: reward.costCoins } },
        select: { coinsBalance: true },
      })

      // Record the transaction
      const coinTx = await tx.coinTransaction.create({
        data: {
          profileId: profile.id,
          orgId: profile.orgId,
          amount: -reward.costCoins,
          type: 'SPENT',
          description: `Resgatou: ${reward.name}`,
          referenceId: reward.id,
        },
      })

      // Decrement stock if limited
      if (reward.stock !== null) {
        await tx.reward.update({
          where: { id: reward.id },
          data: { stock: { decrement: 1 } },
        })
      }

      return {
        transactionId: coinTx.id,
        rewardName: reward.name,
        coinsSpent: reward.costCoins,
        newBalance: updatedProfile.coinsBalance,
      }
    },
      { isolationLevel: 'Serializable' }
    )
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'UNKNOWN'
    if (msg === 'PROFILE_NOT_FOUND') {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }
    if (msg === 'REWARD_NOT_FOUND') {
      return NextResponse.json({ error: 'Recompensa nao encontrada' }, { status: 404 })
    }
    if (msg === 'OUT_OF_STOCK') {
      return NextResponse.json({ error: 'Recompensa esgotada' }, { status: 400 })
    }
    if (msg.startsWith('INSUFFICIENT_BALANCE:')) {
      const [, have, need] = msg.split(':')
      return NextResponse.json(
        { error: `Saldo insuficiente. Voce tem ${have} coins, precisa de ${need}` },
        { status: 400 }
      )
    }
    console.error('[Coins Redeem] Unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }

  return NextResponse.json({ success: true, ...result })
}
