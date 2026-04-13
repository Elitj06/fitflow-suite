'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Dumbbell, Plus, X, CheckCircle2, AlertCircle,
  Loader2, User, ChevronDown,
} from 'lucide-react'

interface Prescription {
  id: string
  code: string
  name: string | null
  totalSessions: number
  usedSessions: number
  isActive: boolean
  startDate: string
  completedAt: string | null
  student: { id: string; fullName: string; phone: string | null }
  trainer: { id: string; fullName: string }
}

interface Student {
  id: string
  fullName: string
  phone: string | null
}

export default function PrescriptionsPage() {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Form state
  const [formStudentId, setFormStudentId] = useState('')
  const [formCode, setFormCode] = useState('')
  const [formName, setFormName] = useState('')
  const [formSessions, setFormSessions] = useState('')

  const fetchPrescriptions = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/prescriptions')
    if (res.ok) setPrescriptions(await res.json())
    setLoading(false)
  }, [])

  const fetchStudents = useCallback(async () => {
    const res = await fetch('/api/students')
    if (res.ok) setStudents(await res.json())
  }, [])

  useEffect(() => { fetchPrescriptions(); fetchStudents() }, [fetchPrescriptions, fetchStudents])

  const activePrescriptions = prescriptions.filter(p => p.isActive)
  const inactivePrescriptions = selectedStudentId
    ? prescriptions.filter(p => p.student.id === selectedStudentId && !p.isActive)
    : []

  const handleCreate = async () => {
    if (!formStudentId || !formCode || !formSessions) return
    setSubmitting(true)
    const res = await fetch('/api/prescriptions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentId: formStudentId,
        code: formCode,
        totalSessions: parseInt(formSessions),
        name: formName || undefined,
      }),
    })
    if (res.ok) {
      setShowModal(false)
      setFormStudentId(''); setFormCode(''); setFormName(''); setFormSessions('')
      fetchPrescriptions()
    }
    setSubmitting(false)
  }

  const handleDeactivate = async (id: string) => {
    const res = await fetch(`/api/prescriptions/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isActive: false }),
    })
    if (res.ok) fetchPrescriptions()
  }

  const progressPct = (p: Prescription) =>
    Math.min(100, Math.round((p.usedSessions / p.totalSessions) * 100))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Dumbbell className="h-8 w-8 text-indigo-500" />
          <div>
            <h1 className="text-2xl font-bold text-white">Prescrições de Treino</h1>
            <p className="text-sm text-zinc-400">{activePrescriptions.length} ativa(s)</p>
          </div>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 transition"
        >
          <Plus className="h-4 w-4" /> Nova Prescrição
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-zinc-500" /></div>
      ) : activePrescriptions.length === 0 ? (
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-10 text-center">
          <Dumbbell className="mx-auto h-12 w-12 text-zinc-600" />
          <p className="mt-3 text-zinc-400">Nenhuma prescrição ativa</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {activePrescriptions.map(p => (
            <div
              key={p.id}
              className={`rounded-xl border bg-zinc-900/50 p-4 cursor-pointer transition hover:border-zinc-600 ${
                selectedStudentId === p.student.id ? 'border-indigo-500' : 'border-zinc-800'
              }`}
              onClick={() => setSelectedStudentId(selectedStudentId === p.student.id ? null : p.student.id)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600/20 text-indigo-400 font-mono font-bold text-sm">
                    {p.code}
                  </div>
                  <div>
                    <p className="font-medium text-white">{p.student.fullName}</p>
                    <p className="text-xs text-zinc-400">{p.name || 'Sem nome'} • Início {new Date(p.startDate).toLocaleDateString('pt-BR')}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-white">{p.usedSessions}/{p.totalSessions} sessões</p>
                  <div className="mt-1 h-1.5 w-24 rounded-full bg-zinc-700 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        progressPct(p) >= 100 ? 'bg-green-500' : progressPct(p) >= 75 ? 'bg-yellow-500' : 'bg-indigo-500'
                      }`}
                      style={{ width: `${progressPct(p)}%` }}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-3 flex gap-2">
                <button
                  onClick={(e) => { e.stopPropagation(); handleDeactivate(p.id) }}
                  className="rounded-md border border-zinc-700 px-3 py-1 text-xs text-zinc-400 hover:bg-zinc-800 transition"
                >
                  Encerrar
                </button>
              </div>

              {/* History for selected student */}
              {selectedStudentId === p.student.id && inactivePrescriptions.length > 0 && (
                <div className="mt-4 border-t border-zinc-800 pt-3">
                  <p className="text-xs font-medium text-zinc-400 mb-2">Histórico de prescrições</p>
                  {inactivePrescriptions.map(ip => (
                    <div key={ip.id} className="flex items-center justify-between py-1.5 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-zinc-500">{ip.code}</span>
                        <span className="text-zinc-300">{ip.name || '—'}</span>
                      </div>
                      <span className="text-xs text-zinc-500">{ip.usedSessions}/{ip.totalSessions}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal: Nova Prescrição */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-zinc-700 bg-zinc-900 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">Nova Prescrição</h2>
              <button onClick={() => setShowModal(false)}><X className="h-5 w-5 text-zinc-400" /></button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-zinc-400 mb-1">Aluno</label>
                <select
                  value={formStudentId}
                  onChange={e => setFormStudentId(e.target.value)}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white text-sm"
                >
                  <option value="">Selecionar aluno...</option>
                  {students.map(s => (
                    <option key={s.id} value={s.id}>{s.fullName}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Código</label>
                  <input
                    value={formCode}
                    onChange={e => setFormCode(e.target.value.toUpperCase())}
                    placeholder="A1"
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white text-sm uppercase"
                  />
                </div>
                <div>
                  <label className="block text-sm text-zinc-400 mb-1">Sessões</label>
                  <input
                    type="number"
                    value={formSessions}
                    onChange={e => setFormSessions(e.target.value)}
                    placeholder="12"
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-zinc-400 mb-1">Nome (opcional)</label>
                <input
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  placeholder="Treino Hipertrofia"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-white text-sm"
                />
              </div>

              <button
                onClick={handleCreate}
                disabled={submitting || !formStudentId || !formCode || !formSessions}
                className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50 transition"
              >
                {submitting ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : 'Criar Prescrição'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
