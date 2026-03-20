'use client'

import { useState } from 'react'
import {
  Coins, TrendingUp, Gift, Trophy, ArrowUpRight,
  ArrowDownRight, Star, Flame, Crown, Medal,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Transaction {
  id: string
  description: string
  amount: number
  type: 'earned' | 'spent' | 'bonus'
  date: string
  time: string
}

interface LeaderboardEntry {
  rank: number
  name: string
  initials: string
  coins: number
  streak: number
}

const MOCK_TRANSACTIONS: Transaction[] = [
  { id: '1', description: 'Check-in: Personal Training', amount: 2, type: 'earned', date: '20/03/2026', time: '08:15' },
  { id: '2', description: 'Check-in: Treino em Grupo', amount: 1, type: 'earned', date: '19/03/2026', time: '18:30' },
  { id: '3', description: 'Resgatou: Desconto 20%', amount: -30, type: 'spent', date: '18/03/2026', time: '10:00' },
  { id: '4', description: 'Bonus: Sequencia 7 dias!', amount: 10, type: 'bonus', date: '17/03/2026', time: '09:00' },
  { id: '5', description: 'Check-in: Personal Training', amount: 2, type: 'earned', date: '17/03/2026', time: '08:20' },
  { id: '6', description: 'Check-in: Avaliacao Fisica', amount: 3, type: 'earned', date: '16/03/2026', time: '14:00' },
  { id: '7', description: 'Check-in: Personal Training', amount: 2, type: 'earned', date: '15/03/2026', time: '08:10' },
  { id: '8', description: 'Check-in: Treino em Grupo', amount: 1, type: 'earned', date: '14/03/2026', time: '18:45' },
]

const MOCK_LEADERBOARD: LeaderboardEntry[] = [
  { rank: 1, name: 'Ana Silva', initials: 'AS', coins: 284, streak: 15 },
  { rank: 2, name: 'Carlos Mendes', initials: 'CM', coins: 231, streak: 12 },
  { rank: 3, name: 'Julia Costa', initials: 'JC', coins: 198, streak: 8 },
  { rank: 4, name: 'Pedro Santos', initials: 'PS', coins: 176, streak: 6 },
  { rank: 5, name: 'Maria Oliveira', initials: 'MO', coins: 152, streak: 10 },
  { rank: 6, name: 'Rafael Lima', initials: 'RL', coins: 134, streak: 4 },
  { rank: 7, name: 'Fernanda Alves', initials: 'FA', coins: 121, streak: 7 },
]

const RANK_ICONS = [Crown, Medal, Medal]
const RANK_COLORS = ['text-yellow-500', 'text-gray-400', 'text-amber-600']

export default function CoinsPage() {
  const [tab, setTab] = useState<'overview' | 'leaderboard'>('overview')

  const totalEarned = MOCK_TRANSACTIONS.filter(t => t.amount > 0).reduce((acc, t) => acc + t.amount, 0)
  const totalSpent = Math.abs(MOCK_TRANSACTIONS.filter(t => t.amount < 0).reduce((acc, t) => acc + t.amount, 0))

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl font-bold text-gray-900">FitCoins</h1>
        <p className="mt-1 text-sm text-gray-500">
          Sistema de recompensas por presenca e engajamento
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Total balance */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-yellow-400 via-amber-500 to-orange-500 p-6 text-white">
          <div className="absolute -top-4 -right-4 h-24 w-24 rounded-full bg-white/10 blur-xl" />
          <Coins className="h-8 w-8 text-yellow-100" />
          <div className="mt-3 font-display text-3xl font-extrabold">1.284</div>
          <div className="mt-0.5 text-sm text-yellow-100">Saldo Total (todos alunos)</div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          <div className="inline-flex rounded-xl bg-green-100 p-2.5">
            <TrendingUp className="h-5 w-5 text-green-600" />
          </div>
          <div className="mt-3 font-display text-2xl font-bold text-gray-900">{totalEarned}</div>
          <div className="mt-0.5 text-sm text-gray-500">Emitidas este mes</div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          <div className="inline-flex rounded-xl bg-purple-100 p-2.5">
            <Gift className="h-5 w-5 text-purple-600" />
          </div>
          <div className="mt-3 font-display text-2xl font-bold text-gray-900">{totalSpent}</div>
          <div className="mt-0.5 text-sm text-gray-500">Resgatadas este mes</div>
        </div>

        <div className="rounded-2xl border border-gray-200 bg-white p-6">
          <div className="inline-flex rounded-xl bg-orange-100 p-2.5">
            <Flame className="h-5 w-5 text-orange-600" />
          </div>
          <div className="mt-3 font-display text-2xl font-bold text-gray-900">15 dias</div>
          <div className="mt-0.5 text-sm text-gray-500">Maior sequencia ativa</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-gray-200 bg-gray-100 p-1 w-fit">
        <button
          onClick={() => setTab('overview')}
          className={cn('rounded-lg px-4 py-2 text-sm font-medium transition-all',
            tab === 'overview' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          )}
        >
          Historico
        </button>
        <button
          onClick={() => setTab('leaderboard')}
          className={cn('rounded-lg px-4 py-2 text-sm font-medium transition-all flex items-center gap-1.5',
            tab === 'leaderboard' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
          )}
        >
          <Trophy className="h-3.5 w-3.5" />
          Ranking
        </button>
      </div>

      {/* Overview tab */}
      {tab === 'overview' && (
        <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
          <div className="divide-y divide-gray-100">
            {MOCK_TRANSACTIONS.map((tx) => (
              <div key={tx.id} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors">
                <div className={cn(
                  'flex h-10 w-10 items-center justify-center rounded-full',
                  tx.type === 'earned' ? 'bg-green-100' :
                  tx.type === 'bonus' ? 'bg-amber-100' : 'bg-red-100'
                )}>
                  {tx.type === 'earned' ? <ArrowUpRight className="h-5 w-5 text-green-600" /> :
                   tx.type === 'bonus' ? <Star className="h-5 w-5 text-amber-600" /> :
                   <ArrowDownRight className="h-5 w-5 text-red-500" />}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">{tx.description}</div>
                  <div className="text-xs text-gray-500">{tx.date} as {tx.time}</div>
                </div>
                <div className={cn(
                  'flex items-center gap-1 font-display text-sm font-bold',
                  tx.amount > 0 ? 'text-green-600' : 'text-red-500'
                )}>
                  <Coins className="h-4 w-4" />
                  {tx.amount > 0 ? '+' : ''}{tx.amount}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Leaderboard tab */}
      {tab === 'leaderboard' && (
        <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
          {/* Top 3 podium */}
          <div className="bg-gradient-to-br from-brand-50 to-amber-50 p-6">
            <div className="flex items-end justify-center gap-4">
              {/* 2nd place */}
              <div className="text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white border-2 border-gray-300 text-sm font-bold text-gray-700 shadow-sm">
                  {MOCK_LEADERBOARD[1].initials}
                </div>
                <div className="mt-2 text-sm font-semibold text-gray-800">{MOCK_LEADERBOARD[1].name.split(' ')[0]}</div>
                <div className="flex items-center justify-center gap-0.5 text-xs font-bold text-gray-500">
                  <Coins className="h-3 w-3 text-yellow-500" /> {MOCK_LEADERBOARD[1].coins}
                </div>
                <div className="mt-1 h-16 w-20 rounded-t-lg bg-gray-300/50 flex items-center justify-center">
                  <span className="font-display text-2xl font-bold text-gray-500">2</span>
                </div>
              </div>
              {/* 1st place */}
              <div className="text-center -mt-4">
                <Crown className="mx-auto h-6 w-6 text-yellow-500 mb-1" />
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white border-2 border-yellow-400 text-base font-bold text-brand-700 shadow-md">
                  {MOCK_LEADERBOARD[0].initials}
                </div>
                <div className="mt-2 text-sm font-bold text-gray-900">{MOCK_LEADERBOARD[0].name.split(' ')[0]}</div>
                <div className="flex items-center justify-center gap-0.5 text-xs font-bold text-yellow-600">
                  <Coins className="h-3 w-3" /> {MOCK_LEADERBOARD[0].coins}
                </div>
                <div className="mt-1 h-24 w-20 rounded-t-lg bg-yellow-300/40 flex items-center justify-center">
                  <span className="font-display text-3xl font-bold text-yellow-600">1</span>
                </div>
              </div>
              {/* 3rd place */}
              <div className="text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-white border-2 border-amber-500 text-sm font-bold text-gray-700 shadow-sm">
                  {MOCK_LEADERBOARD[2].initials}
                </div>
                <div className="mt-2 text-sm font-semibold text-gray-800">{MOCK_LEADERBOARD[2].name.split(' ')[0]}</div>
                <div className="flex items-center justify-center gap-0.5 text-xs font-bold text-gray-500">
                  <Coins className="h-3 w-3 text-yellow-500" /> {MOCK_LEADERBOARD[2].coins}
                </div>
                <div className="mt-1 h-12 w-20 rounded-t-lg bg-amber-300/30 flex items-center justify-center">
                  <span className="font-display text-2xl font-bold text-amber-600">3</span>
                </div>
              </div>
            </div>
          </div>

          {/* Rest of leaderboard */}
          <div className="divide-y divide-gray-100">
            {MOCK_LEADERBOARD.slice(3).map((entry) => (
              <div key={entry.rank} className="flex items-center gap-4 px-6 py-4">
                <span className="w-8 text-center font-display text-lg font-bold text-gray-400">
                  {entry.rank}
                </span>
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">
                  {entry.initials}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">{entry.name}</div>
                  <div className="flex items-center gap-1 text-xs text-gray-500">
                    <Flame className="h-3 w-3 text-orange-500" />
                    {entry.streak} dias seguidos
                  </div>
                </div>
                <div className="flex items-center gap-1 font-display text-sm font-bold text-gray-700">
                  <Coins className="h-4 w-4 text-yellow-500" />
                  {entry.coins}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
