'use client'

import { useState, useEffect } from 'react'
import {
  Calendar, ChevronLeft, ChevronRight, X, Loader2, CheckCircle2,
  Save, Dumbbell, Heart, Activity, FileText, Plus, Clock, Users,
  TrendingUp, AlertCircle, User,
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
  student: { id: string; fullName: string }
  trainer: { id: string; fullName: string }
  checkin: { id: string; checkedInAt: string } | null
}

interface StudentDetail {
  student: {
    id: string; fullName: string; email: string; phone: string | null
    healthNotes: string | null; isActive: boolean; source: string | null
    createdAt: string
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

function formatDate(d: string) { return new Date(d).toLocaleDateString('pt-BR') }
function formatTime(d: string) { return new Date(d).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) }
function daysSince(d: string) { return Math.floor((Date.now() - new Date(d).getTime()) / 86400000) }

export default function TrainerSchedulePage() {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [bookings, setBookings] = useState<Booking[]>([])
  const [myProfile, setMyProfile] = useState<{ id: string; fullName: string } | null>(null)
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

  useEffect(() => { loadProfile() }, [])
  useEffect(() => { if (myProfile) loadBookings() }, [dateStr, myProfile])

  async function loadProfile() {
    try {
      const res = await fetch('/api/profile')
      if (res.ok) setMyProfile(await res.json())
    } catch {}
  }

  async function loadBookings() {
    setLoading(true)
    try {
      const res = await fetch(`/api/bookings?date=${dateStr}`)
      if (res.ok) {
        const all = await res.json()
        // Filter to only this trainer's bookings
        setBookings(all.filter((b: Booking) => b.trainer?.id === myProfile?.id))
      }
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
        } else { setEditPrescName(''); setEditPrescSessions('') }
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
      }
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
      if (res.ok) { toast.success('Prescrição atualizada'); loadStudentDetail(selectedStudent.student.id) }
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
        body: JSON.stringify({ studentId: selectedStudent.student.id, name: newPrescName || null, totalSessions: parseInt(newPrescSessions) }),
      })
      if (res.ok) {
        toast.success('Nova prescrição criada')
        setShowNewPrescription(false); setNewPrescName(''); setNewPrescSessions('')
        loadStudentDetail(selectedStudent.student.id)
      }
    } catch { toast.error('Erro de conexão') }
    finally { setSaving(false) }
  }

  const bookingsByHour = HOURS.reduce<Record<string, Booking[]>>((acc, h) => {
    acc[h] = bookings.filter(b => formatTime(b.startsAt) === h)
    return acc
  }, {})

  const todayBookings = bookings.filter(b => b.status === 'CONFIRMED' || b.status === 'PENDING').length
  const todayCheckins = bookings.filter(b => b.checkin).length

  function getSourceLabel(source: string | null) {
    if (!source) return 'Direto'
    if (source === 'wellhub') return 'Wellhub'
    if (source === 'totalpass') return 'TotalPass'
    return source
  }

  // Calculate attendance regularity
  function getRegularity(bookings: StudentDetail['recentBookings']) {
    if (bookings.length === 0) return { rate: 0, label: 'Sem dados', color: 'text-gray-400' }
    const completed = bookings.filter(b => b.checkin || b.status === 'COMPLETED').length
    const cancelled = bookings.filter(b => b.status === 'CANCELLED').length
    const total = bookings.length - cancelled
    if (total === 0) return { rate: 0, label: 'Sem dados', color: 'text-gray-400' }
    const rate = Math.round((completed / total) * 100)
    if (rate >= 80) return { rate, label: 'Regular', color: 'text-green-600' }
    if (rate >= 60) return { rate, label: 'Irregular', color: 'text-amber-600' }
    return { rate, label: 'Pouco frequente', color: 'text-red-500' }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-white">Meus Agendamentos</h1>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {loading ? 'Carregando...' : `${todayBookings} aulas hoje • ${todayCheckins} check-ins realizados`}
        </p>
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { icon: Calendar, value: todayBookings, label: 'Agendadas' },
          { icon: CheckCircle2, value: todayCheckins, label: 'Check-ins' },
          { icon: Users, value: bookings.length, label: 'Total hoje' },
        ].map(s => (
          <div key={s.label} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
            <s.icon className="h-5 w-5 text-brand-600 mb-2" />
            <div className="text-2xl font-bold text-gray-900 dark:text-white">{s.value}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Date nav */}
      <div className="flex items-center justify-between rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-4">
        <div className="flex items-center gap-3">
          <button onClick={() => setCurrentDate(new Date(currentDate.getTime() - 86400000))} className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-800">
            <ChevronLeft className="h-5 w-5 text-gray-600 dark:text-gray-300" />
          </button>
          <div className="font-display text-lg font-bold text-gray-900 dark:text-white">
            {DAYS_PT[currentDate.getDay()]}, {currentDate.getDate()} de {MONTHS_PT[currentDate.getMonth()]}
          </div>
          <button onClick={() => setCurrentDate(new Date(currentDate.getTime() + 86400000))} className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-800">
            <ChevronRight className="h-5 w-5 text-gray-600 dark:text-gray-300" />
          </button>
        </div>
        <button onClick={() => setCurrentDate(new Date())} className="rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
          Hoje
        </button>
      </div>

      {/* Timeline */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-brand-600" /></div>
        ) : bookings.length === 0 ? (
          <div className="py-16 text-center text-gray-400 dark:text-gray-500">Nenhum agendamento seu para este dia</div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-gray-800">
            {HOURS.filter(h => (bookingsByHour[h] || []).length > 0).map(hour => (
              <div key={hour} className="flex">
                <div className="flex w-20 shrink-0 items-start justify-end border-r border-gray-100 dark:border-gray-800 pr-3 pt-3">
                  <span className="text-xs font-medium text-gray-400 dark:text-gray-500">{hour}</span>
                </div>
                <div className="flex-1 p-2 space-y-2">
                  {bookingsByHour[hour].map(b => (
                    <button key={b.id} onClick={() => loadStudentDetail(b.student.id)}
                      className="w-full text-left rounded-xl border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800/50 p-3 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-900/30 text-xs font-bold text-brand-700 dark:text-brand-300">
                            {b.student.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="text-sm font-semibold text-gray-900 dark:text-white">{b.student.fullName}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">{b.service.name} • {formatTime(b.startsAt)} - {formatTime(b.endsAt)}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {b.checkin ? (
                            <span className="rounded-full bg-green-100 dark:bg-green-900/30 px-2 py-0.5 text-[10px] font-bold text-green-700 dark:text-green-400">✓ CHECK-IN</span>
                          ) : (
                            <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold',
                              b.status === 'CONFIRMED' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' :
                              b.status === 'PENDING' ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400' :
                              'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                            )}>{b.status === 'CONFIRMED' ? 'Confirmado' : b.status === 'PENDING' ? 'Pendente' : b.status}</span>
                          )}
                          {b.source === 'WHATSAPP' && <span className="rounded-full bg-emerald-50 dark:bg-emerald-900/30 px-1.5 py-0.5 text-[9px] font-bold text-emerald-600 dark:text-emerald-400">WA</span>}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Student detail panel */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-2xl rounded-2xl bg-white dark:bg-gray-900 shadow-2xl my-8 border border-gray-200 dark:border-gray-700">
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 rounded-t-2xl px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-900/30 text-sm font-bold text-brand-700 dark:text-brand-300">
                  {selectedStudent.student.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h2 className="font-display text-lg font-bold text-gray-900 dark:text-white">{selectedStudent.student.fullName}</h2>
                  <div className="flex flex-wrap items-center gap-2 mt-0.5">
                    <span className="text-xs text-gray-500 dark:text-gray-400">Membro há {daysSince(selectedStudent.stats.memberSince)} dias</span>
                    <span className="text-gray-300 dark:text-gray-600">•</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">{selectedStudent.stats.totalCheckins} check-ins total</span>
                    <span className="text-gray-300 dark:text-gray-600">•</span>
                    <span className={cn('text-xs font-semibold', getRegularity(selectedStudent.recentBookings).color)}>
                      {getRegularity(selectedStudent.recentBookings).label} ({getRegularity(selectedStudent.recentBookings).rate}%)
                    </span>
                    {selectedStudent.student.source && selectedStudent.student.source !== 'direct' && (
                      <>
                        <span className="text-gray-300 dark:text-gray-600">•</span>
                        <span className="rounded-full bg-purple-100 dark:bg-purple-900/30 px-2 py-0.5 text-[10px] font-bold text-purple-700 dark:text-purple-400">
                          {getSourceLabel(selectedStudent.student.source)}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>
              <button onClick={() => setSelectedStudent(null)} className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-800">
                <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            {loadingStudent ? (
              <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-brand-600" /></div>
            ) : (
              <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                {/* Attendance summary */}
                <div className="grid grid-cols-4 gap-3">
                  <div className="rounded-xl bg-blue-50 dark:bg-blue-900/20 p-3 text-center">
                    <div className="text-lg font-bold text-blue-700 dark:text-blue-400">{selectedStudent.stats.totalCheckins}</div>
                    <div className="text-[10px] text-blue-600 dark:text-blue-500">Total check-ins</div>
                  </div>
                  <div className="rounded-xl bg-green-50 dark:bg-green-900/20 p-3 text-center">
                    <div className="text-lg font-bold text-green-700 dark:text-green-400">{selectedStudent.stats.recentCheckins30d}</div>
                    <div className="text-[10px] text-green-600 dark:text-green-500">Últimos 30 dias</div>
                  </div>
                  <div className="rounded-xl bg-amber-50 dark:bg-amber-900/20 p-3 text-center">
                    <div className="text-lg font-bold text-amber-700 dark:text-amber-400">{getRegularity(selectedStudent.recentBookings).rate}%</div>
                    <div className="text-[10px] text-amber-600 dark:text-amber-500">Presença</div>
                  </div>
                  <div className="rounded-xl bg-purple-50 dark:bg-purple-900/20 p-3 text-center">
                    <div className="text-lg font-bold text-purple-700 dark:text-purple-400">{daysSince(selectedStudent.stats.memberSince)}</div>
                    <div className="text-[10px] text-purple-600 dark:text-purple-500">Dias membro</div>
                  </div>
                </div>

                {/* Active Prescription */}
                <section>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                      <Dumbbell className="h-4 w-4 text-brand-600" /> Prescrição Ativa
                    </h3>
                    {selectedStudent.activePrescription && (
                      <button onClick={savePrescription} disabled={saving}
                        className="flex items-center gap-1 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-60">
                        <Save className="h-3 w-3" /> Salvar
                      </button>
                    )}
                  </div>

                  {selectedStudent.activePrescription ? (
                    <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-4 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="rounded-full bg-brand-100 dark:bg-brand-900/30 px-2.5 py-0.5 text-xs font-bold text-brand-700 dark:text-brand-300">
                          {selectedStudent.activePrescription.code}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          Há {daysSince(selectedStudent.activePrescription.startDate)} dias
                        </span>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Nome da prescrição</label>
                        <input type="text" value={editPrescName} onChange={e => setEditPrescName(e.target.value)}
                          placeholder="Ex: Treino A - Hipertrofia"
                          className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100" />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Total de sessões</label>
                          <input type="number" value={editPrescSessions} onChange={e => setEditPrescSessions(e.target.value)}
                            className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100" />
                        </div>
                        <div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">Progresso</div>
                          <div className="mt-1 flex items-center gap-2">
                            <div className="flex-1 rounded-full bg-gray-200 dark:bg-gray-700 h-2.5">
                              <div className="rounded-full bg-brand-600 h-2.5 transition-all"
                                style={{ width: `${Math.min(100, (selectedStudent.activePrescription.usedSessions / selectedStudent.activePrescription.totalSessions) * 100)}%` }} />
                            </div>
                            <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                              {selectedStudent.activePrescription.usedSessions}/{selectedStudent.activePrescription.totalSessions}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-600 p-4 text-center">
                      <p className="text-sm text-gray-400 dark:text-gray-500 mb-2">Nenhuma prescrição ativa</p>
                      <button onClick={() => setShowNewPrescription(true)}
                        className="inline-flex items-center gap-1 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700">
                        <Plus className="h-3 w-3" /> Criar Prescrição
                      </button>
                    </div>
                  )}

                  {showNewPrescription && (
                    <div className="mt-3 rounded-xl border border-brand-200 dark:border-brand-800 bg-brand-50 dark:bg-brand-900/20 p-4 space-y-3">
                      <h4 className="text-sm font-semibold text-brand-700 dark:text-brand-400">Nova Prescrição</h4>
                      <input type="text" value={newPrescName} onChange={e => setNewPrescName(e.target.value)}
                        placeholder="Nome (ex: Treino B - Resistência)"
                        className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:border-brand-500 focus:outline-none" />
                      <input type="number" value={newPrescSessions} onChange={e => setNewPrescSessions(e.target.value)}
                        placeholder="Total de sessões *" min="1"
                        className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:border-brand-500 focus:outline-none" />
                      <div className="flex gap-2">
                        <button onClick={() => setShowNewPrescription(false)} className="flex-1 rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">Cancelar</button>
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
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300">
                      <Heart className="h-4 w-4 text-red-500" /> Observações do Aluno
                    </h3>
                    <button onClick={saveHealthNotes} disabled={saving}
                      className="flex items-center gap-1 rounded-lg bg-gray-700 dark:bg-gray-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-gray-800 dark:hover:bg-gray-500 disabled:opacity-60">
                      <Save className="h-3 w-3" /> Salvar
                    </button>
                  </div>
                  <textarea rows={3} value={editHealthNotes}
                    onChange={e => setEditHealthNotes(e.target.value)}
                    placeholder="Limitações físicas, problemas de saúde, alergias, observações gerais..."
                    className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-white focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 resize-none" />
                </section>

                {/* Recent bookings / History */}
                <section>
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                    <Activity className="h-4 w-4 text-blue-500" /> Histórico de Presença
                  </h3>
                  <div className="space-y-2 max-h-56 overflow-y-auto">
                    {selectedStudent.recentBookings.length === 0 ? (
                      <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">Nenhum treino registrado</p>
                    ) : selectedStudent.recentBookings.map(b => (
                      <div key={b.id} className="flex items-center justify-between rounded-lg border border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800/50 px-3 py-2.5">
                        <div className="flex items-center gap-3">
                          <div className={cn('h-2 w-2 rounded-full',
                            b.checkin ? 'bg-green-500' : b.status === 'CANCELLED' ? 'bg-red-400' : 'bg-gray-300 dark:bg-gray-600'
                          )} />
                          <div>
                            <div className="text-sm font-medium text-gray-800 dark:text-gray-200">{b.service.name}</div>
                            <div className="text-xs text-gray-400 dark:text-gray-500">
                              {formatDate(b.startsAt)} • {formatTime(b.startsAt)} • {b.trainer.fullName}
                            </div>
                          </div>
                        </div>
                        <div>
                          {b.checkin ? (
                            <span className="text-[10px] font-semibold text-green-600 dark:text-green-400">✓ Presente</span>
                          ) : b.status === 'CANCELLED' ? (
                            <span className="text-[10px] font-semibold text-red-500 dark:text-red-400">Cancelado</span>
                          ) : b.status === 'NO_SHOW' ? (
                            <span className="text-[10px] font-semibold text-gray-500">Faltou</span>
                          ) : (
                            <span className="text-[10px] text-gray-400">{b.status}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Prescription history */}
                {selectedStudent.prescriptionHistory.length > 0 && (
                  <section>
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                      <FileText className="h-4 w-4 text-purple-500" /> Histórico de Prescrições
                    </h3>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {selectedStudent.prescriptionHistory.map(p => (
                        <div key={p.id} className={cn('rounded-lg border px-3 py-2.5',
                          p.isActive ? 'border-brand-200 dark:border-brand-800 bg-brand-50 dark:bg-brand-900/20' : 'border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800/50'
                        )}>
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{p.code}</span>
                              {p.name && <span className="text-xs text-gray-500 dark:text-gray-400"> — {p.name}</span>}
                            </div>
                            {p.isActive ? (
                              <span className="rounded-full bg-green-100 dark:bg-green-900/30 px-2 py-0.5 text-[10px] font-bold text-green-700 dark:text-green-400">ATIVA</span>
                            ) : (
                              <span className="text-[10px] text-gray-400">Concluída</span>
                            )}
                          </div>
                          <div className="flex items-center gap-3 mt-1 text-xs text-gray-400 dark:text-gray-500">
                            <span>{p.usedSessions}/{p.totalSessions} sessões</span>
                            <span>•</span>
                            <span>{p.trainer.fullName}</span>
                            <span>•</span>
                            <span>{formatDate(p.startDate)}</span>
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
