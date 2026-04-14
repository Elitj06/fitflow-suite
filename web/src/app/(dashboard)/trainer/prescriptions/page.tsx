'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Dumbbell, Plus, X, CheckCircle2,
  Loader2, Edit3, History,
} from 'lucide-react'

interface Prescription {
  id: string
  code: string
  name: string | null
  description: string | null
  exercises: unknown
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

type Tab = 'active' | 'history'

export default function PrescriptionsPage() {
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([])
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<Tab>('active')
  const [showModal, setShowModal] = useState(false)
  const [editPrescription, setEditPrescription] = useState<Prescription | null>(null)
  const [submitting, setSubmitting] = useState(false)

  // Form state
  const [formStudentId, setFormStudentId] = useState('')
  const [formCode, setFormCode] = useState('')
  const [formName, setFormName] = useState('')
  const [formSessions, setFormSessions] = useState('')
  const [formDescription, setFormDescription] = useState('')

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
  const historyPrescriptions = prescriptions.filter(p => !p.isActive)

  const resetForm = () => {
    setFormStudentId(''); setFormCode(''); setFormName(''); setFormSessions(''); setFormDescription('')
  }

  const openCreate = () => {
    resetForm()
    setEditPrescription(null)
    setShowModal(true)
  }

  const openEdit = (p: Prescription) => {
    setEditPrescription(p)
    setFormStudentId(p.student.id)
    setFormCode(p.code)
    setFormName(p.name || '')
    setFormSessions(String(p.totalSessions))
    setFormDescription(p.description || '')
    setShowModal(true)
  }

  const handleSubmit = async () => {
    if (editPrescription) {
      // Update
      setSubmitting(true)
      const res = await fetch(`/api/prescriptions/${editPrescription.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName || null,
          code: formCode,
          totalSessions: parseInt(formSessions),
          description: formDescription || null,
        }),
      })
      if (res.ok) {
        setShowModal(false)
        fetchPrescriptions()
      }
      setSubmitting(false)
    } else {
      // Create
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
          description: formDescription || undefined,
        }),
      })
      if (res.ok) {
        setShowModal(false)
        resetForm()
        fetchPrescriptions()
      }
      setSubmitting(false)
    }
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

  const displayList = tab === 'active' ? activePrescriptions : historyPrescriptions

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Dumbbell className="h-8 w-8 text-indigo-500" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Prescrições de Treino</h1>
            <p className="text-sm text-zinc-400">{activePrescriptions.length} ativa(s) • {historyPrescriptions.length} no histórico</p>
          </div>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 transition"
        >
          <Plus className="h-4 w-4" /> Nova Prescrição
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-gray-100 dark:bg-zinc-800/50 p-1 w-fit">
        <button
          onClick={() => setTab('active')}
          className={`rounded-md px-4 py-1.5 text-sm font-medium transition ${
            tab === 'active' ? 'bg-indigo-600 text-white' : 'text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          Ativas ({activePrescriptions.length})
        </button>
        <button
          onClick={() => setTab('history')}
          className={`flex items-center gap-1.5 rounded-md px-4 py-1.5 text-sm font-medium transition ${
            tab === 'history' ? 'bg-indigo-600 text-white' : 'text-gray-500 dark:text-zinc-400 hover:text-gray-900 dark:hover:text-white'
          }`}
        >
          <History className="h-3.5 w-3.5" /> Histórico ({historyPrescriptions.length})
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-zinc-500" /></div>
      ) : displayList.length === 0 ? (
        <div className="rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-10 text-center">
          <Dumbbell className="mx-auto h-12 w-12 text-gray-300 dark:text-zinc-600" />
          <p className="mt-3 text-zinc-400">
            {tab === 'active' ? 'Nenhuma prescrição ativa' : 'Nenhum histórico'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {displayList.map(p => (
            <div
              key={p.id}
              className="rounded-xl border border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/50 p-4 transition hover:border-gray-300 dark:hover:border-zinc-600"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-600/20 text-indigo-400 font-mono font-bold text-sm">
                    {p.code}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{p.student.fullName}</p>
                    <p className="text-xs text-zinc-400">
                      {p.name || 'Sem nome'} • Início {new Date(p.startDate).toLocaleDateString('pt-BR')}
                      {p.completedAt && ` • Encerrada ${new Date(p.completedAt).toLocaleDateString('pt-BR')}`}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{p.usedSessions}/{p.totalSessions} sessões</p>
                  <div className="mt-1 h-1.5 w-24 rounded-full bg-gray-200 dark:bg-zinc-700 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        progressPct(p) >= 100 ? 'bg-green-500' : progressPct(p) >= 75 ? 'bg-yellow-500' : 'bg-indigo-500'
                      }`}
                      style={{ width: `${progressPct(p)}%` }}
                    />
                  </div>
                </div>
              </div>

              {p.description && (
                <div className="mt-3 rounded-lg bg-gray-50 dark:bg-zinc-800/50 p-3 text-sm text-gray-700 dark:text-zinc-300 whitespace-pre-wrap">
                  {p.description}
                </div>
              )}

              <div className="mt-3 flex gap-2">
                {p.isActive && (
                  <>
                    <button
                      onClick={() => openEdit(p)}
                      className="flex items-center gap-1 rounded-md border border-zinc-700 px-3 py-1 text-xs text-zinc-400 hover:bg-zinc-800 transition"
                    >
                      <Edit3 className="h-3 w-3" /> Editar
                    </button>
                    <button
                      onClick={() => handleDeactivate(p.id)}
                      className="rounded-md border border-zinc-700 px-3 py-1 text-xs text-zinc-400 hover:bg-zinc-800 transition"
                    >
                      Encerrar
                    </button>
                  </>
                )}
                {!p.isActive && (
                  <span className="flex items-center gap-1 text-xs text-gray-400 dark:text-zinc-500">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {p.usedSessions >= p.totalSessions ? 'Completada' : 'Encerrada'}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal: Nova/Editar Prescrição */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                {editPrescription ? 'Editar Prescrição' : 'Nova Prescrição'}
              </h2>
              <button onClick={() => setShowModal(false)}><X className="h-5 w-5 text-gray-400 dark:text-zinc-400" /></button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 dark:text-zinc-400 mb-1">Aluno</label>
                {editPrescription ? (
                  <div className="w-full rounded-lg border border-gray-300 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 px-3 py-2 text-gray-500 dark:text-zinc-400 text-sm">
                    {editPrescription.student.fullName}
                  </div>
                ) : (
                  <select
                    value={formStudentId}
                    onChange={e => setFormStudentId(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-gray-900 dark:text-white text-sm"
                  >
                    <option value="">Selecionar aluno...</option>
                    {students.map(s => (
                      <option key={s.id} value={s.id}>{s.fullName}</option>
                    ))}
                  </select>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm text-gray-600 dark:text-zinc-400 mb-1">Código</label>
                  <input
                    value={formCode}
                    onChange={e => setFormCode(e.target.value.toUpperCase())}
                    placeholder="A1"
                    className="w-full rounded-lg border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-gray-900 dark:text-white text-sm uppercase"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-600 dark:text-zinc-400 mb-1">Sessões</label>
                  <input
                    type="number"
                    value={formSessions}
                    onChange={e => setFormSessions(e.target.value)}
                    placeholder="12"
                    className="w-full rounded-lg border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-gray-900 dark:text-white text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-gray-600 dark:text-zinc-400 mb-1">Nome (opcional)</label>
                <input
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  placeholder="Treino Hipertrofia"
                  className="w-full rounded-lg border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-gray-900 dark:text-white text-sm"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-600 dark:text-zinc-400 mb-1">Descrição do treino</label>
                <textarea
                  value={formDescription}
                  onChange={e => setFormDescription(e.target.value)}
                  placeholder={"Supino 4x12\nAgachamento 4x10\nRemada 3x12\nDesenvolvimento 3x10"}
                  rows={4}
                  className="w-full rounded-lg border border-gray-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 px-3 py-2 text-gray-900 dark:text-white text-sm resize-none"
                />
              </div>

              <button
                onClick={handleSubmit}
                disabled={submitting || (!editPrescription && (!formStudentId || !formCode || !formSessions))}
                className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50 transition"
              >
                {submitting ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : editPrescription ? 'Salvar Alterações' : 'Criar Prescrição'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
