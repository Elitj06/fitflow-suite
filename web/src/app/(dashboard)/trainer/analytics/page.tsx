'use client'

import { useState, useEffect } from 'react'
import {
  BarChart3, TrendingUp, Users, Calendar, Award, Activity,
  Loader2, AlertCircle, Clock, MapPin, Dumbbell
} from 'lucide-react'

// ── Types ────────────────────────────────────────────────────

interface AnalyticsData {
  activeStudents: number
  bookings30d: number
  weekCheckins: number
  presenceRate: number
  monthRevenue: number
  statusBreakdown: Record<string, number>
  topStudents: { name: string; checkins: number; streak: number }[]
  weeklyFrequency: { day: string; value: number }[]
  services: { name: string; count: number }[]
  trainers: { name: string; count: number }[]
  branches: { name: string; count: number }[]
  peakHours: { hour: string; bookings: number }[]
}

// ── Skeleton ─────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 animate-pulse">
      <div className="flex items-start gap-4">
        <div className="w-11 h-11 rounded-xl bg-gray-200 dark:bg-gray-700 shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
          <div className="h-7 bg-gray-200 dark:bg-gray-700 rounded w-1/2" />
          <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
        </div>
      </div>
    </div>
  )
}

function SkeletonSection() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6 animate-pulse space-y-3">
      <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
      {[1, 2, 3].map(i => (
        <div key={i} className="h-10 bg-gray-100 dark:bg-gray-700 rounded" />
      ))}
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/analytics')
      .then(r => {
        if (!r.ok) throw new Error('Erro ao carregar dados')
        return r.json()
      })
      .then(d => { setData(d); setLoading(false) })
      .catch(e => {
        setError(e.message || 'Não foi possível carregar analytics.')
        setLoading(false)
      })
  }, [])

  // ── KPI Cards ──
  const metrics = [
    {
      title: 'Alunos Ativos',
      value: (data?.activeStudents ?? 0).toLocaleString('pt-BR'),
      change: 'Total cadastrados',
      positive: true,
      icon: Users,
      accent: 'bg-brand-50 text-brand-600',
    },
    {
      title: 'Agendamentos 30d',
      value: (data?.bookings30d ?? 0).toLocaleString('pt-BR'),
      change: 'Últimos 30 dias',
      positive: true,
      icon: Calendar,
      accent: 'bg-blue-50 text-blue-600',
    },
    {
      title: 'Taxa de Presença',
      value: `${data?.presenceRate ?? 0}%`,
      change: 'Check-ins / Agendamentos',
      positive: (data?.presenceRate ?? 0) >= 70,
      icon: Activity,
      accent: 'bg-green-50 text-green-600',
    },
    {
      title: 'Check-ins Semana',
      value: (data?.weekCheckins ?? 0).toLocaleString('pt-BR'),
      change: 'Últimos 7 dias',
      positive: true,
      icon: TrendingUp,
      accent: 'bg-purple-50 text-purple-600',
    },
  ]

  const maxWeekly = Math.max(...(data?.weeklyFrequency.map(d => d.value) || [1]), 1)

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <BarChart3 className="w-6 h-6" />
          Analytics
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Visão geral do desempenho do estúdio
        </p>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 text-sm text-red-700 dark:text-red-400">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {loading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          metrics.map(m => (
            <div
              key={m.title}
              className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 flex items-start gap-4 shadow-sm"
            >
              <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${m.accent}`}>
                <m.icon className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{m.title}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5">{m.value}</p>
                <p className={`text-xs mt-1 ${m.positive ? 'text-green-600' : 'text-red-500'}`}>{m.change}</p>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Two columns: Trainers + Services */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Top Trainers */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
          <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
            <Award className="w-5 h-5 text-yellow-500" />
            Professores (30 dias)
          </h2>
          {loading ? (
            <SkeletonSection />
          ) : (data?.trainers?.length ?? 0) > 0 ? (
            <div className="space-y-2">
              {data!.trainers.map((t, i) => (
                <div
                  key={t.name}
                  className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-700 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-gray-400 w-4">{i + 1}</span>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{t.name}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-gray-100 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-brand-500 h-2 rounded-full transition-all"
                        style={{ width: `${(t.count / (data!.trainers[0]?.count || 1)) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-600 dark:text-gray-400 w-14 text-right">{t.count} aulas</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-sm">Nenhum agendamento encontrado.</p>
          )}
        </div>

        {/* Top Services */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
          <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
            <Dumbbell className="w-5 h-5 text-blue-500" />
            Serviços (30 dias)
          </h2>
          {loading ? (
            <SkeletonSection />
          ) : (data?.services?.length ?? 0) > 0 ? (
            <div className="space-y-2">
              {data!.services.map((s, i) => (
                <div
                  key={s.name}
                  className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-700 last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-gray-400 w-4">{i + 1}</span>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{s.name}</p>
                  </div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">{s.count} agend.</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-sm">Nenhum serviço encontrado.</p>
          )}
        </div>
      </div>

      {/* Two columns: Peak Hours + Branches */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Peak Hours */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
          <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-purple-500" />
            Horários de Pico (30 dias)
          </h2>
          {loading ? (
            <SkeletonSection />
          ) : (data?.peakHours?.length ?? 0) > 0 ? (
            <div className="space-y-2">
              {data!.peakHours.slice(0, 8).map(p => (
                <div key={p.hour} className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-brand-600 dark:text-brand-400 w-14">{p.hour}</span>
                  <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-purple-500 h-2.5 rounded-full transition-all"
                      style={{ width: `${(p.bookings / (data!.peakHours[0]?.bookings || 1)) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm text-gray-600 dark:text-gray-400 w-10 text-right">{p.bookings}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-sm">Nenhum dado disponível.</p>
          )}
        </div>

        {/* Branches */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
          <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
            <MapPin className="w-5 h-5 text-green-500" />
            Unidades (30 dias)
          </h2>
          {loading ? (
            <SkeletonSection />
          ) : (data?.branches?.length ?? 0) > 0 ? (
            <div className="space-y-2">
              {data!.branches.map(b => (
                <div key={b.name} className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-700 last:border-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{b.name}</p>
                  <span className="text-sm text-gray-600 dark:text-gray-400">{b.count} agend.</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-sm">Nenhuma unidade encontrada.</p>
          )}
        </div>
      </div>

      {/* Weekly Frequency */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
        <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
          <Activity className="w-5 h-5 text-brand-500" />
          Frequência Semanal (30 dias)
        </h2>
        {loading ? (
          <div className="flex items-end gap-3 h-32">
            {[1, 2, 3, 4, 5, 6, 7].map(i => (
              <div key={i} className="flex-1 bg-gray-100 dark:bg-gray-700 rounded animate-pulse h-full" />
            ))}
          </div>
        ) : (
          <div className="flex items-end gap-3 h-32">
            {data?.weeklyFrequency.map(d => (
              <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400">{d.value}</span>
                <div
                  className="w-full bg-brand-500 rounded-t transition-all"
                  style={{ height: `${Math.max((d.value / maxWeekly) * 100, 4)}%` }}
                />
                <span className="text-xs text-gray-500">{d.day}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Top Students */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
        <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
          <Award className="w-5 h-5 text-yellow-500" />
          Top 5 Alunos Mais Assíduos
        </h2>
        {loading ? (
          <div className="flex items-center justify-center h-20">
            <Loader2 className="w-6 h-6 animate-spin text-brand-600" />
          </div>
        ) : (data?.topStudents?.length ?? 0) === 0 ? (
          <p className="text-gray-400 text-sm">Nenhum check-in registrado ainda.</p>
        ) : (
          <div className="space-y-3">
            {(data?.topStudents || []).map((s, i) => (
              <div
                key={s.name}
                className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-700 last:border-0"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-gray-400 w-4">{i + 1}</span>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{s.name}</p>
                </div>
                <div className="flex items-center gap-6 text-sm">
                  <span className="text-gray-600 dark:text-gray-400">{s.checkins} aulas</span>
                  <span className="text-orange-500 font-semibold">🔥 {s.streak} sem</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
