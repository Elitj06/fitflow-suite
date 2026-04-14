'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Users, Search, Plus, Coins, Calendar,
  X, Loader2, Mail, Phone, Filter,
} from 'lucide-react'

interface Student {
  id: string
  fullName: string
  email: string
  phone: string | null
  coinsBalance: number
  isActive: boolean
  healthNotes: string | null
  source: string | null
  _count: { studentBookings: number; checkins: number }
}

interface Prescription {
  id: string
  studentId: string
  code: string
  name: string | null
  totalSessions: number
  usedSessions: number
  isActive: boolean
}

const SOURCE_BADGE: Record<string, { label: string; color: string; darkColor: string }> = {
  direct: { label: 'Matriculado', color: 'bg-blue-100 text-blue-700', darkColor: 'dark:bg-blue-900/30 dark:text-blue-400' },
  wellhub: { label: 'Wellhub', color: 'bg-orange-100 text-orange-700', darkColor: 'dark:bg-orange-900/30 dark:text-orange-400' },
  totalpass: { label: 'TotalPass', color: 'bg-purple-100 text-purple-700', darkColor: 'dark:bg-purple-900/30 dark:text-purple-400' },
  import: { label: 'Importado', color: 'bg-gray-100 text-gray-700', darkColor: 'dark:bg-gray-700 dark:text-gray-300' },
}

function getSourceBadge(source: string | null) {
  const key = source || 'direct'
  return SOURCE_BADGE[key] || SOURCE_BADGE.direct
}

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<string>('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [selected, setSelected] = useState<Student | null>(null)
  const [saving, setSaving] = useState(false)
  const [prescriptions, setPrescriptions] = useState<Prescription[]>([])
  const [addForm, setAddForm] = useState({ fullName: '', email: '', phone: '', source: 'direct' })
  const [addError, setAddError] = useState('')
  const [userRole, setUserRole] = useState<string>('TRAINER')

  const [debouncedSearch, setDebouncedSearch] = useState('')

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(timer)
  }, [search])

  const loadStudents = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (debouncedSearch && debouncedSearch.trim().length >= 2) params.set('search', debouncedSearch.trim())
      if (filter === 'active') params.set('status', 'active')
      if (filter === 'inactive') params.set('status', 'inactive')
      if (filter === 'wellhub') params.set('source', 'wellhub')
      if (filter === 'totalpass') params.set('source', 'totalpass')
      if (filter === 'direct') params.set('source', 'direct')
      const res = await fetch('/api/students?' + params.toString())
      // Fetch role
      const profileRes = await fetch('/api/profile')
      if (profileRes.ok) {
        const p = await profileRes.json()
        setUserRole(p.role || 'TRAINER')
      }
      if (res.ok) setStudents(await res.json())
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch, filter])

  useEffect(() => { loadStudents() }, [loadStudents])

  useEffect(() => {
    fetch('/api/prescriptions').then(r => r.ok ? r.json() : []).then(setPrescriptions).catch(() => {})
  }, [])

  async function handleAddStudent() {
    if (!addForm.fullName || !addForm.email) return
    setSaving(true)
    setAddError('')
    try {
      const res = await fetch('/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addForm),
      })
      const data = await res.json()
      if (!res.ok) { setAddError(data.error || 'Erro ao cadastrar'); return }
      setShowAddModal(false)
      setAddForm({ fullName: '', email: '', phone: '', source: 'direct' })
      loadStudents()
    } catch (e) {
      setAddError('Erro de conexao')
    } finally {
      setSaving(false)
    }
  }

  const totalActive = students.filter(s => s.isActive).length
  const sourceCounts = {
    direct: students.filter(s => (s.source || 'direct') === 'direct').length,
    wellhub: students.filter(s => s.source === 'wellhub').length,
    totalpass: students.filter(s => s.source === 'totalpass').length,
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-white">Alunos</h1>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">{loading ? 'Carregando...' : `${totalActive} ativos, ${students.length} total`}</p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700">
          <Plus className="h-4 w-4" /> Novo Aluno
        </button>
      </div>

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-4">
        {[
          { label: 'Total Ativos', value: totalActive },
          { label: 'Matriculados', value: sourceCounts.direct },
          { label: 'Wellhub', value: sourceCounts.wellhub },
          { label: 'TotalPass', value: sourceCounts.totalpass },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-3 flex items-center gap-3">
            <div className="font-display text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nome ou email..."
            className="w-full rounded-xl border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 py-2.5 pl-11 pr-4 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:focus:ring-brand-900"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {[
            { key: 'all', label: 'Todos' },
            { key: 'active', label: 'Ativos' },
            { key: 'direct', label: 'Matriculados' },
            { key: 'wellhub', label: 'Wellhub' },
            { key: 'totalpass', label: 'TotalPass' },
          ].map(f => (
            <button key={f.key} onClick={() => setFilter(f.key)}
              className={`rounded-lg px-3 py-2 text-xs font-medium border transition-all ${
                filter === f.key
                  ? 'border-brand-500 bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-400'
                  : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-500'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-brand-600" /></div>
        ) : students.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400 dark:text-gray-500">
            <Users className="h-12 w-12 mb-3 opacity-30" />
            <p className="text-sm font-medium">Nenhum aluno encontrado</p>
            <button onClick={() => setShowAddModal(true)} className="mt-3 text-xs text-brand-600 hover:underline">Cadastrar primeiro aluno</button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Aluno</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Classificação</th>
                  {userRole === 'ADMIN' && <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">FitCoins</th>}
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Aulas</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {students.map((s) => {
                  const badge = getSourceBadge(s.source)
                  const initials = s.fullName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()
                  return (
                    <tr key={s.id} onClick={() => setSelected(s)} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-900/30 text-xs font-bold text-brand-700 dark:text-brand-300">{initials}</div>
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">{s.fullName}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">{s.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${badge.color} ${badge.darkColor}`}>{badge.label}</span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <div className="flex items-center justify-center gap-1">
                          <Coins className="h-3.5 w-3.5 text-yellow-500" />
                          <span className="text-sm font-semibold text-gray-900 dark:text-white">{s.coinsBalance}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center text-sm text-gray-700 dark:text-gray-300">{s._count.checkins}</td>
                      <td className="px-4 py-4 text-center">
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          s.isActive ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                        }`}>
                          {s.isActive ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Student detail panel */}
      {selected && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm" onClick={() => setSelected(null)}>
          <div className="w-full max-w-md bg-white dark:bg-gray-900 shadow-2xl overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 flex items-center justify-between border-b border-gray-100 dark:border-gray-700 bg-white dark:bg-gray-900 px-6 py-4">
              <h3 className="font-display text-lg font-bold text-gray-900 dark:text-white">Detalhes do Aluno</h3>
              <button onClick={() => setSelected(null)} className="rounded-lg p-1 hover:bg-gray-100 dark:hover:bg-gray-800"><X className="h-5 w-5 text-gray-500 dark:text-gray-400" /></button>
            </div>
            <div className="p-6 space-y-6">
              {/* Header */}
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-100 dark:bg-brand-900/30 text-xl font-bold text-brand-700 dark:text-brand-300">
                  {selected.fullName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="text-lg font-bold text-gray-900 dark:text-white">{selected.fullName}</div>
                  {(() => {
                    const badge = getSourceBadge(selected.source)
                    return <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-bold mt-1 ${badge.color} ${badge.darkColor}`}>{badge.label}</span>
                  })()}
                </div>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-yellow-50 dark:bg-yellow-900/20 p-3 text-center">
                  <Coins className="mx-auto h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                  <div className="mt-1 font-display text-xl font-bold text-gray-900 dark:text-white">{selected.coinsBalance}</div>
                }
                  <div className="text-[10px] text-gray-500 dark:text-gray-400">FitCoins</div>
                }
                </div>
                <div className="rounded-xl bg-brand-50 dark:bg-brand-900/20 p-3 text-center">
                  <Calendar className="mx-auto h-5 w-5 text-brand-600 dark:text-brand-400" />
                  <div className="mt-1 font-display text-xl font-bold text-gray-900 dark:text-white">{selected._count.checkins}</div>
                  <div className="text-[10px] text-gray-500 dark:text-gray-400">Aulas realizadas</div>
                </div>
              </div>

              {/* Contact */}
              <div className="space-y-2">
                <div className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300"><Mail className="h-4 w-4 text-gray-400 dark:text-gray-500" /><span>{selected.email}</span></div>
                {selected.phone && <div className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300"><Phone className="h-4 w-4 text-gray-400 dark:text-gray-500" /><span>{selected.phone}</span></div>}
              </div>

              {/* Active Prescription */}
              {(() => {
                const activeP = prescriptions.find(p => p.studentId === selected.id && p.isActive)
                if (!activeP) return (
                  <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-600 p-4 text-center">
                    <p className="text-xs text-gray-400 dark:text-gray-500">Sem prescrição ativa</p>
                  </div>
                )
                return (
                  <div className="rounded-xl border border-brand-200 dark:border-brand-800 bg-brand-50 dark:bg-brand-900/20 p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-brand-700 dark:text-brand-400">Prescrição Ativa</h4>
                      <span className="rounded-full bg-green-100 dark:bg-green-900/30 px-2 py-0.5 text-[10px] font-bold text-green-700 dark:text-green-400">ATIVA</span>
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-300">{activeP.code}{activeP.name ? ` — ${activeP.name}` : ''}</div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 rounded-full bg-gray-200 dark:bg-gray-700 h-2.5">
                        <div className="rounded-full bg-brand-600 h-2.5 transition-all" style={{ width: `${Math.min(100, (activeP.usedSessions / activeP.totalSessions) * 100)}%` }} />
                      </div>
                      <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{activeP.usedSessions}/{activeP.totalSessions}</span>
                    </div>
                    <div className="text-[10px] text-gray-500 dark:text-gray-400">Treinos executados na prescrição atual</div>
                  </div>
                )
              })()}

              {/* Prescription History */}
              {(() => {
                const history = prescriptions.filter(p => p.studentId === selected.id)
                if (history.length <= 1) return null
                return (
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Histórico de Prescrições</h4>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {history.map(p => (
                        <div key={p.id} className={`rounded-lg border px-3 py-2 ${p.isActive ? 'border-brand-200 dark:border-brand-800 bg-brand-50 dark:bg-brand-900/20' : 'border-gray-100 dark:border-gray-700'}`}>
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{p.code}{p.name ? ` — ${p.name}` : ''}</span>
                            {p.isActive ? (
                              <span className="text-[10px] font-bold text-green-600 dark:text-green-400">Atual</span>
                            ) : (
                              <span className="text-[10px] text-gray-400">{p.usedSessions}/{p.totalSessions} treinos</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })()}

              {/* Actions */}
              <div className="flex gap-3">
                <button onClick={() => setSelected(null)} className="flex-1 rounded-xl border border-gray-300 dark:border-gray-600 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">Fechar</button>
                <a href={`/trainer/students/${selected.id}`} className="flex-1 text-center rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700">Ver Evolução</a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 p-6 shadow-2xl border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-display text-lg font-bold text-gray-900 dark:text-white">Novo Aluno</h3>
              <button onClick={() => { setShowAddModal(false); setAddError('') }} className="rounded-lg p-1 hover:bg-gray-100 dark:hover:bg-gray-800"><X className="h-5 w-5 text-gray-500 dark:text-gray-400" /></button>
            </div>
            {addError && <div className="mb-4 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-700 dark:text-red-400">{addError}</div>}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nome completo *</label>
                <input type="text" value={addForm.fullName} onChange={e => setAddForm(f => ({...f, fullName: e.target.value}))}
                  className="mt-1 w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                  placeholder="Nome do aluno"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email *</label>
                <input type="email" value={addForm.email} onChange={e => setAddForm(f => ({...f, email: e.target.value}))}
                  className="mt-1 w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                  placeholder="aluno@email.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">WhatsApp</label>
                <input type="tel" value={addForm.phone} onChange={e => setAddForm(f => ({...f, phone: e.target.value}))}
                  className="mt-1 w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                  placeholder="(21) 99999-9999"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Classificação *</label>
                <select value={addForm.source} onChange={e => setAddForm(f => ({...f, source: e.target.value}))}
                  className="mt-1 w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-2.5 text-sm text-gray-900 dark:text-white focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100">
                  <option value="direct">Matriculado (aluno da academia)</option>
                  <option value="wellhub">Wellhub</option>
                  <option value="totalpass">TotalPass</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => { setShowAddModal(false); setAddError('') }} className="flex-1 rounded-xl border border-gray-300 dark:border-gray-600 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800">Cancelar</button>
                <button onClick={handleAddStudent} disabled={saving || !addForm.fullName || !addForm.email}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {saving ? 'Cadastrando...' : 'Cadastrar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
