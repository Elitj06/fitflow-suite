'use client'

import { useState, useEffect, useRef } from 'react'
import {
  ChevronLeft, ChevronRight, Plus,
  Clock, X, CheckCircle2, Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface Booking {
  id: string
  startsAt: string
  endsAt: string
  status: string
  source: string
  notes: string | null
  service: { name: string; color: string; durationMinutes: number; coinsReward: number }
  trainer: { fullName: string }
  student: { fullName: string; avatarUrl: string | null }
  checkin: { id: string } | null
}

interface Service { id: string; name: string; durationMinutes: number; price: number; color: string; maxCapacity: number }
interface StudentProfile { id: string; fullName: string }
interface TrainerProfile { id: string; fullName: string }

const HOURS = Array.from({ length: 17 }, (_, i) => `${(i + 6).toString().padStart(2, '0')}:00`)
const DAYS_PT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab']
const MONTHS_PT = ['Janeiro', 'Fevereiro', 'Marco', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'Pendente', color: 'bg-amber-100 text-amber-700 border-amber-200' },
  CONFIRMED: { label: 'Confirmado', color: 'bg-blue-100 text-blue-700 border-blue-200' },
  COMPLETED: { label: 'Concluido', color: 'bg-green-100 text-green-700 border-green-200' },
  CANCELLED: { label: 'Cancelado', color: 'bg-red-100 text-red-700 border-red-200' },
}

export default function SchedulePage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewBooking, setShowNewBooking] = useState(false)
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null)
  const [services, setServices] = useState<Service[]>([])
  const [students, setStudents] = useState<StudentProfile[]>([])
  const [trainers, setTrainers] = useState<TrainerProfile[]>([])
  const [myProfile, setMyProfile] = useState<{ id: string; fullName: string; role: string } | null>(null)
  const [prescriptions, setPrescriptions] = useState<{ id: string; code: string; name: string | null; studentId: string }[]>([])
  const [form, setForm] = useState({ studentId: '', serviceId: '', trainerId: '', date: '', hour: '08:00', notes: '', prescriptionText: '', prescriptionId: '' })
  const [saving, setSaving] = useState(false)
  const [cancelling, setCancelling] = useState(false)
  const [studentSearch, setStudentSearch] = useState('')
  const [showStudentDropdown, setShowStudentDropdown] = useState(false)
  const [activePrescription, setActivePrescription] = useState<{ id: string; code: string; name: string | null; totalSessions: number; usedSessions: number } | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const dateStr = currentDate.toISOString().split('T')[0]

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowStudentDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  async function loadBookings() {
    setLoading(true)
    try {
      const res = await fetch(`/api/bookings?date=${dateStr}`)
      if (res.ok) setBookings(await res.json())
    } catch (e) {
      toast.error('Erro ao carregar agenda')
    } finally {
      setLoading(false)
    }
  }

  async function loadFormData() {
    const [svcRes, stRes, profileRes] = await Promise.all([
      fetch('/api/services'),
      fetch('/api/students'),
      fetch('/api/profile'),
    ])
    if (svcRes.ok) setServices(await svcRes.json())
    if (stRes.ok) {
      const list = await stRes.json()
      setStudents(list.map((s: any) => ({ id: s.id, fullName: s.fullName })))
    }
    if (profileRes.ok) {
      const prof = await profileRes.json()
      setMyProfile(prof)
      setForm(f => ({ ...f, trainerId: prof.id }))
    }
    // Load trainers
    try {
      const tRes = await fetch('/api/trainers')
      if (tRes.ok) setTrainers(await tRes.json())
    } catch {}
    // Load active prescriptions
    try {
      const pRes = await fetch('/api/prescriptions')
      if (pRes.ok) setPrescriptions(await pRes.json())
    } catch {}
  }

  // Load active prescription when student is selected
  async function loadActivePrescription(studentId: string) {
    try {
      const res = await fetch(`/api/trainer/student-detail?studentId=${studentId}`)
      if (res.ok) {
        const data = await res.json()
        if (data.activePrescription) {
          setActivePrescription(data.activePrescription)
          setForm(f => ({ ...f, prescriptionId: data.activePrescription.id }))
        } else {
          setActivePrescription(null)
          setForm(f => ({ ...f, prescriptionId: '' }))
        }
      }
    } catch {}
  }

  useEffect(() => { loadBookings() }, [dateStr])
  useEffect(() => { loadFormData() }, [])

  function prevDay() { setCurrentDate(new Date(currentDate.getTime() - 86400000)) }
  function nextDay() { setCurrentDate(new Date(currentDate.getTime() + 86400000)) }

  async function createBooking(e: React.FormEvent) {
    e.preventDefault()
    if (!form.studentId || !form.serviceId || !form.date) {
      toast.error('Preencha aluno, servico e data')
      return
    }
    setSaving(true)
    try {
      const startsAt = new Date(`${form.date}T${form.hour}:00`)
      const notesCombined = [
        form.prescriptionText ? `[Prescrição]: ${form.prescriptionText}` : '',
        form.notes || '',
      ].filter(Boolean).join('\n')

      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          serviceId: form.serviceId,
          trainerId: form.trainerId || myProfile?.id,
          studentId: form.studentId,
          startsAt: startsAt.toISOString(),
          notes: notesCombined || null,
          prescriptionId: form.prescriptionId || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Erro ao criar agendamento')
        return
      }
      toast.success('Agendamento criado com sucesso!')
      setShowNewBooking(false)
      setForm({ studentId: '', serviceId: '', trainerId: myProfile?.id || '', date: '', hour: '08:00', notes: '', prescriptionText: '', prescriptionId: '' })
      setStudentSearch('')
      loadBookings()
    } catch (e) {
      toast.error('Erro de conexao')
    } finally {
      setSaving(false)
    }
  }

  async function cancelBooking(bookingId: string) {
    setCancelling(true)
    try {
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'CANCELLED' }),
      })
      if (res.ok) {
        toast.success('Agendamento cancelado')
        setSelectedBooking(null)
        loadBookings()
      } else {
        toast.error('Erro ao cancelar')
      }
    } catch {
      toast.error('Erro de conexao')
    } finally {
      setCancelling(false)
    }
  }

  const bookingsByHour = HOURS.reduce<Record<string, Booking[]>>((acc, h) => {
    acc[h] = bookings.filter((b) => {
      const bHour = new Date(b.startsAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      return bHour === h
    })
    return acc
  }, {})

  const confirmedCount = bookings.filter((b) => b.status === 'CONFIRMED' || b.status === 'COMPLETED').length

  const filteredStudents = students
    .filter(s => !studentSearch || s.fullName.toLowerCase().includes(studentSearch.toLowerCase()))
    .slice(0, 30)

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-900">Agenda</h1>
          <p className="mt-1 text-sm text-gray-500">
            {loading ? 'Carregando...' : `${bookings.length} aulas, ${confirmedCount} confirmadas`}
          </p>
        </div>
        <button
          onClick={() => { setForm((f) => ({ ...f, date: dateStr })); setShowNewBooking(true) }}
          className="flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700"
        >
          <Plus className="h-4 w-4" /> Novo Agendamento
        </button>
      </div>

      {/* Date nav */}
      <div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white p-4">
        <div className="flex items-center gap-3">
          <button onClick={prevDay} className="rounded-lg p-2 hover:bg-gray-100">
            <ChevronLeft className="h-5 w-5 text-gray-600" />
          </button>
          <div>
            <div className="font-display text-lg font-bold text-gray-900">
              {DAYS_PT[currentDate.getDay()]}, {currentDate.getDate()} de {MONTHS_PT[currentDate.getMonth()]} de {currentDate.getFullYear()}
            </div>
          </div>
          <button onClick={nextDay} className="rounded-lg p-2 hover:bg-gray-100">
            <ChevronRight className="h-5 w-5 text-gray-600" />
          </button>
        </div>
        <button onClick={() => setCurrentDate(new Date())}
          className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50">
          Hoje
        </button>
      </div>

      {/* Timeline */}
      <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {HOURS.map((hour) => {
              const slotBookings = bookingsByHour[hour] || []
              return (
                <div key={hour} className={cn('flex min-h-[72px] transition-colors', slotBookings.length > 0 ? 'bg-white' : 'bg-gray-50/50')}>
                  <div className="flex w-20 shrink-0 items-start justify-end border-r border-gray-100 pr-3 pt-3">
                    <span className="text-xs font-medium text-gray-400">{hour}</span>
                  </div>
                  <div className="flex-1 p-2">
                    {slotBookings.length > 0 ? (
                      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                        {slotBookings.map((b) => (
                          <button key={b.id} onClick={() => setSelectedBooking(b)}
                            className="w-full text-left rounded-lg border-l-[3px] bg-white px-3 py-2 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all"
                            style={{ borderLeftColor: b.service.color }}>
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-gray-900">
                                {new Date(b.startsAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} –{' '}
                                {new Date(b.endsAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                              </span>
                              {b.source === 'WHATSAPP' && <span className="rounded-full bg-green-100 px-1.5 py-0.5 text-[9px] font-bold text-green-700">WA</span>}
                            </div>
                            <div className="mt-1 text-sm font-medium text-gray-800 truncate">{b.student.fullName}</div>
                            <div className="text-xs text-gray-500 truncate">{b.service.name} • {b.trainer.fullName}</div>
                          </button>
                        ))}
                      </div>
                    ) : null}
                    <button onClick={() => { setForm((f) => ({ ...f, date: dateStr, hour, prescriptionId: '' })); setShowNewBooking(true) }}
                      className="flex items-center gap-1 rounded-lg border border-dashed border-gray-200 px-3 py-1 text-xs text-gray-400 hover:border-brand-300 hover:text-brand-500 hover:bg-brand-50/50 transition-all mt-1">
                      <Plus className="h-3 w-3" /> Agendar
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
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
                  {selectedBooking.student.fullName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="font-medium text-gray-900">{selectedBooking.student.fullName}</div>
                  <div className="text-sm text-gray-500">{selectedBooking.service.name}</div>
                </div>
              </div>
              <div className="rounded-xl bg-gray-50 p-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Horario</span>
                  <span className="font-medium">
                    {new Date(selectedBooking.startsAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} –{' '}
                    {new Date(selectedBooking.endsAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Profissional</span>
                  <span className="font-medium">{selectedBooking.trainer.fullName}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Status</span>
                  <span className={cn('rounded-full px-2 py-0.5 text-xs font-semibold border', STATUS_CONFIG[selectedBooking.status]?.color)}>
                    {STATUS_CONFIG[selectedBooking.status]?.label || selectedBooking.status}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Origem</span>
                  <span className="font-medium">{selectedBooking.source === 'WHATSAPP' ? 'WhatsApp' : selectedBooking.source === 'WEB' ? 'App' : 'Manual'}</span>
                </div>
                {selectedBooking.notes && (
                  <div className="pt-2 border-t border-gray-200">
                    <span className="text-xs text-gray-500">Observacoes</span>
                    <p className="text-sm text-gray-700 mt-1 whitespace-pre-wrap">{selectedBooking.notes}</p>
                  </div>
                )}
              </div>
            </div>
            <div className="mt-6 grid grid-cols-2 gap-3">
              {selectedBooking.status !== 'CANCELLED' && selectedBooking.status !== 'COMPLETED' && (
                <button
                  onClick={() => cancelBooking(selectedBooking.id)}
                  disabled={cancelling}
                  className="flex items-center justify-center gap-1 rounded-xl border border-red-300 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-60"
                >
                  {cancelling ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Cancelar'}
                </button>
              )}
              {!selectedBooking.checkin && selectedBooking.status !== 'CANCELLED' && (
                <button onClick={() => { setSelectedBooking(null); window.location.href = '/checkin' }}
                  className="flex items-center justify-center gap-1 rounded-xl bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-700 col-span-1">
                  <CheckCircle2 className="h-4 w-4" /> Check-in
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* New booking modal */}
      {showNewBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-display text-lg font-bold text-gray-900">Novo Agendamento</h3>
              <button onClick={() => setShowNewBooking(false)} className="rounded-lg p-1 hover:bg-gray-100">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <form onSubmit={createBooking} className="space-y-4">
              {/* Student search */}
              <div className="relative" ref={dropdownRef}>
                <label className="block text-sm font-medium text-gray-700">Aluno *</label>
                <input
                  type="text"
                  placeholder="Buscar aluno por nome..."
                  value={studentSearch}
                  onChange={(e) => {
                    setStudentSearch(e.target.value)
                    setShowStudentDropdown(true)
                    if (form.studentId) setForm(p => ({ ...p, studentId: '' }))
                  }}
                  onFocus={() => setShowStudentDropdown(true)}
                  className={cn(
                    "mt-1 w-full rounded-xl border px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-100",
                    form.studentId ? "border-green-400 bg-green-50/50 focus:border-green-500" : "border-gray-300 focus:border-brand-500"
                  )}
                />
                {form.studentId && (
                  <span className="absolute right-3 top-[38px] text-green-600 text-xs font-semibold">✓</span>
                )}
                {showStudentDropdown && !form.studentId && (
                  <div className="absolute z-50 mt-1 w-full max-h-48 overflow-y-auto rounded-xl border border-gray-200 bg-white shadow-lg">
                    {filteredStudents.length > 0 ? filteredStudents.map(s => (
                      <button key={s.id} type="button"
                        onClick={() => {
                          setForm(p => ({ ...p, studentId: s.id }))
                          setStudentSearch(s.fullName)
                          setShowStudentDropdown(false)
                          loadActivePrescription(s.id)
                        }}
                        className="w-full text-left px-4 py-2.5 text-sm hover:bg-brand-50 border-b border-gray-50 last:border-0"
                      >
                        {s.fullName}
                      </button>
                    )) : (
                      <div className="px-4 py-3 text-sm text-gray-400">Nenhum aluno encontrado</div>
                    )}
                    {students.length > 30 && filteredStudents.length > 0 && studentSearch && (
                      <div className="px-4 py-2 text-xs text-gray-400 border-t">
                        Mostrando {filteredStudents.length} de {students.filter(s => s.fullName.toLowerCase().includes(studentSearch.toLowerCase())).length} resultados
                      </div>
                    )}
                  </div>
                )}
                <input type="hidden" value={form.studentId} />
              </div>

              {/* Service */}
              <div>
                <label className="block text-sm font-medium text-gray-700">Servico *</label>
                <select required value={form.serviceId} onChange={(e) => setForm((p) => ({ ...p, serviceId: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100">
                  <option value="">Selecionar servico...</option>
                  {services.map((s) => <option key={s.id} value={s.id}>{s.name} ({s.durationMinutes}min — R$ {s.price})</option>)}
                </select>
              </div>

              {/* Professional - preenchido com professor logado */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Profissional *</label>
                <div className="mt-1 w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 px-4 py-3 text-sm text-gray-700 dark:text-gray-300">
                  {myProfile?.fullName || 'Você'} (responsável)
                </div>
              </div>

              {/* Date & Time */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Data *</label>
                  <input type="date" required value={form.date}
                    onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Horario *</label>
                  <select value={form.hour} onChange={(e) => setForm((p) => ({ ...p, hour: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100">
                    {HOURS.map((h) => <option key={h}>{h}</option>)}
                  </select>
                </div>
              </div>

              {/* Prescription - auto-loaded from active */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Prescricao de Treino</label>
                {activePrescription ? (
                  <div className="mt-1 rounded-xl border border-brand-200 dark:border-brand-800 bg-brand-50 dark:bg-brand-900/20 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-brand-700 dark:text-brand-400">{activePrescription.code}</span>
                      <span className="text-[10px] text-brand-600 dark:text-brand-400">Prescrição ativa — Laura usará esta</span>
                    </div>
                    {activePrescription.name && <div className="text-sm text-gray-700 dark:text-gray-300">{activePrescription.name}</div>}
                    <div className="flex items-center gap-2">
                      <div className="flex-1 rounded-full bg-gray-200 dark:bg-gray-700 h-2">
                        <div className="rounded-full bg-brand-600 h-2 transition-all" style={{ width: `${Math.min(100, (activePrescription.usedSessions / activePrescription.totalSessions) * 100)}%` }} />
                      </div>
                      <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">{activePrescription.usedSessions}/{activePrescription.totalSessions} treinos</span>
                    </div>
                  </div>
                ) : form.studentId ? (
                  <div className="mt-1 rounded-xl border border-dashed border-gray-300 dark:border-gray-600 p-3 text-center">
                    <p className="text-xs text-gray-400 dark:text-gray-500">Nenhuma prescrição ativa para este aluno</p>
                  </div>
                ) : null}
                <textarea rows={2} value={form.prescriptionText} placeholder="Notas adicionais sobre a prescrição..."
                  onChange={(e) => setForm((p) => ({ ...p, prescriptionText: e.target.value }))}
                  className="mt-2 w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-white focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 resize-none" />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700">Observacoes</label>
                <textarea rows={2} value={form.notes} placeholder="Notas sobre a sessao..."
                  onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 resize-none" />
              </div>

              {/* Submit */}
              <div className="flex gap-3">
                <button type="button" onClick={() => setShowNewBooking(false)}
                  className="flex-1 rounded-xl border border-gray-300 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50">
                  Cancelar
                </button>
                <button type="submit" disabled={saving || !form.studentId}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><CheckCircle2 className="h-4 w-4" /> Agendar</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
