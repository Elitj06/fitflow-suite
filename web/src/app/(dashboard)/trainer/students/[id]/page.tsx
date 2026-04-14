'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft, Loader2, Dumbbell, Heart, Activity, FileText,
  TrendingUp, Calendar, CheckCircle2, XCircle, Clock,
  Edit3, Save, BarChart3,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface StudentDetail {
  student: {
    id: string; fullName: string; email: string; phone: string | null
    healthNotes: string | null; isActive: boolean; source: string | null
    createdAt: string
  }
  activePrescription: {
    id: string; code: string; name: string | null; description: string | null
    exercises: unknown; totalSessions: number; usedSessions: number
    startDate: string; createdAt: string
  } | null
  prescriptionHistory: {
    id: string; code: string; name: string | null; description: string | null
    exercises: unknown; totalSessions: number; usedSessions: number
    isActive: boolean; startDate: string; completedAt: string | null; createdAt: string
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

function formatDate(d: string) { return new Date(d).toLocaleDateString('pt-BR') }
function formatTime(d: string) { return new Date(d).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) }
function daysSince(d: string) { return Math.floor((Date.now() - new Date(d).getTime()) / 86400000) }

export default function StudentEvolutionPage() {
  const params = useParams()
  const router = useRouter()
  const studentId = params.id as string

  const [data, setData] = useState<StudentDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [editMode, setEditMode] = useState(false)
  const [editDesc, setEditDesc] = useState('')
  const [editName, setEditName] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadStudent() }, [studentId])

  async function loadStudent() {
    setLoading(true)
    try {
      const res = await fetch(`/api/trainer/student-detail?studentId=${studentId}`)
      if (res.ok) {
        const d = await res.json()
        setData(d)
        if (d.activePrescription) {
          setEditDesc(d.activePrescription.description || '')
          setEditName(d.activePrescription.name || '')
        }
      }
    } catch { toast.error('Erro ao carregar dados do aluno') }
    finally { setLoading(false) }
  }

  async function savePrescription() {
    if (!data?.activePrescription) return
    setSaving(true)
    try {
      const res = await fetch(`/api/prescriptions/${data.activePrescription.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName || null, description: editDesc || null }),
      })
      if (res.ok) {
        toast.success('Prescrição atualizada')
        setEditMode(false)
        loadStudent()
      } else {
        toast.error('Erro ao salvar')
      }
    } catch { toast.error('Erro de conexão') }
    finally { setSaving(false) }
  }

  async function deactivatePrescription() {
    if (!data?.activePrescription) return
    setSaving(true)
    try {
      const res = await fetch(`/api/prescriptions/${data.activePrescription.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: false }),
      })
      if (res.ok) {
        toast.success('Prescrição encerrada')
        loadStudent()
      }
    } catch { toast.error('Erro de conexão') }
    finally { setSaving(false) }
  }

  if (loading) {
    return (
      <div className="flex h-60 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <p className="text-sm">Aluno não encontrado</p>
        <button onClick={() => router.back()} className="mt-3 text-xs text-brand-600 hover:underline">Voltar</button>
      </div>
    )
  }

  const { student, activePrescription, prescriptionHistory, recentBookings, stats } = data
  const initials = student.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

  const completedBookings = recentBookings.filter(b => b.checkin || b.status === 'COMPLETED')
  const cancelledBookings = recentBookings.filter(b => b.status === 'CANCELLED')
  const totalRelevant = recentBookings.length - cancelledBookings.length
  const attendanceRate = totalRelevant > 0 ? Math.round((completedBookings.length / totalRelevant) * 100) : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="rounded-lg p-2 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
          <ArrowLeft className="h-5 w-5 text-gray-600 dark:text-gray-300" />
        </button>
        <div className="flex items-center gap-4 flex-1">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-900/30 text-lg font-bold text-brand-700 dark:text-brand-300">
            {initials}
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-white">{student.fullName}</h1>
            <div className="flex flex-wrap items-center gap-2 mt-1">
              <span className="text-sm text-gray-500 dark:text-gray-400">Membro há {daysSince(stats.memberSince)} dias</span>
              <span className="text-gray-300 dark:text-gray-600">•</span>
              <span className="text-sm text-gray-500 dark:text-gray-400">{student.email}</span>
              {student.phone && (
                <>
                  <span className="text-gray-300 dark:text-gray-600">•</span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">{student.phone}</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { icon: CheckCircle2, value: stats.totalCheckins, label: 'Total check-ins', color: 'blue' },
          { icon: TrendingUp, value: stats.recentCheckins30d, label: 'Últimos 30 dias', color: 'green' },
          { icon: BarChart3, value: `${attendanceRate}%`, label: 'Presença', color: 'amber' },
          { icon: Calendar, value: daysSince(stats.memberSince), label: 'Dias membro', color: 'purple' },
        ].map(s => (
          <div key={s.label} className={cn('rounded-xl p-4',
            s.color === 'blue' && 'bg-blue-50 dark:bg-blue-900/20',
            s.color === 'green' && 'bg-green-50 dark:bg-green-900/20',
            s.color === 'amber' && 'bg-amber-50 dark:bg-amber-900/20',
            s.color === 'purple' && 'bg-purple-50 dark:bg-purple-900/20',
          )}>
            <s.icon className={cn('h-5 w-5 mb-2',
              s.color === 'blue' && 'text-blue-600 dark:text-blue-400',
              s.color === 'green' && 'text-green-600 dark:text-green-400',
              s.color === 'amber' && 'text-amber-600 dark:text-amber-400',
              s.color === 'purple' && 'text-purple-600 dark:text-purple-400',
            )} />
            <div className={cn('text-2xl font-bold',
              s.color === 'blue' && 'text-blue-700 dark:text-blue-300',
              s.color === 'green' && 'text-green-700 dark:text-green-300',
              s.color === 'amber' && 'text-amber-700 dark:text-amber-300',
              s.color === 'purple' && 'text-purple-700 dark:text-purple-300',
            )}>{s.value}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Active Prescription */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-gray-900 dark:text-white">
            <Dumbbell className="h-5 w-5 text-brand-600" /> Prescrição Atual
          </h2>
          {activePrescription && !editMode && (
            <div className="flex gap-2">
              <button onClick={() => setEditMode(true)}
                className="flex items-center gap-1 rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
                <Edit3 className="h-3 w-3" /> Editar
              </button>
              <button onClick={deactivatePrescription} disabled={saving}
                className="rounded-lg border border-red-200 dark:border-red-800 px-3 py-1.5 text-xs font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50">
                Encerrar
              </button>
            </div>
          )}
          {editMode && (
            <div className="flex gap-2">
              <button onClick={() => setEditMode(false)} className="rounded-lg border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">Cancelar</button>
              <button onClick={savePrescription} disabled={saving}
                className="flex items-center gap-1 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-brand-700 disabled:opacity-50">
                <Save className="h-3 w-3" /> Salvar
              </button>
            </div>
          )}
        </div>

        {activePrescription ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="rounded-full bg-brand-100 dark:bg-brand-900/30 px-3 py-1 text-xs font-bold text-brand-700 dark:text-brand-300">
                {activePrescription.code}
              </span>
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Início: {formatDate(activePrescription.startDate)} • Há {daysSince(activePrescription.startDate)} dias
              </span>
            </div>

            {/* Progress */}
            <div>
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-gray-600 dark:text-gray-400">Progresso</span>
                <span className="font-bold text-gray-900 dark:text-white">
                  {activePrescription.usedSessions}/{activePrescription.totalSessions} sessões
                </span>
              </div>
              <div className="h-3 w-full rounded-full bg-gray-200 dark:bg-gray-700">
                <div
                  className={cn('h-3 rounded-full transition-all',
                    (activePrescription.usedSessions / activePrescription.totalSessions) >= 1 ? 'bg-green-500' :
                    (activePrescription.usedSessions / activePrescription.totalSessions) >= 0.75 ? 'bg-amber-500' : 'bg-brand-600'
                  )}
                  style={{ width: `${Math.min(100, (activePrescription.usedSessions / activePrescription.totalSessions) * 100)}%` }}
                />
              </div>
            </div>

            {/* Name (editable) */}
            {editMode ? (
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Nome</label>
                <input type="text" value={editName} onChange={e => setEditName(e.target.value)}
                  placeholder="Ex: Treino A - Hipertrofia"
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:border-brand-500 focus:outline-none" />
              </div>
            ) : activePrescription.name && (
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Nome</label>
                <p className="text-sm text-gray-900 dark:text-white">{activePrescription.name}</p>
              </div>
            )}

            {/* Description (editable) */}
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Descrição do treino</label>
              {editMode ? (
                <textarea rows={4} value={editDesc} onChange={e => setEditDesc(e.target.value)}
                  placeholder="Ex: Supino 4x12, Agachamento 4x10..."
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white focus:border-brand-500 focus:outline-none resize-none" />
              ) : (
                <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {activePrescription.description || 'Sem descrição'}
                </p>
              )}
            </div>

            {/* Exercises */}
            {activePrescription.exercises && (
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Exercícios</label>
                <pre className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap bg-gray-50 dark:bg-gray-800 rounded-lg p-3">
                  {typeof activePrescription.exercises === 'string'
                    ? activePrescription.exercises
                    : JSON.stringify(activePrescription.exercises, null, 2)}
                </pre>
              </div>
            )}
          </div>
        ) : (
          <div className="py-8 text-center">
            <Dumbbell className="mx-auto h-10 w-10 text-gray-300 dark:text-gray-600 mb-3" />
            <p className="text-sm text-gray-400 dark:text-gray-500">Nenhuma prescrição ativa para este aluno</p>
          </div>
        )}
      </div>

      {/* Prescription History */}
      {prescriptionHistory.length > 0 && (
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-gray-900 dark:text-white mb-4">
            <FileText className="h-5 w-5 text-purple-500" /> Histórico de Prescrições
          </h2>
          <div className="space-y-3">
            {prescriptionHistory.map(p => (
              <div key={p.id} className={cn(
                'rounded-xl border p-4 transition-all',
                p.isActive
                  ? 'border-brand-200 dark:border-brand-800 bg-brand-50 dark:bg-brand-900/20'
                  : 'border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-800/50'
              )}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={cn(
                      'flex h-10 w-10 items-center justify-center rounded-lg font-mono font-bold text-sm',
                      p.isActive
                        ? 'bg-brand-600/20 text-brand-700 dark:text-brand-300'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                    )}>
                      {p.code}
                    </span>
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {p.name || 'Sem nome'}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {p.trainer.fullName} • {formatDate(p.startDate)}
                        {p.completedAt && ` → ${formatDate(p.completedAt)}`}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    {p.isActive ? (
                      <span className="rounded-full bg-green-100 dark:bg-green-900/30 px-2.5 py-0.5 text-[10px] font-bold text-green-700 dark:text-green-400">ATIVA</span>
                    ) : (
                      <span className="text-[10px] text-gray-400">
                        {p.usedSessions >= p.totalSessions ? 'Completada' : 'Encerrada'}
                      </span>
                    )}
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mt-3 flex items-center gap-3">
                  <div className="flex-1 h-2 rounded-full bg-gray-200 dark:bg-gray-700">
                    <div
                      className={cn('h-2 rounded-full transition-all',
                        p.usedSessions >= p.totalSessions ? 'bg-green-500' :
                        p.isActive ? 'bg-brand-600' : 'bg-gray-400'
                      )}
                      style={{ width: `${Math.min(100, (p.usedSessions / p.totalSessions) * 100)}%` }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                    {p.usedSessions}/{p.totalSessions}
                  </span>
                </div>

                {p.description && (
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400 line-clamp-2">{p.description}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Health Notes */}
      {student.healthNotes && (
        <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-gray-900 dark:text-white mb-3">
            <Heart className="h-5 w-5 text-red-500" /> Observações de Saúde
          </h2>
          <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{student.healthNotes}</p>
        </div>
      )}

      {/* Recent Attendance */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-6">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-gray-900 dark:text-white mb-4">
          <Activity className="h-5 w-5 text-blue-500" /> Últimas Aulas
        </h2>
        {recentBookings.length === 0 ? (
          <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-8">Nenhuma aula registrada</p>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {recentBookings.map(b => (
              <div key={b.id} className="flex items-center justify-between rounded-lg border border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50 px-4 py-3">
                <div className="flex items-center gap-3">
                  <div className={cn('h-2.5 w-2.5 rounded-full',
                    b.checkin ? 'bg-green-500' : b.status === 'CANCELLED' ? 'bg-red-400' : b.status === 'NO_SHOW' ? 'bg-gray-400' : 'bg-amber-400'
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
                    <span className="flex items-center gap-1 text-xs font-semibold text-green-600 dark:text-green-400">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Presente
                    </span>
                  ) : b.status === 'CANCELLED' ? (
                    <span className="flex items-center gap-1 text-xs font-semibold text-red-500 dark:text-red-400">
                      <XCircle className="h-3.5 w-3.5" /> Cancelado
                    </span>
                  ) : b.status === 'NO_SHOW' ? (
                    <span className="flex items-center gap-1 text-xs font-semibold text-gray-500">
                      <XCircle className="h-3.5 w-3.5" /> Faltou
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-gray-400">
                      <Clock className="h-3.5 w-3.5" /> {b.status}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
