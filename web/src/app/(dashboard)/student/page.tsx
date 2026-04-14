'use client'

import {
  Calendar, Coins, Trophy, Clock, CheckCircle2,
  Gift, Flame, QrCode, ArrowRight, Star,
} from 'lucide-react'

export default function StudentDashboard() {
  return (
    <div className="space-y-6">
      {/* Header with greeting + QR */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-white">
            Ola, Ana! 💪
          </h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Voce esta em uma sequencia de 15 dias. Continue assim!
          </p>
        </div>
        <button className="flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-brand-700">
          <QrCode className="h-4 w-4" />
          Meu QR Code
        </button>
      </div>

      {/* Stats row */}
      <div className="grid gap-4 sm:grid-cols-3">
        {/* FitCoins balance */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-yellow-400 via-amber-500 to-orange-500 p-6 text-white">
          <div className="absolute -top-4 -right-4 h-20 w-20 rounded-full bg-white/10 blur-xl" />
          <Coins className="h-7 w-7 text-yellow-100" />
          <div className="mt-2 font-display text-3xl font-extrabold">284</div>
          <div className="text-sm text-yellow-100">FitCoins</div>
          <a href="/coins/rewards" className="mt-3 inline-flex items-center gap-1 rounded-lg bg-white/20 px-3 py-1 text-xs font-medium backdrop-blur-sm hover:bg-white/30 transition-all">
            Trocar por premios
            <ArrowRight className="h-3 w-3" />
          </a>
        </div>

        {/* Streak */}
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6">
          <Flame className="h-7 w-7 text-orange-500" />
          <div className="mt-2 font-display text-3xl font-extrabold text-gray-900 dark:text-white">15 dias</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">Sequencia atual</div>
          <div className="mt-2 flex gap-1">
            {Array.from({ length: 7 }).map((_, i) => (
              <div key={i} className="h-2 flex-1 rounded-full bg-orange-400" />
            ))}
          </div>
        </div>

        {/* Rank */}
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6">
          <Trophy className="h-7 w-7 text-yellow-500" />
          <div className="mt-2 font-display text-3xl font-extrabold text-gray-900 dark:text-white">1o lugar</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">No ranking do studio</div>
          <div className="mt-2 flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star key={s} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
            ))}
          </div>
        </div>
      </div>

      {/* Upcoming bookings */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6">
        <h2 className="font-display text-lg font-semibold text-gray-900 dark:text-white">Proximas Aulas</h2>
        <div className="mt-4 space-y-3">
          {[
            { day: 'Hoje', time: '18:00', service: 'Personal Training', trainer: 'Eliandro', status: 'confirmed' },
            { day: 'Amanha', time: '08:00', service: 'Treino em Grupo', trainer: 'Eliandro', status: 'confirmed' },
            { day: 'Quinta', time: '18:00', service: 'Personal Training', trainer: 'Eliandro', status: 'pending' },
          ].map((booking, i) => (
            <div key={i} className="flex items-center gap-4 rounded-xl border border-gray-100 bg-gray-50/50 p-4">
              <div className="text-center min-w-[60px]">
                <div className="text-xs font-semibold text-brand-600 uppercase">{booking.day}</div>
                <div className="font-display text-lg font-bold text-gray-900 dark:text-white">{booking.time}</div>
              </div>
              <div className="h-10 w-px bg-gray-200" />
              <div className="flex-1">
                <div className="font-medium text-gray-900 dark:text-white">{booking.service}</div>
                <div className="text-xs text-gray-500">Com {booking.trainer}</div>
              </div>
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                booking.status === 'confirmed' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
              }`}>
                {booking.status === 'confirmed' ? 'Confirmado' : 'Pendente'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Available rewards preview */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6">
        <div className="flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-gray-900 dark:text-white">Recompensas Disponiveis</h2>
          <a href="/coins/rewards" className="text-sm font-medium text-brand-600 hover:text-brand-700">Ver todas</a>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          {[
            { emoji: '🏷️', name: 'Desconto 20%', coins: 30, affordable: true },
            { emoji: '🍶', name: 'Garrafa Exclusiva', coins: 50, affordable: true },
            { emoji: '👕', name: 'Camiseta Fitness', coins: 80, affordable: true },
          ].map((reward, i) => (
            <div key={i} className="flex items-center gap-3 rounded-xl border border-gray-200 p-3 hover:border-brand-200 transition-colors cursor-pointer">
              <span className="text-2xl">{reward.emoji}</span>
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-900 dark:text-white">{reward.name}</div>
                <div className="flex items-center gap-1 text-xs">
                  <Coins className="h-3 w-3 text-yellow-500" />
                  <span className="font-bold text-gray-700 dark:text-gray-300">{reward.coins}</span>
                </div>
              </div>
              {reward.affordable && (
                <CheckCircle2 className="h-4 w-4 text-green-500" />
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
