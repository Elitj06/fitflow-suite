'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Users, Plus, X, Loader2, Mail, Phone,
  Pencil, Trash2, Dumbbell,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface Trainer {
  id: string
  fullName: string
  email: string
  phone: string | null
  specialties: string[]
  isActive: boolean
  bookingCount: number
}

const SPECIALTY_OPTIONS = ['Musculação', 'Pilates', 'Personal Training', 'Treino Funcional', 'Avaliação Física', 'Crossfit', 'Yoga', 'Dança', 'Luta', 'Natação']

export default function TrainersPage() {
  const [trainers, setTrainers] = useState<Trainer[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<Trainer | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', specialties: [] as string[] })
  const [error, setError] = useState('')

  const loadTrainers = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/trainers')
      if (res.ok) setTrainers(await res.json())
    } catch { toast.error('Erro ao carregar professores') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { loadTrainers() }, [loadTrainers])

  function openCreate() {
    setEditing(null)
    setForm({ fullName: '', email: '', phone: '', specialties: [] })
    setError('')
    setShowModal(true)
  }

  function openEdit(t: Trainer) {
    setEditing(t)
    setForm({ fullName: t.fullName, email: t.email, phone: t.phone || '', specialties: t.specialties || [] })
    setError('')
    setShowModal(true)
  }

  async function handleSave() {
    if (!form.fullName || !form.email) return
    setSaving(true)
    setError('')
    try {
      const url = editing ? `/api/admin/trainers/${editing.id}` : '/api/admin/trainers'
      const method = editing ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) { setError(data.error || 'Erro ao salvar'); return }
      toast.success(editing ? 'Professor atualizado' : 'Professor cadastrado')
      setShowModal(false)
      loadTrainers()
    } catch { setError('Erro de conexão') }
    finally { setSaving(false) }
  }

  async function handleDelete(t: Trainer) {
    if (!confirm(`Desativar ${t.fullName}?${t.isActive ? '' : ' (já está inativo)'}`)) return
    try {
      const res = await fetch(`/api/admin/trainers/${t.id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error); return }
      toast.success('Professor desativado')
      loadTrainers()
    } catch { toast.error('Erro de conexão') }
  }

  function toggleSpecialty(s: string) {
    setForm(f => ({
      ...f,
      specialties: f.specialties.includes(s) ? f.specialties.filter(x => x !== s) : [...f.specialties, s],
    }))
  }

  const activeCount = trainers.filter(t => t.isActive).length

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-white">Professores</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {loading ? 'Carregando...' : `${activeCount} ativos, ${trainers.length} total`}
          </p>
        </div>
        <button onClick={openCreate}
          className="flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700">
          <Plus className="h-4 w-4" /> Novo Professor
        </button>
      </div>

      {/* Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <div className="col-span-full flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-brand-600" /></div>
        ) : trainers.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-16 text-gray-400 dark:text-gray-500">
            <Users className="h-12 w-12 mb-3 opacity-30" />
            <p className="text-sm font-medium">Nenhum professor cadastrado</p>
            <button onClick={openCreate} className="mt-3 text-xs text-brand-600 hover:underline">Cadastrar primeiro professor</button>
          </div>
        ) : trainers.map(t => {
          const initials = t.fullName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
          return (
            <div key={t.id} className={cn(
              'rounded-2xl border bg-white dark:bg-gray-900 p-5 shadow-sm hover:shadow-md transition-all',
              t.isActive ? 'border-gray-200 dark:border-gray-700' : 'border-gray-100 dark:border-gray-800 opacity-60'
            )}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-900/30 text-sm font-bold text-brand-700 dark:text-brand-300">
                    {initials}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-gray-900 dark:text-white">{t.fullName}</div>
                    <span className={cn(
                      'inline-block rounded-full px-2 py-0.5 text-[10px] font-bold mt-0.5',
                      t.isActive ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                    )}>
                      {t.isActive ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(t)} className="rounded-lg p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-400 hover:text-brand-600 transition-colors">
                    <Pencil className="h-4 w-4" />
                  </button>
                  {t.isActive && (
                    <button onClick={() => handleDelete(t)} className="rounded-lg p-1.5 hover:bg-red-50 dark:hover:bg-red-900/20 text-gray-400 hover:text-red-500 transition-colors">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-1.5 text-sm text-gray-600 dark:text-gray-400 mb-3">
                <div className="flex items-center gap-2"><Mail className="h-3.5 w-3.5" />{t.email}</div>
                {t.phone && <div className="flex items-center gap-2"><Phone className="h-3.5 w-3.5" />{t.phone}</div>}
              </div>

              {t.specialties.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-3">
                  {t.specialties.map(s => (
                    <span key={s} className="rounded-full bg-brand-50 dark:bg-brand-900/20 px-2 py-0.5 text-[10px] font-medium text-brand-700 dark:text-brand-400">
                      {s}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex items-center gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                <Dumbbell className="h-3.5 w-3.5 text-gray-400" />
                <span className="text-xs text-gray-500 dark:text-gray-400">{t.bookingCount} aulas</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl bg-white dark:bg-gray-900 p-6 shadow-2xl border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-display text-lg font-bold text-gray-900 dark:text-white">
                {editing ? 'Editar Professor' : 'Novo Professor'}
              </h3>
              <button onClick={() => setShowModal(false)} className="rounded-lg p-1 hover:bg-gray-100 dark:hover:bg-gray-800">
                <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              </button>
            </div>

            {error && <div className="mb-4 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-700 dark:text-red-400">{error}</div>}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nome completo *</label>
                <input type="text" value={form.fullName} onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                  placeholder="Nome do professor" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email *</label>
                <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                  placeholder="professor@email.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">WhatsApp</label>
                <input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                  placeholder="(21) 99999-9999" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Especialidades</label>
                <div className="flex flex-wrap gap-2">
                  {SPECIALTY_OPTIONS.map(s => (
                    <button key={s} type="button" onClick={() => toggleSpecialty(s)}
                      className={cn(
                        'rounded-lg px-3 py-1.5 text-xs font-medium border transition-all',
                        form.specialties.includes(s)
                          ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-400'
                          : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-300'
                      )}>
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowModal(false)}
                  className="flex-1 rounded-xl border border-gray-300 dark:border-gray-600 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">
                  Cancelar
                </button>
                <button onClick={handleSave} disabled={saving || !form.fullName || !form.email}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {saving ? 'Salvando...' : editing ? 'Salvar' : 'Cadastrar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
