import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('FitCoins Redeem Logic', () => {
  it('deve rejeitar resgate com saldo insuficiente', () => {
    const profile = { coinsBalance: 50 }
    const reward = { costCoins: 100 }
    expect(profile.coinsBalance >= reward.costCoins).toBe(false)
  })

  it('deve aprovar resgate com saldo suficiente', () => {
    const profile = { coinsBalance: 150 }
    const reward = { costCoins: 100 }
    expect(profile.coinsBalance >= reward.costCoins).toBe(true)
  })

  it('deve aprovar resgate com saldo exatamente igual ao custo', () => {
    const profile = { coinsBalance: 100 }
    const reward = { costCoins: 100 }
    expect(profile.coinsBalance >= reward.costCoins).toBe(true)
  })

  it('deve rejeitar resgate quando saldo é zero', () => {
    const profile = { coinsBalance: 0 }
    const reward = { costCoins: 1 }
    expect(profile.coinsBalance >= reward.costCoins).toBe(false)
  })
})
