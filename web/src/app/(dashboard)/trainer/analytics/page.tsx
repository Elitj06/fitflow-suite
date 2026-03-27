'use client'

import { BarChart3, TrendingUp, Users, Calendar, Award, Activity } from 'lucide-react'

const METRICS = [
  {
    title: 'Alunos Ativos',
    value: '48',
    change: '+3 este mês',
    positive: true,
    icon: Users,
    accent: 'bg-brand-50 text-brand-600',
  },
  {
    title: 'Aulas esta Semana',
    value: '24',
    change: '+2 vs semana passada',
    positive: true,
    icon: Calendar,
    accent: 'bg-blue-50 text-blue-600',
  },
  {
    title: 'Taxa de Presença',
    value: '87%',
    change: '-2% vs mês anterior',
    positive: false,
    icon: Activity,
    accent: 'bg-green-50 text-green-600',
  },
  {
    title: 'Receita do Mês',
    value: 'R$ 8.420',
    change: '+12% vs mês anterior',
    positive: true,
    icon: TrendingUp,
    accent: 'bg-purple-50 text-purple-600',
  },
]

const WEEKLY_FREQUENCY = [
  { day: 'Seg', value: 18, max: 30 },
  { day: 'Ter', value: 24, max: 30 },
  { day: 'Qua', value: 30, max: 30 },
  { day: 'Qui', value: 22, max: 30 },
  { day: 'Sex', value: 27, max: 30 },
  { day: 'Sáb', value: 14, max: 30 },
  { day: 'Dom', value: 5, max: 30 },
]

const TOP_STUDENTS = [
  { name: 'Ana Lima', checkins: 22, streak: 18, plan: 'Mensal' },
  { name: 'Carlos Souza', checkins: 20, streak: 14, plan: 'Trimestral' },
  { name: 'Fernanda Mota', checkins: 19, streak: 12, plan: 'Mensal' },
  { name: 'Rafael Torres', checkins: 17, streak: 10, plan: 'Anual' },
  { name: 'Juliana Alves', checkins: 15, streak: 8, plan: 'Mensal' },
]

const MODALITIES = [
  { name: 'Muay Thai', students: 22, color: 'bg-brand-500', pct: 46 },
  { name: 'Jiu-Jitsu', students: 14, color: 'bg-blue-500', pct: 29 },
  { name: 'Boxe', students: 8, color: 'bg-orange-500', pct: 17 },
  { name: 'Fitness', students: 4, color: 'bg-green-500', pct: 8 },
]

function MetricCard({
  title, value, change, positive, icon: Icon, accent,
}: {
  title: string; value: string; change: string; positive: boolean; icon: React.ElementType; accent: string
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-5 flex items-start gap-4 shadow-sm">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${accent}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{title}</p>
        <p className="text-2xl font-bold text-gray-900 mt-0.5">{value}</p>
        <p className={`text-xs mt-1 ${positive ? 'text-green-600' : 'text-red-500'}`}>{change}</p>
      </div>
    </div>
  )
}

export default function AnalyticsPage() {
  return (
    <div className="p-6 space-y-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center">
          <BarChart3 className="w-5 h-5 text-brand-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Analytics</h1>
          <p className="text-sm text-gray-500">Visão geral do desempenho do estúdio</p>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {METRICS.map((m) => (
          <MetricCard key={m.title} {...m} />
        ))}
      </div>

      {/* Chart + Top Students */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Frequency Bar Chart */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Activity className="w-4 h-4 text-brand-500" />
            <h2 className="text-sm font-semibold text-gray-900">Frequência Semanal</h2>
          </div>
          <div className="flex items-end gap-2 h-40">
            {WEEKLY_FREQUENCY.map((d) => (
              <div key={d.day} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-xs text-gray-500 font-medium">{d.value}</span>
                <div
                  className="w-full rounded-t-md bg-brand-400 transition-all"
                  style={{ height: `${(d.value / d.max) * 100}%` }}
                />
                <span className="text-xs text-gray-400">{d.day}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Top 5 Students */}
        <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Award className="w-4 h-4 text-yellow-500" />
            <h2 className="text-sm font-semibold text-gray-900">Top 5 Alunos Mais Assíduos</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-gray-400 uppercase border-b border-gray-100">
                <th className="text-left pb-2">#</th>
                <th className="text-left pb-2">Aluno</th>
                <th className="text-right pb-2">Check-ins</th>
                <th className="text-right pb-2">Sequência</th>
              </tr>
            </thead>
            <tbody>
              {TOP_STUDENTS.map((s, i) => (
                <tr key={s.name} className="border-b border-gray-50 last:border-0">
                  <td className="py-2.5 text-gray-400 font-medium">{i + 1}</td>
                  <td className="py-2.5">
                    <p className="font-medium text-gray-900">{s.name}</p>
                    <p className="text-xs text-gray-400">{s.plan}</p>
                  </td>
                  <td className="py-2.5 text-right font-semibold text-gray-800">{s.checkins}</td>
                  <td className="py-2.5 text-right text-orange-500 font-medium">🔥 {s.streak}d</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Popular Modalities */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-5">
          <BarChart3 className="w-4 h-4 text-brand-500" />
          <h2 className="text-sm font-semibold text-gray-900">Modalidades Mais Populares</h2>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {MODALITIES.map((mod) => (
            <div key={mod.name} className="rounded-xl border border-gray-100 p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="font-medium text-gray-800 text-sm">{mod.name}</span>
                <span className="text-xs text-gray-400">{mod.pct}%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2 mb-3">
                <div
                  className={`h-2 rounded-full ${mod.color}`}
                  style={{ width: `${mod.pct}%` }}
                />
              </div>
              <p className="text-xl font-bold text-gray-900">{mod.students}</p>
              <p className="text-xs text-gray-400">alunos ativos</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
