'use client'

import { useState } from 'react'
import { Megaphone, Plus, Send, Clock, CheckCircle, MessageSquare } from 'lucide-react'

type Status = 'Enviado' | 'Agendado' | 'Rascunho'
type Channel = 'WhatsApp' | 'Email' | 'App'

interface Announcement {
  id: number
  title: string
  message: string
  status: Status
  channel: Channel
  date: string
}

const ANNOUNCEMENTS: Announcement[] = [
  {
    id: 1,
    title: 'Aula de sábado cancelada',
    message: 'Informamos que a aula de sábado (29/03) está cancelada devido à manutenção no espaço.',
    status: 'Enviado',
    channel: 'WhatsApp',
    date: '26/03/2026 09:00',
  },
  {
    id: 2,
    title: 'Novo horário disponível',
    message: 'A partir de segunda-feira, teremos uma nova turma às 06h30. Vagas limitadas!',
    status: 'Enviado',
    channel: 'App',
    date: '25/03/2026 18:00',
  },
  {
    id: 3,
    title: 'Promoção plano trimestral',
    message: 'Renove seu plano trimestral agora com 15% de desconto. Válido até 31/03.',
    status: 'Agendado',
    channel: 'Email',
    date: '28/03/2026 10:00',
  },
  {
    id: 4,
    title: 'Evento especial: Copa do Estúdio',
    message: 'Participe da nossa competição interna! Inscrições abertas até 01/04.',
    status: 'Agendado',
    channel: 'WhatsApp',
    date: '27/03/2026 12:00',
  },
  {
    id: 5,
    title: 'Atualização de regras do espaço',
    message: 'Revisamos as regras de uso do vestiário. Leia as atualizações antes da próxima aula.',
    status: 'Rascunho',
    channel: 'App',
    date: '—',
  },
]

const STATUS_STYLES: Record<Status, { label: string; classes: string; icon: React.ElementType }> = {
  Enviado: { label: 'Enviado', classes: 'bg-green-100 text-green-700', icon: CheckCircle },
  Agendado: { label: 'Agendado', classes: 'bg-blue-100 text-blue-700', icon: Clock },
  Rascunho: { label: 'Rascunho', classes: 'bg-gray-100 text-gray-500', icon: MessageSquare },
}

const CHANNEL_STYLES: Record<Channel, string> = {
  WhatsApp: 'bg-green-50 text-green-700 border border-green-100',
  Email: 'bg-blue-50 text-blue-700 border border-blue-100',
  App: 'bg-purple-50 text-purple-700 border border-purple-100',
}

const FILTERS: Array<Channel | 'Todos'> = ['Todos', 'WhatsApp', 'Email', 'App']

export default function AnnouncementsPage() {
  const [activeFilter, setActiveFilter] = useState<Channel | 'Todos'>('Todos')

  const filtered = ANNOUNCEMENTS.filter(
    (a) => activeFilter === 'Todos' || a.channel === activeFilter
  )

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-50 flex items-center justify-center">
            <Megaphone className="w-5 h-5 text-orange-500" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Avisos & Comunicados</h1>
            <p className="text-sm text-gray-500">Gerencie suas comunicações com alunos</p>
          </div>
        </div>
        <button className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors">
          <Plus className="w-4 h-4" />
          Novo Aviso
        </button>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setActiveFilter(f)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              activeFilter === f
                ? 'bg-brand-500 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Announcements List */}
      <div className="space-y-3">
        {filtered.map((a) => {
          const S = STATUS_STYLES[a.status]
          const StatusIcon = S.icon
          return (
            <div
              key={a.id}
              className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900 text-sm">{a.title}</h3>
                    <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${S.classes}`}>
                      <StatusIcon className="w-3 h-3" />
                      {S.label}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 line-clamp-2">{a.message}</p>
                  <div className="flex items-center gap-3 mt-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${CHANNEL_STYLES[a.channel]}`}>
                      {a.channel}
                    </span>
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Send className="w-3 h-3" />
                      {a.date}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <Megaphone className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Nenhum aviso para este canal.</p>
        </div>
      )}
    </div>
  )
}
