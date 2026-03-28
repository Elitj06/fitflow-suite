'use client'

import { useState, useEffect } from 'react'
import { BarChart3, TrendingUp, Users, Calendar, Award, Activity, Loader2 } from 'lucide-react'

interface AnalyticsData {
  activeStudents: number
  weekCheckins: number
  presenceRate: number
  monthRevenue: number
  topStudents: { name: string; checkins: number; streak: number }[]
  weeklyFrequency: { day: string; value: number }[]
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/analytics')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
      </div>
    )
  }

  const metrics = [
    {
      title: 'Alunos Ativos',
      value: data?.activeStudents?.toLocaleString('pt-BR') || '0',
      change: 'Total cadastrado',
      positive: true,
      icon: Users,
      accent: 'bg-brand-50 text-brand-600',
    },
    {
      title: 'Check-ins esta Semana',
      value: data?.weekCheckins?.toString() || '0',
      change: 'Últimos 7 dias',
      positive: true,
      icon: Calendar,
      accent: 'bg-blue-50 text-blue-600',
    },
    {
      title: 'Taxa de Presença',
      value: `${data?.presenceRate || 0}%`,
      change: 'Média mensal',
      positive: true,
      icon: Activity,
      accent: 'bg-green-50 text-green-600',
    },
    {
      title: 'Receita do Mês',
      value: data?.monthRevenue ? `R$ ${data.monthRevenue.toLocaleString('pt-BR')}` : 'Integrar Stripe',
      change: 'Dados do Stripe',
      positive: true,
      icon: TrendingUp,
      accent: 'bg-purple-50 text-purple-600',
    },
  ]

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <BarChart3 className="w-6 h-6" />
          Analytics
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">Visão geral do desempenho do estúdio</p>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map(m => (
          <div key={m.title} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-5 flex items-start gap-4 shadow-sm">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${m.accent}`}>
              <m.icon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{m.title}</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white mt-0.5">{m.value}</p>
              <p className={`text-xs mt-1 ${m.positive ? 'text-green-600' : 'text-red-500'}`}>{m.change}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Top Alunos */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 p-6">
        <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-4">
          <Award className="w-5 h-5 text-yellow-500" />
          Top 5 Alunos Mais Assíduos
        </h2>
        <div className="space-y-3">
          {(data?.topStudents || []).length === 0 ? (
            <p className="text-gray-400 text-sm">Nenhum check-in registrado ainda.</p>
          ) : (
            (data?.topStudents || []).map((s, i) => (
              <div key={s.name} className="flex items-center justify-between py-2 border-b border-gray-50 dark:border-gray-700 last:border-0">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-gray-400 w-4">{i + 1}</span>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{s.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6 text-sm">
                  <span className="text-gray-600 dark:text-gray-400">{s.checkins} FitCoins</span>
                  <span className="text-orange-500 font-semibold">🔥 {s.streak} sequência</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
