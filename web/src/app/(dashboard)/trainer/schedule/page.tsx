'use client'

import { useState, useEffect } from 'react'
import {
  Calendar, Users, Clock, ChevronLeft, ChevronRight,
  X, Loader2, CheckCircle2, AlertCircle, Save,
  FileText, Activity, Dumbbell, Heart, Plus,
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
  service: { name: string; color: string; durationMinutes: number }
  student: { id: string; fullName: string; avatarUrl: string | null }
  trainer: { id: string; fullName: string }
  checkin: { id: string; checkedInAt: string } | null
}

interface StudentDetail {
  student: {
    id: string; fullName: string; email: string; phone: string | null
    healthNotes: string | null; emergencyContact: string | null
    birthDate: string | null; avatarUrl: string | null; isActive: boolean
  }
  activePrescription: {
    id: string; code: string; name: string | null; totalSessions: number
    usedSessions: number; startDate: string; createdAt: string
  } | null
  prescriptionHistory: {
    id: string; code: string; name: string | null; totalSessions: number
    usedSessions: number; isActive: boolean; startDate: string
    completedAt: string | null; createdAt: string
    trainer: { id: string; fullName: string }
  }[]
  recentBookings: {
    id: string; startsAt: string; endsAt: string; status: string
    source: string; notes: string | null
    service: { name: string; color: string }
    trainer: { id: string; fullName: string }
    checkin: { id: string; checkedInAt: string } | null
  }[]
  stats: { totalCheckins: number; recentCheckins30d: number; memberSince: string }
}

const HOURS = Array.from({ length: 17 }, (_, i) => `${(i + 6).toString().padStart(2, '0')}:00`)
const DAYS_PT = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab']
const MONTHS_PT = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez']
const STATUS_MAP: Record<string, { label: string; color: string }> = {
  PENDING: { label: 'Pendente', color: 'bg-amber-100 text-amber-700' },
  CONFIRMED: { label: 'Confirmado', color: 'bg-blue-100 text-blue-700' },
  COMPLETED: { label: 'Concluído', color: 'bg-green-100 text-green-700' },
  CANCELLED: { label: 'Cancelado', color: 'bg-red-100 text-red-700' },
  NO_SHOW: { label: 'Faltou', color: 'bg-gray-100 text-gray-600' },
}

export default function TrainerSchedulePage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [bookings, setBookings] = useState<Booking[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedStudent, setSelectedStudent] = useState<StudentDetail | null>(null)
  const [loadingStudent, setLoadingStudent] = useState(false)
  const [editHealthNotes, setEditHealthNotes] = useState('')
  const [editPrescName, setEditPrescName] = useState('')
  const [editPrescSessions, setEditPrescSessions] = useState('')
  const [saving, setSaving] = useState(false)
  const [showNewPrescription, setShowNewPrescription] = useState(false)
  const [newPrescName, setNewPrescName] = useState('')
  const [newPrescSessions, setNewPrescSessions] = useState('')

  const dateStr = currentDate.toISOString().split('T')[0]

  useEffect(() => { loadBookings() }, [dateStr])

  async function loadBookings() {
    setLoading(true)
    try {
      const res = await fetch(`/api/bookings?date=${dateStr}`)
      if (res.ok) setBookings(await res.json())
    } catch { toast.error('Erro ao carregar agenda') }
    finally { setLoading(false) }
  }

  async function loadStudentDetail(studentId: string) {
    setLoadingStudent(true)
    try {
      const res = await fetch(`/api/trainer/student-detail?studentId=${studentId}`)
      if (res.ok) {
        const data = await res.json()
        setSelectedStudent(data)
        setEditHealthNotes(data.student.healthNotes || '')
        if (data.activePrescription) {
          setEditPrescName(data.activePrescription.name || '')
          setEditPrescSessions(String(data.activePrescription.totalSessions))
        } else {
          setEditPrescName('')
          setEditPrescSessions('')
        }
      } else {
        toast.error('Erro ao carregar dados do aluno')
      }
    } catch { toast.error('Erro de conexão') }
    finally { setLoadingStudent(false) }
  }

  async function saveHealthNotes() {
    if (!selectedStudent) return
    setSaving(true)
    try {
      const res = await fetch(`/api/trainer/student-detail/${selectedStudent.student.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId: selectedStudent.student.id, healthNotes: editHealthNotes }),
      })
      if (res.ok) {
        toast.success('Observações salvas')
        setSelectedStudent(s => s ? { ...s, student: { ...s.student, healthNotes: editHealthNotes } } : s)
      } else { toast.error('Erro ao salvar') }
    } catch { toast.error('Erro de conexão') }
    finally { setSaving(false) }
  }

  async function savePrescription() {
    if (!selectedStudent?.activePrescription) return
    setSaving(true)
    try {
      const res = await fetch(`/api/trainer/student-detail/${selectedStudent.student.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: selectedStudent.student.id,
          prescriptionId: selectedStudent.activePrescription.id,
          prescriptionName: editPrescName,
          prescriptionTotalSessions: parseInt(editPrescSessions) || undefined,
        }),
      })
      if (res.ok) {
        toast.success('Prescrição atualizada')
        loadStudentDetail(selectedStudent.student.id)
      } else { toast.error('Erro ao salvar') }
    } catch { toast.error('Erro de conexão') }
    finally { setSaving(false) }
  }

  async function createNewPrescription() {
    if (!selectedStudent || !newPrescSessions) return
    setSaving(true)
    try {
      const res = await fetch(`/api/trainer/student-detail/${selectedStudent.student.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          studentId: selectedStudent.student.id,
          name: newPrescName || null,
          totalSessions: parseInt(newPrescSessions),
        }),
      })
      if (res.ok) {
        toast.success('Nova prescrição criada')
        setShowNewPrescription(false)
        setNewPrescName('')
        setNewPrescSessions('')
        loadStudentDetail(selectedStudent.student.id)
      } else { toast.error('Erro ao criar prescrição') }
    } catch { toast.error('Erro de conexão') }
    finally { setSaving(false) }
  }

  const bookingsByHour = HOURS.reduce<Record<string, Booking[]>>((acc, h) => {
    acc[h] = bookings.filter(b => {
      const bh = new Date(b.startsAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      return bh === h
    })
    return acc
  }, {})

  const confirmedCount = bookings.filter(b => b.status === 'CONFIRMED' || b.status === 'COMPLETED').length

  function daysSince(date: string) {
    const d = new Date(date)
    const now = new Date()
    return Math.floor((now.getTime() - d.getTime()) / 86400000)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-900">Meus Agendamentos</h1>
          <p className="mt-1 text-sm text-gray-500">
            {loading ? 'Carregando...' : `${bookings.length} aulas hoje, ${confirmedCount} confirmadas`}
          </p>
        </div>
      </div>

      {/* Date nav */}
      <div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white p-4">
        <div className="flex items-center gap-3">
          <button onClick={() => setCurrentDate(new Date(currentDate.getTime() - 86400000))} className="rounded-lg p-2 hover:bg-gray-100">
            <ChevronLeft className="h-5 w-5 text-gray-600" />
          </button>
          <div className="font-display text-lg font-bold text-gray-900">
            {DAYS_PT[currentDate.getDay()]}, {currentDate.getDate()} de {MONTHS_PT[currentDate.getMonth()]}
          </div>
          <button onClick={() => setCurrentDate(new Date(currentDate.getTime() + 86400000))} className="rounded-lg p-2 hover:bg-gray-100">
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
          <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-brand-600" /></div>
        ) : (
          <div className="divide-y divide-gray-100">
            {HOURS.map(hour => {
              const slot = bookingsByHour[hour] || []
              if (slot.length === 0) return null
              return (
                <div key={hour} className="flex">
                  <div className="flex w-20 shrink-0 items-start justify-end border-r border-gray-100 pr-3 pt-3">
                    <span className="text-xs font-medium text-gray-400">{hour}</span>
                  </div>
                  <div className="flex-1 p-2 space-y-2">
                    {slot.map(b => (
                      <button key={b.id}
                        onClick={() => loadStudentDetail(b.student.id)}
                        className="w-full text-left rounded-xl border border-gray-100 bg-white p-3 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
                              {b.student.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div className="text-sm font-semibold text-gray-900">{b.student.fullName}</div>
                              <div className="text-xs text-gray-500">{b.service.name} • {new Date(b.startsAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} - {new Date(b.endsAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {b.checkin ? (
                              <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-700">CHECK-IN</span>
                            ) : (
                              <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold', STATUS_MAP[b.status]?.color)}>
                                {STATUS_MAP[b.status]?.label || b.status}
                              </span>
                            )}
                            {b.source === 'WHATSAPP' && <span className="rounded-full bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold text-emerald-600">WA</span>}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Student detail panel */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl my-8">
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white rounded-t-2xl px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700">
                  {selectedStudent.student.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h2 className="font-display text-lg font-bold text-gray-900">{selectedStudent.student.fullName}</h2>
                  <p className="text-xs text-gray-500">
                    Membro há {daysSince(selectedStudent.stats.memberSince)} dias • {selectedStudent.stats.totalCheckins} check-ins total • {selectedStudent.stats.recentCheckins30d} nos últimos 30 dias
                  </p>
                </div>
              </div>
              <button onClick={() => setSelectedStudent(null)} className="rounded-lg p-2 hover:bg-gray-100">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            {loadingStudent ? (
              <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-brand-600" /></div>
            ) : (
              <div className="p-6 space-y-6">
                {/* Active Prescription */}
                <section>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                      <Dumbbell className="h-4 w-4 text-brand-600" /> Prescrição Ativa
                    </h3>
                    {selectedStudent.activePrescription && (
                      <button onClick={() => savePrescription()} disabled={saving}
                        className="flex items-center gap-1 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-60">
                        <Save className="h-3 w-3" /> Salvar
                      </button>
                    )}
                  </div>

                  {selectedStudent.activePrescription ? (
                    <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-bold text-brand-700">
                          {selectedStudent.activePrescription.code}
                        </span>
                        <span className="text-xs text-gray-500">
                          Há {daysSince(selectedStudent.activePrescription.startDate)} dias
                        </span>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Nome da prescrição</label>
                        <input type="text" value={editPrescName}
                          onChange={e => setEditPrescName(e.target.value)}
                          placeholder="Ex: Treino A - Hipertrofia"
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100" />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-500 mb-1">Total de sessões</label>
                          <input type="number" value={editPrescSessions}
                            onChange={e => setEditPrescSessions(e.target.value)}
                            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100" />
                        </div>
                        <div className="flex flex-col justify-end">
                          <div className="text-xs text-gray-500">Progresso</div>
                          <div className="mt-1 flex items-center gap-2">
                            <div className="flex-1 rounded-full bg-gray-200 h-2">
                              <div className="rounded-full bg-brand-600 h-2 transition-all"
                                style={{ width: `${Math.min(100, (selectedStudent.activePrescription.usedSessions / selectedStudent.activePrescription.totalSessions) * 100)}%` }} />
                            </div>
                            <span className="text-xs font-semibold text-gray-700">
                              {selectedStudent.activePrescription.usedSessions}/{selectedStudent.activePrescription.totalSessions}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-gray-300 p-4 text-center">
                      <p className="text-sm text-gray-400 mb-2">Nenhuma prescrição ativa</p>
                      <button onClick={() => setShowNewPrescription(true)}
                        className="flex items-center gap-1 mx-auto rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700">
                        <Plus className="h-3 w-3" /> Criar Prescrição
                      </button>
                    </div>
                  )}

                  {showNewPrescription && (
                    <div className="mt-3 rounded-xl border border-brand-200 bg-brand-50/50 p-4 space-y-3">
                      <h4 className="text-sm font-semibold text-brand-700">Nova Prescrição</h4>
                      <input type="text" value={newPrescName} onChange={e => setNewPrescName(e.target.value)}
                        placeholder="Nome (ex: Treino B - Resistência)"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none" />
                      <input type="number" value={newPrescSessions} onChange={e => setNewPrescSessions(e.target.value)}
                        placeholder="Total de sessões *" min="1"
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none" />
                      <div className="flex gap-2">
                        <button onClick={() => setShowNewPrescription(false)} className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50">Cancelar</button>
                        <button onClick={createNewPrescription} disabled={saving || !newPrescSessions} className="flex-1 rounded-lg bg-brand-600 px-3 py-2 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-60">
                          {saving ? <Loader2 className="h-3 w-3 animate-spin mx-auto" /> : 'Criar'}
                        </button>
                      </div>
                    </div>
                  )}
                </section>

                {/* Health Notes / Observations */}
                <section>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                      <Heart className="h-4 w-4 text-red-500" /> Observações do Aluno
                    </h3>
                    <button onClick={saveHealthNotes} disabled={saving}
                      className="flex items-center gap-1 rounded-lg bg-gray-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-gray-800 disabled:opacity-60">
                      <Save className="h-3 w-3" /> Salvar
                    </button>
                  </div>
                  <textarea rows={3} value={editHealthNotes}
                    onChange={e => setEditHealthNotes(e.target.value)}
                    placeholder="Limitações físicas, problemas de saúde, alergias, observações gerais..."
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 resize-none" />
                </section>

                {/* Recent bookings / History */}
                <section>
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                    <Activity className="h-4 w-4 text-blue-500" /> Histórico de Treinos
                  </h3>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {selectedStudent.recentBookings.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-4">Nenhum treino registrado</p>
                    ) : selectedStudent.recentBookings.map(b => (
                      <div key={b.id} className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2.5">
                        <div className="flex items-center gap-3">
                          <div className={cn('h-2 w-2 rounded-full',
                            b.checkin ? 'bg-green-500' : b.status === 'CANCELLED' ? 'bg-red-400' : 'bg-gray-300'
                          )} />
                          <div>
                            <div className="text-sm font-medium text-gray-800">{b.service.name}</div>
                            <div className="text-xs text-gray-400">
                              {new Date(b.startsAt).toLocaleDateString('pt-BR')} • {new Date(b.startsAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {b.checkin ? (
                            <span className="text-[10px] font-semibold text-green-600">✓ Presente</span>
                          ) : b.status === 'CANCELLED' ? (
                            <span className="text-[10px] font-semibold text-red-500">Cancelado</span>
                          ) : (
                            <span className={cn('rounded-full px-1.5 py-0.5 text-[10px] font-semibold', STATUS_MAP[b.status]?.color)}>
                              {STATUS_MAP[b.status]?.label}
                            </span>
                          )}
                          {b.trainer.fullName && <span className="text-[10px] text-gray-400">com {b.trainer.fullName}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Prescription history */}
                {selectedStudent.prescriptionHistory.length > 0 && (
                  <section>
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
                      <FileText className="h-4 w-4 text-purple-500" /> Histórico de Prescrições
                    </h3>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {selectedStudent.prescriptionHistory.map(p => (
                        <div key={p.id} className={cn('rounded-lg border px-3 py-2.5', p.isActive ? 'border-brand-200 bg-brand-50/50' : 'border-gray-100')}>
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="text-xs font-bold text-gray-700">{p.code}</span>
                              {p.name && <span className="text-xs text-gray-500"> — {p.name}</span>}
                            </div>
                            <div className="flex items-center gap-2">
                              {p.isActive ? (
                                <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-700">ATIVA</span>
                              ) : (
                                <span className="text-[10px] text-gray-400">Concluída</span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                            <span>{p.usedSessions}/{p.totalSessions} sessões</span>
                            <span>•</span>
                            <span>{p.trainer.fullName}</span>
                            <span>•</span>
                            <span>{new Date(p.startDate).toLocaleDateString('pt-BR')}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
