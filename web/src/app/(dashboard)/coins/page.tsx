'use client'

import { useState, useEffect } from 'react'
import {
  Coins, TrendingUp, Gift, Trophy, ArrowUpRight,
  ArrowDownRight, Star, Flame, Crown, Medal, Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Transaction {
  id: string
  amount: number
  type: 'EARNED' | 'SPENT' | 'BONUS' | 'ADJUSTED'
  description: string
  createdAt: string
}

interface LeaderboardEntry {
  id: string
  fullName: string
  coinsBalance: number
  _count: { checkins: number }
}

interface CoinsStats {
  totalBalance: number
  monthEarned: number
  monthSpent: number
}

export default function CoinsPage() {
  const [tab, setTab] = useState<'overview' | 'leaderboard'>('overview')
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([])
  const [stats, setStats] = useState<CoinsStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [txRes, lbRes, statsRes] = await Promise.all([
          fetch('/api/coins/transactions'),
          fetch('/api/coins/leaderboard'),
          fetch('/api/coins/stats'),
        ])
        if (txRes.ok) setTransactions(await txRes.json())
        if (lbRes.ok) setLeaderboard(await lbRes.json())
        if (statsRes.ok) setStats(await statsRes.json())
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-gray-900">FitCoins</h1>
        <p className="mt-1 text-sm text-gray-500">Sistema de recompensas por presenca e engajamento</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-yellow-400 via-amber-500 to-orange-500 p-6 text-white">
          <div className="absolute -top-4 -right-4 h-24 w-24 rounded-full bg-white/10 blur-xl" />
          <Coins className="h-8 w-8 text-yellow-100" />
          <div className="mt-3 font-display text-3xl font-extrabold">
            {(stats?.totalBalance ?? 0).toLocaleString('pt-BR')}
          </div>
          <div className="mt-0.5 text-sm text-yellow-100">Saldo Total (todos alunos)</div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          <div className="inline-flex rounded-xl bg-green-100 p-2.5">
            <TrendingUp className="h-5 w-5 text-green-600" />
          </div>
          <div className="mt-3 font-display text-2xl font-bold text-gray-900">
            {stats?.monthEarned ?? 0}
          </div>
          <div className="mt-0.5 text-sm text-gray-500">Emitidas este mes</div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          <div className="inline-flex rounded-xl bg-purple-100 p-2.5">
            <Gift className="h-5 w-5 text-purple-600" />
          </div>
          <div className="mt-3 font-display text-2xl font-bold text-gray-900">
            {stats?.monthSpent ?? 0}
          </div>
          <div className="mt-0.5 text-sm text-gray-500">Resgatadas este mes</div>
        </div>
      </div>

      <div className="flex gap-1 rounded-xl border border-gray-200 bg-gray-100 p-1 w-fit">
        <button onClick={() => setTab('overview')}
          className={cn('rounded-lg px-4 py-2 text-sm font-medium transition-all',
            tab === 'overview' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
          Historico
        </button>
        <button onClick={() => setTab('leaderboard')}
          className={cn('rounded-lg px-4 py-2 text-sm font-medium transition-all flex items-center gap-1.5',
            tab === 'leaderboard' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700')}>
          <Trophy className="h-3.5 w-3.5" /> Ranking
        </button>
      </div>

      {tab === 'overview' && (
        <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
          {transactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <Coins className="h-12 w-12 mb-3 opacity-30" />
              <p className="text-sm">Nenhuma transacao ainda</p>
              <p className="text-xs mt-1">Faca check-ins para comecar a acumular FitCoins</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {transactions.map((tx) => (
                <div key={tx.id} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors">
                  <div className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-full flex-shrink-0',
                    tx.type === 'EARNED' ? 'bg-green-100' :
                    tx.type === 'BONUS' ? 'bg-amber-100' : 'bg-red-100'
                  )}>
                    {tx.type === 'EARNED' ? <ArrowUpRight className="h-5 w-5 text-green-600" /> :
                     tx.type === 'BONUS' ? <Star className="h-5 w-5 text-amber-600" /> :
                     <ArrowDownRight className="h-5 w-5 text-red-500" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">{tx.description}</div>
                    <div className="text-xs text-gray-500">
                      {new Date(tx.createdAt).toLocaleDateString('pt-BR')} as{' '}
                      {new Date(tx.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>
                  <div className={cn(
                    'flex items-center gap-1 font-display text-sm font-bold flex-shrink-0',
                    tx.amount > 0 ? 'text-green-600' : 'text-red-500'
                  )}>
                    <Coins className="h-4 w-4" />
                    {tx.amount > 0 ? '+' : ''}{tx.amount}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'leaderboard' && (
        <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
          {leaderboard.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <Trophy className="h-12 w-12 mb-3 opacity-30" />
              <p className="text-sm">Nenhum aluno com FitCoins ainda</p>
            </div>
          ) : (
            <>
              {leaderboard.length >= 3 && (
                <div className="bg-gradient-to-br from-brand-50 to-amber-50 p-6">
                  <div className="flex items-end justify-center gap-4">
                    {[leaderboard[1], leaderboard[0], leaderboard[2]].map((entry, idx) => {
                      const rank = idx === 1 ? 1 : idx === 0 ? 2 : 3
                      const heights = ['h-16', 'h-24', 'h-12']
                      const sizes = ['h-14 w-14', 'h-16 w-16', 'h-14 w-14']
                      const textSizes = ['text-2xl', 'text-3xl', 'text-2xl']
                      const bgColors = ['bg-gray-300/50', 'bg-yellow-300/40', 'bg-amber-300/30']
                      const fontColors = ['text-gray-500', 'text-yellow-600', 'text-amber-600']
                      const initials = entry.fullName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
                      return (
                        <div key={entry.id} className={cn('text-center', rank === 1 && '-mt-4')}>
                          {rank === 1 && <Crown className="mx-auto h-6 w-6 text-yellow-500 mb-1" />}
                          <div className={cn('mx-auto flex items-center justify-center rounded-full bg-white border-2 text-sm font-bold shadow-sm', sizes[idx], rank === 1 ? 'border-yellow-400 text-brand-700' : rank === 2 ? 'border-gray-300 text-gray-700' : 'border-amber-500 text-gray-700')}>
                            {initials}
                          </div>
                          <div className="mt-2 text-sm font-semibold text-gray-800">{entry.fullName.split(' ')[0]}</div>
                          <div className="flex items-center justify-center gap-0.5 text-xs font-bold text-gray-500">
                            <Coins className="h-3 w-3 text-yellow-500" /> {entry.coinsBalance}
                          </div>
                          <div className={cn('mt-1 w-20 rounded-t-lg flex items-center justify-center', heights[idx], bgColors[idx])}>
                            <span className={cn('font-display font-bold', textSizes[idx], fontColors[idx])}>{rank}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
              <div className="divide-y divide-gray-100">
                {leaderboard.slice(3).map((entry, i) => {
                  const initials = entry.fullName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
                  return (
                    <div key={entry.id} className="flex items-center gap-4 px-6 py-4">
                      <span className="w-8 text-center font-display text-lg font-bold text-gray-400">{i + 4}</span>
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">{initials}</div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">{entry.fullName}</div>
                        <div className="text-xs text-gray-500">{entry._count.checkins} check-ins</div>
                      </div>
                      <div className="flex items-center gap-1 font-display text-sm font-bold text-gray-700">
                        <Coins className="h-4 w-4 text-yellow-500" /> {entry.coinsBalance}
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
