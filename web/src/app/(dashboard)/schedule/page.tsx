'use client'

import { useState, useMemo } from 'react'
import {
  Calendar as CalendarIcon, ChevronLeft, ChevronRight, Plus,
  Clock, User, X, CheckCircle2, Loader2, Filter,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Types
interface Booking {
  id: string
  time: string
  endTime: string
  student: string
  service: string
  serviceColor: string
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled'
  source: 'web' | 'whatsapp' | 'manual'
}

interface TimeSlot {
  hour: string
  bookings: Booking[]
}

// Mock data
const MOCK_BOOKINGS: Booking[] = [
  { id: '1', time: '06:00', endTime: '07:00', student: 'Ana Silva', service: 'Personal Training', serviceColor: '#6366f1', status: 'confirmed', source: 'web' },
  { id: '2', time: '07:00', endTime: '08:00', student: 'Carlos Mendes', service: 'Personal Training', serviceColor: '#6366f1', status: 'confirmed', source: 'whatsapp' },
  { id: '3', time: '08:00', endTime: '08:50', student: 'Grupo A (5/8)', service: 'Treino em Grupo', serviceColor: '#10b981', status: 'confirmed', source: 'web' },
  { id: '4', time: '09:00', endTime: '10:00', student: 'Maria Oliveira', service: 'Personal Training', serviceColor: '#6366f1', status: 'pending', source: 'manual' },
  { id: '5', time: '10:00', endTime: '10:45', student: 'Pedro Santos', service: 'Avaliacao Fisica', serviceColor: '#f59e0b', status: 'confirmed', source: 'whatsapp' },
  { id: '6', time: '14:00', endTime: '15:00', student: 'Julia Costa', service: 'Personal Training', serviceColor: '#6366f1', status: 'confirmed', source: 'web' },
  { id: '7', time: '15:00', endTime: '15:50', student: 'Grupo B (7/8)', service: 'Treino em Grupo', serviceColor: '#10b981', status: 'confirmed', source: 'web' },
  { id: '8', time: '16:00', endTime: '17:00', student: 'Rafael Lima', service: 'Personal Training', serviceColor: '#6366f1', status: 'pending', source: 'whatsapp' },
  { id: '9', time: '18:00', endTime: '19:00', student: 'Fernanda Alves', service: 'Personal Training', serviceColor: '#6366f1', status: 'confirmed', source: 'web' },
]

const HOURS = Array.from({ length: 17 }, (_, i) => {
  const h = i + 6
  return `${h.toString().padStart(2, '0')}:00`
})

const DAYS_OF_WEEK = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab']
const MONTHS = ['Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']

const STATUS_CONFIG = {
  pending: { label: 'Pendente', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  confirmed: { label: 'Confirmado', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  completed: { label: 'Concluido', color: 'bg-green-100 text-green-700 border-green-200' },
  cancelled: { label: 'Cancelado', color: 'bg-red-100 text-red-700 border-red-200' },
}

const SOURCE_LABEL = { web: 'App', whatsapp: 'WhatsApp', manual: 'Manual' }

function BookingCard({ booking, onClick }: { booking: Booking; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-lg border-l-[3px] bg-white px-3 py-2 shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5"
      style={{ borderLeftColor: booking.serviceColor }}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-bold text-gray-900">{booking.time} - {booking.endTime}</span>
        {booking.source === 'whatsapp' && (
          <span className="rounded-full bg-green-100 px-1.5 py-0.5 text-[9px] font-bold text-green-700">WA</span>
        )}
      </div>
      <div className="mt-1 text-sm font-medium text-gray-800 truncate">{booking.student}</div>
      <div className="text-xs text-gray-500 truncate">{booking.service}</div>
    </button>
  )
}

function NewBookingModal({ onClose }: { onClose: () => void }) {
  const [saving, setSaving] = useState(false)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-display text-lg font-bold text-gray-900">Novo Agendamento</h3>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-gray-100">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Aluno</label>
            <select className="mt-1 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100">
              <option>Selecionar aluno...</option>
              <option>Ana Silva</option>
              <option>Carlos Mendes</option>
              <option>Maria Oliveira</option>
              <option>Pedro Santos</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Servico</label>
            <select className="mt-1 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100">
              <option>Selecionar servico...</option>
              <option>Personal Training (60min - R$ 120)</option>
              <option>Treino em Grupo (50min - R$ 45)</option>
              <option>Avaliacao Fisica (45min - R$ 80)</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">Data</label>
              <input type="date" className="mt-1 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Horario</label>
              <select className="mt-1 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100">
                {HOURS.map((h) => <option key={h}>{h}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Observacoes</label>
            <textarea
              rows={2}
              className="mt-1 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 resize-none"
              placeholder="Notas sobre a sessao..."
            />
          </div>
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-gray-300 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            onClick={() => { setSaving(true); setTimeout(() => { setSaving(false); onClose() }, 1000) }}
            disabled={saving}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
            {saving ? 'Salvando...' : 'Agendar'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function SchedulePage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [view, setView] = useState<'day' | 'week'>('day')
  const [showNewBooking, setShowNewBooking] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)

  const dateStr = `${currentDate.getDate()} de ${MONTHS[currentDate.getMonth()]} de ${currentDate.getFullYear()}`
  const dayName = DAYS_OF_WEEK[currentDate.getDay()]

  const prevDay = () => setCurrentDate(new Date(currentDate.getTime() - 86400000))
  const nextDay = () => setCurrentDate(new Date(currentDate.getTime() + 86400000))
  const goToday = () => setCurrentDate(new Date())

  const timeSlots: TimeSlot[] = useMemo(() => {
    return HOURS.map((hour) => ({
      hour,
      bookings: MOCK_BOOKINGS.filter((b) => b.time === hour),
    }))
  }, [])

  const totalBookings = MOCK_BOOKINGS.length
  const confirmedCount = MOCK_BOOKINGS.filter((b) => b.status === 'confirmed').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-900">Agenda</h1>
          <p className="mt-1 text-sm text-gray-500">
            {totalBookings} aulas hoje, {confirmedCount} confirmadas
          </p>
        </div>
        <button
          onClick={() => setShowNewBooking(true)}
          className="flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-700"
        >
          <Plus className="h-4 w-4" />
          Novo Agendamento
        </button>
      </div>

      {/* Date navigation */}
      <div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white p-4">
        <div className="flex items-center gap-3">
          <button onClick={prevDay} className="rounded-lg p-2 hover:bg-gray-100 transition-colors">
            <ChevronLeft className="h-5 w-5 text-gray-600" />
          </button>
          <div>
            <div className="font-display text-lg font-bold text-gray-900">{dayName}, {dateStr}</div>
          </div>
          <button onClick={nextDay} className="rounded-lg p-2 hover:bg-gray-100 transition-colors">
            <ChevronRight className="h-5 w-5 text-gray-600" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={goToday}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
          >
            Hoje
          </button>
          <div className="flex rounded-lg border border-gray-300 overflow-hidden">
            <button
              onClick={() => setView('day')}
              className={cn('px-3 py-1.5 text-xs font-medium transition-all', view === 'day' ? 'bg-brand-600 text-white' : 'text-gray-600 hover:bg-gray-50')}
            >
              Dia
            </button>
            <button
              onClick={() => setView('week')}
              className={cn('px-3 py-1.5 text-xs font-medium transition-all', view === 'week' ? 'bg-brand-600 text-white' : 'text-gray-600 hover:bg-gray-50')}
            >
              Semana
            </button>
          </div>
        </div>
      </div>

      {/* Day view timeline */}
      <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
        <div className="divide-y divide-gray-100">
          {timeSlots.map((slot) => (
            <div
              key={slot.hour}
              className={cn(
                'flex min-h-[72px] transition-colors',
                slot.bookings.length > 0 ? 'bg-white' : 'bg-gray-50/50'
              )}
            >
              {/* Time label */}
              <div className="flex w-20 shrink-0 items-start justify-end border-r border-gray-100 pr-3 pt-3">
                <span className="text-xs font-medium text-gray-400">{slot.hour}</span>
              </div>

              {/* Bookings */}
              <div className="flex-1 p-2">
                {slot.bookings.length > 0 ? (
                  <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                    {slot.bookings.map((booking) => (
                      <BookingCard
                        key={booking.id}
                        booking={booking}
                        onClick={() => setSelectedBooking(booking)}
                      />
                    ))}
                  </div>
                ) : (
                  <button
                    onClick={() => setShowNewBooking(true)}
                    className="flex h-full w-full items-center justify-center rounded-lg border border-dashed border-gray-200 text-xs text-gray-400 transition-all hover:border-brand-300 hover:text-brand-500 hover:bg-brand-50/50"
                  >
                    <Plus className="mr-1 h-3 w-3" />
                    Agendar
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Booking detail modal */}
      {selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg font-bold text-gray-900">Detalhes</h3>
              <button onClick={() => setSelectedBooking(null)} className="rounded-lg p-1 hover:bg-gray-100">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">
                  {selectedBooking.student.split(' ').map(n => n[0]).join('')}
                </div>
                <div>
                  <div className="font-medium text-gray-900">{selectedBooking.student}</div>
                  <div className="text-sm text-gray-500">{selectedBooking.service}</div>
                </div>
              </div>

              <div className="rounded-xl bg-gray-50 p-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Horario</span>
                  <span className="font-medium">{selectedBooking.time} - {selectedBooking.endTime}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Status</span>
                  <span className={cn('rounded-full px-2 py-0.5 text-xs font-semibold border', STATUS_CONFIG[selectedBooking.status].color)}>
                    {STATUS_CONFIG[selectedBooking.status].label}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Origem</span>
                  <span className="font-medium">{SOURCE_LABEL[selectedBooking.source]}</span>
                </div>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button className="rounded-xl border border-red-300 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50">
                Cancelar
              </button>
              <button className="rounded-xl bg-success px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-600">
                Check-in
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New booking modal */}
      {showNewBooking && <NewBookingModal onClose={() => setShowNewBooking(false)} />}
    </div>
  )
}
