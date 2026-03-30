'use client'

import { useState, useEffect } from 'react'
import {
  BarChart3, TrendingUp, Users, Calendar, Award, Activity,
  Loader2, AlertCircle, Clock, Zap
} from 'lucide-react'

// ── Types ────────────────────────────────────────────────────

interface SupabaseAnalytics {
  activeStudents: number
  weekCheckins: number
  presenceRate: number
  monthRevenue: number
  topStudents: { name: string; checkins: number; streak: number }[]
  weeklyFrequency: { day: string; value: number }[]
}

interface BQOverview {
  total_students: number
  bookings_30d: number
  presences_30d: number
  presence_rate: number
  channels: {
    canal: string
    alunos: number
    pct_alunos: number
    agendamentos_30d: number
    presencas_30d: number
  }[]
}

interface BQChurnItem {
  student_id: string
  source: string
  coins_balance: number
  unidade: string
  ultimo_agendamento: string | null
  dias_sem_aparecer: number | null
}

interface BQPeakHour {
  unidade: string
  horario: string
  total_agendamentos: number
  presencas: number
}

interface BQService {
  servico: string
  unidade: string
  agendamentos: number
  presencas: number
  cancelamentos: number
  taxa_cancelamento_pct: number
}

interface BQGrowthItem {
  semana: string
  canal: string
  novos_alunos: number
}

// ── Skeleton loader ──────────────────────────────────────────

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

// ── Error banner ─────────────────────────────────────────────

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl px-4 py-3 text-sm text-red-700 dark:text-red-400">
      <AlertCircle className="w-4 h-4 shrink-0" />
      {message}
    </div>
  )
}

// ── Source badge ─────────────────────────────────────────────

function SourceBadge({ source }: { source: string }) {
  const map: Record<string, string> = {
    wellhub: 'bg-green-100 text-green-700',
    totalpass: 'bg-blue-100 text-blue-700',
    direct: 'bg-gray-100 text-gray-600',
  }
  const cls = map[source?.toLowerCase()] || 'bg-gray-100 text-gray-600'
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${cls}`}>
      {source || 'direct'}
    </span>
  )
}

// ── Main page ────────────────────────────────────────────────

export default function AnalyticsPage() {
  const [supabase, setSupabase] = useState<SupabaseAnalytics | null>(null)
  const [overview, setOverview] = useState<BQOverview | null>(null)
  const [churn, setChurn] = useState<BQChurnItem[] | null>(null)
  const [peakHours, setPeakHours] = useState<BQPeakHour[] | null>(null)
  const [services, setServices] = useState<BQService[] | null>(null)
  const [growth, setGrowth] = useState<BQGrowthItem[] | null>(null)

  const [loadingSupabase, setLoadingSupabase] = useState(true)
  const [loadingBQ, setLoadingBQ] = useState(true)
  const [errorSupabase, setErrorSupabase] = useState<string | null>(null)
  const [errorBQ, setErrorBQ] = useState<string | null>(null)

  // Fetch Supabase analytics (existing)
  useEffect(() => {
    fetch('/api/analytics')
      .then(r => r.json())
      .then(d => { setSupabase(d); setLoadingSupabase(false) })
      .catch(() => {
        setErrorSupabase('Não foi possível carregar dados do Supabase.')
        setLoadingSupabase(false)
      })
  }, [])

  // Fetch BigQuery analytics
  useEffect(() => {
    const metrics = ['overview', 'churn', 'peak_hours', 'services', 'growth'] as const

    Promise.all(
      metrics.map(m =>
        fetch(`/api/analytics/bigquery?metric=${m}`)
          .then(r => r.json())
          .catch(() => null)
      )
    ).then(([ov, ch, pk, sv, gr]) => {
      if (ov?.data) setOverview(ov.data)
      if (ch?.data) setChurn(ch.data)
      if (pk?.data) setPeakHours(pk.data)
      if (sv?.data) setServices(sv.data)
      if (gr?.data) setGrowth(gr.data)
      if (!ov?.data && !ch?.data) {
        setErrorBQ('Dados do BigQuery indisponíveis. Verifique credenciais.')
      }
      setLoadingBQ(false)
    })
  }, [])

  // ── Metric cards (prefer BQ overview, fallback to Supabase) ─
  const activeStudents = overview?.total_students ?? supabase?.activeStudents ?? 0
  const bookings30d = overview?.bookings_30d ?? 0
  const presenceRate = overview?.presence_rate ?? supabase?.presenceRate ?? 0
  const weekCheckins = supabase?.weekCheckins ?? 0

  const metrics = [
    {
      title: 'Alunos Ativos',
      value: activeStudents.toLocaleString('pt-BR'),
      change: 'Total cadastrado',
      positive: true,
      icon: Users,
      accent: 'bg-brand-50 text-brand-600',
      loading: loadingBQ && loadingSupabase,
    },
    {
      title: 'Agendamentos 30d',
      value: bookings30d.toLocaleString('pt-BR'),
      change: 'Últimos 30 dias (BigQuery)',
      positive: true,
      icon: Calendar,
      accent: 'bg-blue-50 text-blue-600',
      loading: loadingBQ,
    },
    {
      title: 'Taxa de Presença',
      value: `${presenceRate}%`,
      change: 'Média últimos 30 dias',
      positive: presenceRate >= 70,
      icon: Activity,
      accent: 'bg-green-50 text-green-600',
      loading: loadingBQ && loadingSupabase,
    },
    {
      title: 'Check-ins Semana',
      value: weekCheckins.toLocaleString('pt-BR'),
      change: 'Últimos 7 dias',
      positive: true,
      icon: TrendingUp,
      accent: 'bg-purple-50 text-purple-600',
      loading: loadingSupabase,
    },
  ]

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <BarChart3 className="w-6 h-6" />
          Analytics
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Visão geral do desempenho do estúdio — dados em tempo real do BigQuery
        </p>
      </div>

      {/* Error banners */}
      {errorSupabase && <ErrorBanner message={errorSupabase} />}
      {errorBQ && <ErrorBanner message={errorBQ} />}

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map(m =>
          m.loading ? (
            <SkeletonCard key={m.title} />
          ) : (
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
          )
        )}
      </div>

      {/* Channel distribution (BQ) */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
        <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
          <Zap className="w-5 h-5 text-brand-500" />
          Distribuição por Canal
        </h2>
        {loadingBQ ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-8 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
            ))}
          </div>
        ) : overview?.channels?.length ? (
          <div className="space-y-3">
            {overview.channels.map(ch => (
              <div key={ch.canal} className="flex items-center gap-3">
                <SourceBadge source={ch.canal} />
                <div className="flex-1 bg-gray-100 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-brand-500 h-2 rounded-full transition-all"
                    style={{ width: `${ch.pct_alunos}%` }}
                  />
                </div>
                <span className="text-sm text-gray-700 dark:text-gray-300 w-20 text-right">
                  {ch.alunos.toLocaleString('pt-BR')} alunos
                </span>
                <span className="text-xs text-gray-400 w-10 text-right">{ch.pct_alunos}%</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-400 text-sm">Sem dados disponíveis.</p>
        )}
      </div>

      {/* Two columns: Services + Peak Hours */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Top services */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
          <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
            <Award className="w-5 h-5 text-yellow-500" />
            Top Serviços (30 dias)
          </h2>
          {loadingBQ ? (
            <SkeletonSection />
          ) : services?.length ? (
            <div className="space-y-2">
              {services.slice(0, 8).map((s, i) => (
                <div
                  key={`${s.servico}-${s.unidade}`}
                  className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-700 last:border-0"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-bold text-gray-400 w-4">{i + 1}</span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{s.servico}</p>
                      <p className="text-xs text-gray-400 truncate">{s.unidade}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 text-sm shrink-0 ml-2">
                    <span className="text-gray-600 dark:text-gray-400">{s.agendamentos} agend.</span>
                    {s.taxa_cancelamento_pct > 0 && (
                      <span className="text-red-500 text-xs">{s.taxa_cancelamento_pct}% cancel.</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-sm">Nenhum serviço encontrado.</p>
          )}
        </div>

        {/* Peak hours */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
          <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-blue-500" />
            Horários de Pico
          </h2>
          {loadingBQ ? (
            <SkeletonSection />
          ) : peakHours?.length ? (
            <div className="space-y-2">
              {peakHours.slice(0, 8).map((p, i) => (
                <div
                  key={`${p.unidade}-${p.horario}-${i}`}
                  className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-700 last:border-0"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-brand-600 dark:text-brand-400 w-12">{p.horario}</span>
                    <span className="text-xs text-gray-400">{p.unidade}</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <span className="text-gray-700 dark:text-gray-300">{p.total_agendamentos} agend.</span>
                    <span className="text-green-600 text-xs">{p.presencas} pres.</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-400 text-sm">Nenhum dado disponível.</p>
          )}
        </div>
      </div>

      {/* Growth */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
        <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-green-500" />
          Crescimento de Alunos (últimas 12 semanas)
        </h2>
        {loadingBQ ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-8 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
            ))}
          </div>
        ) : growth?.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 uppercase tracking-wide border-b border-gray-100 dark:border-gray-700">
                  <th className="pb-2 pr-4">Semana</th>
                  <th className="pb-2 pr-4">Canal</th>
                  <th className="pb-2 text-right">Novos Alunos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                {growth.slice(0, 20).map((g, i) => (
                  <tr key={`${g.semana}-${g.canal}-${i}`} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                    <td className="py-2 pr-4 text-gray-600 dark:text-gray-400">{g.semana}</td>
                    <td className="py-2 pr-4">
                      <SourceBadge source={g.canal} />
                    </td>
                    <td className="py-2 text-right font-semibold text-gray-900 dark:text-white">
                      +{g.novos_alunos}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-400 text-sm">Sem dados de crescimento disponíveis.</p>
        )}
      </div>

      {/* Churn risk */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
        <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-1">
          <AlertCircle className="w-5 h-5 text-orange-500" />
          Alunos em Risco de Churn
        </h2>
        <p className="text-xs text-gray-400 mb-4">Não aparecem há mais de 14 dias</p>
        {loadingBQ ? (
          <div className="space-y-2">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-8 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
            ))}
          </div>
        ) : churn?.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 uppercase tracking-wide border-b border-gray-100 dark:border-gray-700">
                  <th className="pb-2 pr-4">ID do Aluno</th>
                  <th className="pb-2 pr-4">Canal</th>
                  <th className="pb-2 pr-4">Unidade</th>
                  <th className="pb-2 pr-4">Último Agendamento</th>
                  <th className="pb-2 text-right">Dias Ausente</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-700">
                {churn.map((c, i) => (
                  <tr key={`${c.student_id}-${i}`} className="hover:bg-gray-50 dark:hover:bg-gray-750">
                    <td className="py-2 pr-4 text-gray-600 dark:text-gray-400 font-mono text-xs">
                      {String(c.student_id).slice(0, 8)}…
                    </td>
                    <td className="py-2 pr-4">
                      <SourceBadge source={c.source} />
                    </td>
                    <td className="py-2 pr-4 text-gray-600 dark:text-gray-400">{c.unidade}</td>
                    <td className="py-2 pr-4 text-gray-600 dark:text-gray-400">
                      {c.ultimo_agendamento ? c.ultimo_agendamento.slice(0, 10) : '—'}
                    </td>
                    <td className="py-2 text-right">
                      <span className={`font-semibold ${(c.dias_sem_aparecer ?? 0) > 30 ? 'text-red-600' : 'text-orange-500'}`}>
                        {c.dias_sem_aparecer != null ? `${c.dias_sem_aparecer}d` : '—'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-400 text-sm">Nenhum aluno em risco identificado. 🎉</p>
        )}
      </div>

      {/* Top students (Supabase) */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
        <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
          <Award className="w-5 h-5 text-yellow-500" />
          Top 5 Alunos Mais Assíduos
        </h2>
        {loadingSupabase ? (
          <div className="flex items-center justify-center h-20">
            <Loader2 className="w-6 h-6 animate-spin text-brand-600" />
          </div>
        ) : (supabase?.topStudents || []).length === 0 ? (
          <p className="text-gray-400 text-sm">Nenhum check-in registrado ainda.</p>
        ) : (
          <div className="space-y-3">
            {(supabase?.topStudents || []).map((s, i) => (
              <div
                key={s.name}
                className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-700 last:border-0"
              >
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-gray-400 w-4">{i + 1}</span>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{s.name}</p>
                </div>
                <div className="flex items-center gap-6 text-sm">
                  <span className="text-gray-600 dark:text-gray-400">{s.checkins} FitCoins</span>
                  <span className="text-orange-500 font-semibold">🔥 {s.streak} sequência</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
