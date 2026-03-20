'use client'

import { useState } from 'react'
import { Coins, Gift, ShoppingBag, CheckCircle2, Sparkles, Plus, Star } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Reward {
  id: string
  name: string
  description: string
  costCoins: number
  stock: number | null
  emoji: string
  category: 'product' | 'discount' | 'experience'
}

const MOCK_REWARDS: Reward[] = [
  { id: '1', name: 'Garrafa Exclusiva', description: 'Garrafa termica personalizada FitFlow', costCoins: 50, stock: 10, emoji: '🍶', category: 'product' },
  { id: '2', name: 'Sessao Gratis', description: 'Uma sessao de personal training gratuita', costCoins: 100, stock: null, emoji: '💪', category: 'experience' },
  { id: '3', name: 'Camiseta Fitness', description: 'Camiseta dry-fit com logo do studio', costCoins: 80, stock: 20, emoji: '👕', category: 'product' },
  { id: '4', name: 'Desconto 20%', description: '20% de desconto na proxima mensalidade', costCoins: 30, stock: null, emoji: '🏷️', category: 'discount' },
  { id: '5', name: 'Avaliacao Premium', description: 'Avaliacao fisica completa com relatorio', costCoins: 60, stock: null, emoji: '📊', category: 'experience' },
  { id: '6', name: 'Toalha Personalizada', description: 'Toalha de academia com seu nome', costCoins: 40, stock: 15, emoji: '🧖', category: 'product' },
  { id: '7', name: 'Mes Gratis', description: 'Um mes gratis de qualquer plano', costCoins: 200, stock: 3, emoji: '🎉', category: 'discount' },
  { id: '8', name: 'Suplemento Whey', description: 'Pote de Whey Protein 900g', costCoins: 150, stock: 5, emoji: '🥛', category: 'product' },
]

const CATEGORY_LABELS = {
  product: { label: 'Produtos', color: 'bg-blue-100 text-blue-700' },
  discount: { label: 'Descontos', color: 'bg-green-100 text-green-700' },
  experience: { label: 'Experiencias', color: 'bg-purple-100 text-purple-700' },
}

export default function RewardsPage() {
  const [filter, setFilter] = useState<string>('all')
  const [redeemed, setRedeemed] = useState<string[]>([])
  const userBalance = 152 // Mock

  const filtered = filter === 'all'
    ? MOCK_REWARDS
    : MOCK_REWARDS.filter((r) => r.category === filter)

  function handleRedeem(rewardId: string) {
    setRedeemed((prev) => [...prev, rewardId])
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-900">Recompensas</h1>
          <p className="mt-1 text-sm text-gray-500">
            Troque suas FitCoins por premios exclusivos
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-yellow-400 to-amber-500 px-5 py-3 text-white shadow-md shadow-yellow-200">
          <Coins className="h-5 w-5" />
          <span className="font-display text-xl font-extrabold">{userBalance}</span>
          <span className="text-sm text-yellow-100">FitCoins</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {[
          { key: 'all', label: 'Todos' },
          { key: 'product', label: 'Produtos' },
          { key: 'discount', label: 'Descontos' },
          { key: 'experience', label: 'Experiencias' },
        ].map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              'rounded-full px-4 py-2 text-sm font-medium transition-all border',
              filter === f.key
                ? 'border-brand-500 bg-brand-50 text-brand-700'
                : 'border-gray-200 text-gray-600 hover:border-gray-300'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Rewards grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {filtered.map((reward) => {
          const canAfford = userBalance >= reward.costCoins
          const isRedeemed = redeemed.includes(reward.id)
          const outOfStock = reward.stock !== null && reward.stock === 0

          return (
            <div
              key={reward.id}
              className={cn(
                'group relative rounded-2xl border bg-white p-5 transition-all',
                isRedeemed
                  ? 'border-green-200 bg-green-50/50'
                  : 'border-gray-200 hover:border-brand-200 hover:shadow-md hover:-translate-y-0.5'
              )}
            >
              {/* Category badge */}
              <span className={cn(
                'absolute top-3 right-3 rounded-full px-2 py-0.5 text-[10px] font-bold',
                CATEGORY_LABELS[reward.category].color
              )}>
                {CATEGORY_LABELS[reward.category].label}
              </span>

              {/* Emoji icon */}
              <div className="text-4xl mb-3">{reward.emoji}</div>

              <h3 className="font-display text-base font-bold text-gray-900">
                {reward.name}
              </h3>
              <p className="mt-1 text-xs text-gray-500 leading-relaxed">
                {reward.description}
              </p>

              {/* Price and stock */}
              <div className="mt-4 flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <Coins className="h-4 w-4 text-yellow-500" />
                  <span className="font-display text-lg font-bold text-gray-900">
                    {reward.costCoins}
                  </span>
                </div>
                {reward.stock !== null && (
                  <span className="text-xs text-gray-400">
                    {reward.stock} restantes
                  </span>
                )}
              </div>

              {/* Action */}
              <button
                onClick={() => handleRedeem(reward.id)}
                disabled={!canAfford || outOfStock || isRedeemed}
                className={cn(
                  'mt-4 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all',
                  isRedeemed
                    ? 'bg-green-100 text-green-700'
                    : canAfford && !outOfStock
                      ? 'bg-brand-600 text-white hover:bg-brand-700 shadow-sm'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                )}
              >
                {isRedeemed ? (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Resgatado!
                  </>
                ) : outOfStock ? (
                  'Esgotado'
                ) : canAfford ? (
                  <>
                    <Gift className="h-4 w-4" />
                    Resgatar
                  </>
                ) : (
                  `Faltam ${reward.costCoins - userBalance} coins`
                )}
              </button>
            </div>
          )
        })}

        {/* Add new reward card (admin) */}
        <button className="flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-gray-300 p-8 text-gray-400 transition-all hover:border-brand-300 hover:text-brand-500 hover:bg-brand-50/50">
          <Plus className="h-8 w-8" />
          <span className="text-sm font-medium">Adicionar Recompensa</span>
        </button>
      </div>
    </div>
  )
}
