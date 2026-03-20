import {
  Users,
  Calendar,
  Coins,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  CheckCircle2,
  XCircle,
  QrCode,
} from 'lucide-react'

function StatCard({
  title,
  value,
  change,
  changeType,
  icon: Icon,
  accent,
}: {
  title: string
  value: string
  change: string
  changeType: 'up' | 'down'
  icon: React.ElementType
  accent: string
}) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-6">
      <div className="flex items-center justify-between">
        <div
          className="inline-flex rounded-xl p-2.5"
          style={{ backgroundColor: accent + '15', color: accent }}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div
          className={`flex items-center gap-1 text-xs font-semibold ${
            changeType === 'up' ? 'text-success' : 'text-danger'
          }`}
        >
          {changeType === 'up' ? (
            <ArrowUpRight className="h-3.5 w-3.5" />
          ) : (
            <ArrowDownRight className="h-3.5 w-3.5" />
          )}
          {change}
        </div>
      </div>
      <div className="mt-4">
        <div className="font-display text-2xl font-bold text-gray-900">
          {value}
        </div>
        <div className="mt-0.5 text-sm text-gray-500">{title}</div>
      </div>
    </div>
  )
}

function UpcomingBooking({
  time,
  student,
  service,
  status,
}: {
  time: string
  student: string
  service: string
  status: 'confirmed' | 'pending' | 'checked_in'
}) {
  const statusConfig = {
    confirmed: {
      label: 'Confirmado',
      color: 'bg-blue-100 text-blue-700',
      icon: Clock,
    },
    pending: {
      label: 'Pendente',
      color: 'bg-amber-100 text-amber-700',
      icon: Clock,
    },
    checked_in: {
      label: 'Check-in',
      color: 'bg-green-100 text-green-700',
      icon: CheckCircle2,
    },
  }

  const config = statusConfig[status]
  const StatusIcon = config.icon

  return (
    <div className="flex items-center gap-4 rounded-xl border border-gray-100 bg-gray-50/50 p-4 transition-colors hover:bg-gray-50">
      <div className="text-center">
        <div className="font-display text-lg font-bold text-gray-900">
          {time}
        </div>
      </div>
      <div className="h-10 w-px bg-gray-200" />
      <div className="flex-1">
        <div className="font-medium text-gray-900">{student}</div>
        <div className="text-sm text-gray-500">{service}</div>
      </div>
      <div
        className={`flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${config.color}`}
      >
        <StatusIcon className="h-3 w-3" />
        {config.label}
      </div>
    </div>
  )
}

export default function TrainerDashboard() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl font-bold text-gray-900">
          Bom dia, Eliandro! 👋
        </h1>
        <p className="mt-1 text-gray-500">
          Aqui esta o resumo do seu dia. Voce tem 8 aulas agendadas.
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Alunos Ativos"
          value="47"
          change="+12%"
          changeType="up"
          icon={Users}
          accent="#6366f1"
        />
        <StatCard
          title="Aulas Hoje"
          value="8"
          change="+2"
          changeType="up"
          icon={Calendar}
          accent="#10b981"
        />
        <StatCard
          title="FitCoins Emitidos"
          value="1.284"
          change="+8%"
          changeType="up"
          icon={Coins}
          accent="#eab308"
        />
        <StatCard
          title="Receita do Mes"
          value="R$ 12.450"
          change="+15%"
          changeType="up"
          icon={TrendingUp}
          accent="#ec4899"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Upcoming bookings */}
        <div className="lg:col-span-2 rounded-2xl border border-gray-200 bg-white p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-semibold text-gray-900">
              Proximas Aulas
            </h2>
            <a
              href="/schedule"
              className="text-sm font-medium text-brand-600 hover:text-brand-700"
            >
              Ver agenda completa
            </a>
          </div>

          <div className="mt-4 space-y-3">
            <UpcomingBooking
              time="08:00"
              student="Ana Silva"
              service="Personal - Musculacao"
              status="checked_in"
            />
            <UpcomingBooking
              time="09:00"
              student="Carlos Mendes"
              service="Personal - Funcional"
              status="confirmed"
            />
            <UpcomingBooking
              time="10:00"
              student="Maria Oliveira"
              service="Avaliacao Fisica"
              status="confirmed"
            />
            <UpcomingBooking
              time="11:00"
              student="Grupo A"
              service="Treino em Grupo (6/8)"
              status="pending"
            />
            <UpcomingBooking
              time="14:00"
              student="Pedro Santos"
              service="Personal - Musculacao"
              status="confirmed"
            />
          </div>
        </div>

        {/* Quick actions + Recent activity */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6">
            <h2 className="font-display text-lg font-semibold text-gray-900">
              Acoes Rapidas
            </h2>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <a
                href="/checkin"
                className="flex flex-col items-center gap-2 rounded-xl border border-gray-200 p-4 text-center transition-all hover:border-brand-300 hover:bg-brand-50"
              >
                <QrCode className="h-6 w-6 text-brand-600" />
                <span className="text-xs font-medium text-gray-700">
                  Check-in
                </span>
              </a>
              <a
                href="/schedule"
                className="flex flex-col items-center gap-2 rounded-xl border border-gray-200 p-4 text-center transition-all hover:border-brand-300 hover:bg-brand-50"
              >
                <Calendar className="h-6 w-6 text-brand-600" />
                <span className="text-xs font-medium text-gray-700">
                  Agendar
                </span>
              </a>
              <a
                href="/trainer/students"
                className="flex flex-col items-center gap-2 rounded-xl border border-gray-200 p-4 text-center transition-all hover:border-brand-300 hover:bg-brand-50"
              >
                <Users className="h-6 w-6 text-brand-600" />
                <span className="text-xs font-medium text-gray-700">
                  Alunos
                </span>
              </a>
              <a
                href="/coins"
                className="flex flex-col items-center gap-2 rounded-xl border border-gray-200 p-4 text-center transition-all hover:border-brand-300 hover:bg-brand-50"
              >
                <Coins className="h-6 w-6 text-coin" />
                <span className="text-xs font-medium text-gray-700">
                  FitCoins
                </span>
              </a>
            </div>
          </div>

          {/* Chatbot status */}
          <div className="rounded-2xl border border-gray-200 bg-gradient-to-br from-gray-900 to-gray-800 p-6 text-white">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-xs font-semibold text-green-400 uppercase tracking-wider">
                FitBot Ativo
              </span>
            </div>
            <h3 className="mt-3 font-display text-lg font-bold">
              FitBot IA
            </h3>
            <div className="mt-2 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Mensagens hoje</span>
                <span className="font-semibold">34</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Agendamentos via bot</span>
                <span className="font-semibold text-green-400">5</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Vendas via bot</span>
                <span className="font-semibold text-amber-400">2</span>
              </div>
            </div>
            <a
              href="/chatbot"
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-sm font-medium backdrop-blur-sm transition-all hover:bg-white/20"
            >
              Configurar Bot
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
