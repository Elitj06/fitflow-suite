'use client'

import { useState, useEffect } from 'react'
import {
  Users, Calendar, Coins, TrendingUp,
  ArrowUpRight, ArrowDownRight, Clock,
  CheckCircle2, QrCode, Loader2, Bot,
  Dumbbell,
} from 'lucide-react'
import Link from 'next/link'

interface DashboardStats {
  students: { active: number; change: number }
  bookings: { today: number; month: number; change: number }
  checkins: { today: number }
  coins: { monthEarned: number; change: number }
  revenue: { month: number; change: number }
  chatbot: { messagesToday: number; bookingsViaBot: number; salesViaBot: number }
}

interface Booking {
  id: string
  startsAt: string
  status: string
  student: { fullName: string }
  service: { name: string; color: string }
}

function StatCard({
  title, value, change, changeType, icon: Icon, accent,
}: {
  title: string; value: string; change: string; changeType: 'up' | 'down' | 'neutral'
  icon: React.ElementType; accent: string
}) {
  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6">
      <div className="flex items-center justify-between">
        <div className="inline-flex rounded-xl p-2.5" style={{ backgroundColor: accent + '15', color: accent }}>
          <Icon className="h-5 w-5" />
        </div>
        {changeType !== 'neutral' && change && (
          <div className={changeType === 'up' ? 'flex items-center gap-1 text-xs font-semibold text-emerald-600' : 'flex items-center gap-1 text-xs font-semibold text-red-500'}>
            {changeType === 'up' ? <ArrowUpRight className="h-3.5 w-3.5" /> : <ArrowDownRight className="h-3.5 w-3.5" />}
            {change}
          </div>
        )}
      </div>
      <div className="mt-4">
        <div className="font-display text-2xl font-bold text-gray-900 dark:text-white">{value}</div>
        <div className="mt-0.5 text-sm text-gray-500 dark:text-gray-400">{title}</div>
      </div>
    </div>
  )
}

export default function TrainerDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [firstName, setFirstName] = useState('Personal')
  const [userRole, setUserRole] = useState<string>('TRAINER')

  useEffect(() => {
    async function load() {
      try {
        const today = new Date().toISOString().split('T')[0]
        const [statsRes, bookingsRes, profileRes] = await Promise.all([
          fetch('/api/dashboard/stats'),
          fetch('/api/bookings?date=' + today),
          fetch('/api/profile'),
        ])
        if (statsRes.ok) setStats(await statsRes.json())
        if (bookingsRes.ok) setBookings(await bookingsRes.json())
        if (profileRes.ok) {
          const p = await profileRes.json()
          setFirstName(p.fullName?.split(' ')[0] || 'Personal')
          setUserRole(p.role || 'TRAINER')
        }
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite'
  const upcoming = bookings.filter(b => b.status !== 'CANCELLED').slice(0, 5)

  if (loading) {
    return (
      <div className="flex h-60 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-white">{greeting}, {firstName}! 👋</h1>
        <p className="mt-1 text-gray-500">
          {stats ? `Voce tem ${stats.bookings.today} aula${stats.bookings.today !== 1 ? 's' : ''} hoje.` : 'Bem-vindo ao painel.'}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Alunos Ativos" value={stats ? String(stats.students.active) : '0'} change={stats ? (stats.students.change >= 0 ? '+' : '') + stats.students.change + '%' : ''} changeType={!stats || stats.students.change === 0 ? 'neutral' : stats.students.change > 0 ? 'up' : 'down'} icon={Users} accent="#6366f1" />
        <StatCard title="Aulas Hoje" value={stats ? String(stats.bookings.today) : '0'} change={stats ? (stats.bookings.change >= 0 ? '+' : '') + stats.bookings.change + '%' : ''} changeType={!stats || stats.bookings.change === 0 ? 'neutral' : stats.bookings.change > 0 ? 'up' : 'down'} icon={Calendar} accent="#10b981" />
        {userRole === 'ADMIN' && <StatCard title="FitCoins Emitidos" value={stats ? stats.coins.monthEarned.toLocaleString('pt-BR') : '0'} change={stats ? (stats.coins.change >= 0 ? '+' : '') + stats.coins.change + '%' : ''} changeType={!stats || stats.coins.change === 0 ? 'neutral' : stats.coins.change > 0 ? 'up' : 'down'} icon={Coins} accent="#eab308" />}
        {userRole === 'ADMIN' && <StatCard title="Receita do Mes" value={stats ? 'R$ ' + Number(stats.revenue.month).toLocaleString('pt-BR') : 'R$ 0'} change="" changeType="neutral" icon={TrendingUp} accent="#ec4899" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-gray-900 dark:text-white">Proximas Aulas</h2>
            <Link href="/trainer/schedule" className="text-sm font-medium text-brand-600 hover:text-brand-700">Ver agenda</Link>
          </div>
          <div className="mt-4 space-y-3">
            {upcoming.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                <Calendar className="h-10 w-10 mb-2 opacity-30" />
                <p className="text-sm">Nenhuma aula agendada para hoje</p>
                <Link href="/trainer/schedule" className="mt-2 text-xs text-brand-600 hover:underline">Ver agenda</Link>
              </div>
            ) : upcoming.map((b) => {
              const cfgMap: Record<string, {label: string; color: string; icon: React.ElementType}> = {
                CONFIRMED: { label: 'Confirmado', color: 'bg-blue-100 text-blue-700', icon: Clock },
                PENDING: { label: 'Pendente', color: 'bg-amber-100 text-amber-700', icon: Clock },
                COMPLETED: { label: 'Check-in', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
              }
              const cfg = cfgMap[b.status] || cfgMap.PENDING
              const StatusIcon = cfg.icon
              return (
                <div key={b.id} className="flex items-center gap-4 rounded-xl border border-gray-100 bg-gray-50/50 p-4">
                  <div className="font-display text-base font-bold text-gray-900 w-12 text-center flex-shrink-0">
                    {new Date(b.startsAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div className="h-10 w-px bg-gray-200 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 truncate">{b.student.fullName}</div>
                    <div className="text-sm text-gray-500 truncate">{b.service.name}</div>
                  </div>
                  <div className={'flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold flex-shrink-0 ' + cfg.color}>
                    <StatusIcon className="h-3 w-3" />{cfg.label}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6">
            <h2 className="font-display text-lg font-semibold text-gray-900 dark:text-white">Acoes Rapidas</h2>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {[{href:'/checkin',icon:QrCode,label:'Check-in'},{href:'/trainer/students',icon:Users,label:'Alunos'},{href:'/trainer/prescriptions',icon:Dumbbell,label:'Prescrições'},{href:'/trainer/schedule',icon:Calendar,label:'Minha Agenda'}].map(a => (
                <Link key={a.href} href={a.href} className="flex flex-col items-center gap-2 rounded-xl border border-gray-200 p-4 text-center transition-all hover:border-brand-300 hover:bg-brand-50">
                  <a.icon className="h-6 w-6 text-brand-600" />
                  <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{a.label}</span>
                </Link>
              ))}
            </div>
          </div>
          <div className="rounded-2xl border border-gray-200 bg-gradient-to-br from-gray-900 to-gray-800 p-6 text-white">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-xs font-semibold text-green-400 uppercase tracking-wider">FitBot</span>
            </div>
            <h3 className="mt-3 font-display text-lg font-bold">FitBot IA</h3>
            <div className="mt-2 space-y-1">
              <div className="flex justify-between text-sm"><span className="text-gray-400">Mensagens hoje</span><span className="font-semibold">{stats?.chatbot.messagesToday ?? 0}</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-400">Agendamentos via bot</span><span className="font-semibold text-green-400">{stats?.chatbot.bookingsViaBot ?? 0}</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-400">Vendas via bot</span><span className="font-semibold text-amber-400">{stats?.chatbot.salesViaBot ?? 0}</span></div>
            </div>
            <Link href="/chatbot" className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-sm font-medium transition-all hover:bg-white/20">
              <Bot className="h-4 w-4" /> Configurar Bot
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
