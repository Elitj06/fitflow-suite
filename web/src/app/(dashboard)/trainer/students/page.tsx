'use client'

import { useState } from 'react'
import {
  Users, Search, Plus, Filter, MoreHorizontal,
  Mail, Phone, Coins, Calendar, CheckCircle2,
  X, Loader2, ChevronRight, Star, Flame,
  ArrowUpRight, TrendingUp,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Student {
  id: string
  name: string
  initials: string
  email: string
  phone: string
  coins: number
  streak: number
  totalClasses: number
  lastCheckin: string
  status: 'active' | 'inactive'
  source: 'direct' | 'wellhub' | 'totalpass'
  plan?: string
}

const MOCK_STUDENTS: Student[] = [
  { id: '1', name: 'Ana Silva', initials: 'AS', email: 'ana@email.com', phone: '(21) 99999-1111', coins: 284, streak: 15, totalClasses: 87, lastCheckin: 'Hoje, 08:15', status: 'active', source: 'direct', plan: 'Pro Mensal' },
  { id: '2', name: 'Carlos Mendes', initials: 'CM', email: 'carlos@email.com', phone: '(21) 99999-2222', coins: 231, streak: 12, totalClasses: 64, lastCheckin: 'Hoje, 09:00', status: 'active', source: 'direct', plan: 'Pro Mensal' },
  { id: '3', name: 'Julia Costa', initials: 'JC', email: 'julia@email.com', phone: '(21) 99999-3333', coins: 198, streak: 8, totalClasses: 52, lastCheckin: 'Ontem', status: 'active', source: 'wellhub', plan: 'Wellhub' },
  { id: '4', name: 'Pedro Santos', initials: 'PS', email: 'pedro@email.com', phone: '(21) 99999-4444', coins: 176, streak: 6, totalClasses: 41, lastCheckin: 'Ontem', status: 'active', source: 'totalpass', plan: 'TotalPass 1+' },
  { id: '5', name: 'Maria Oliveira', initials: 'MO', email: 'maria@email.com', phone: '(21) 99999-5555', coins: 152, streak: 10, totalClasses: 93, lastCheckin: 'Ha 2 dias', status: 'active', source: 'direct', plan: 'Business Trimestral' },
  { id: '6', name: 'Rafael Lima', initials: 'RL', email: 'rafael@email.com', phone: '(21) 99999-6666', coins: 134, streak: 4, totalClasses: 28, lastCheckin: 'Ha 3 dias', status: 'active', source: 'wellhub', plan: 'Wellhub' },
  { id: '7', name: 'Fernanda Alves', initials: 'FA', email: 'fernanda@email.com', phone: '(21) 99999-7777', coins: 45, streak: 0, totalClasses: 12, lastCheckin: 'Ha 15 dias', status: 'inactive', source: 'direct', plan: 'Starter Mensal' },
]

const SOURCE_BADGE = {
  direct: { label: 'Direto', color: 'bg-brand-100 text-brand-700' },
  wellhub: { label: 'Wellhub', color: 'bg-orange-100 text-orange-700' },
  totalpass: { label: 'TotalPass', color: 'bg-purple-100 text-purple-700' },
}

export default function StudentsPage() {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<'all' | 'active' | 'inactive' | 'wellhub' | 'totalpass'>('all')
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null)

  const filtered = MOCK_STUDENTS.filter((s) => {
    const matchesSearch = s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase()) ||
      s.phone.includes(search)
    const matchesFilter =
      filter === 'all' ? true :
      filter === 'active' ? s.status === 'active' :
      filter === 'inactive' ? s.status === 'inactive' :
      filter === 'wellhub' ? s.source === 'wellhub' :
      filter === 'totalpass' ? s.source === 'totalpass' :
      true
    return matchesSearch && matchesFilter
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-900">Alunos</h1>
          <p className="mt-1 text-sm text-gray-500">
            {MOCK_STUDENTS.filter(s => s.status === 'active').length} ativos, {MOCK_STUDENTS.length} total
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-700"
        >
          <Plus className="h-4 w-4" />
          Novo Aluno
        </button>
      </div>

      {/* Source stats */}
      <div className="grid gap-3 sm:grid-cols-4">
        {[
          { label: 'Total Ativos', value: MOCK_STUDENTS.filter(s => s.status === 'active').length, color: 'brand' },
          { label: 'Diretos', value: MOCK_STUDENTS.filter(s => s.source === 'direct').length, color: 'blue' },
          { label: 'Wellhub', value: MOCK_STUDENTS.filter(s => s.source === 'wellhub').length, color: 'orange' },
          { label: 'TotalPass', value: MOCK_STUDENTS.filter(s => s.source === 'totalpass').length, color: 'purple' },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-gray-200 bg-white px-4 py-3 flex items-center gap-3">
            <div className="font-display text-2xl font-bold text-gray-900">{stat.value}</div>
            <div className="text-xs text-gray-500">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Search + Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por nome, email ou telefone..."
            className="w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-11 pr-4 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {[
            { key: 'all', label: 'Todos' },
            { key: 'active', label: 'Ativos' },
            { key: 'inactive', label: 'Inativos' },
            { key: 'wellhub', label: 'Wellhub' },
            { key: 'totalpass', label: 'TotalPass' },
          ].map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key as any)}
              className={cn(
                'rounded-lg px-3 py-2 text-xs font-medium border transition-all',
                filter === f.key ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-gray-200 text-gray-600 hover:border-gray-300'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Students table */}
      <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Aluno</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Origem</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">FitCoins</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Sequencia</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Aulas</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Ultimo Check-in</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map((student) => (
                <tr
                  key={student.id}
                  onClick={() => setSelectedStudent(student)}
                  className="hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
                        {student.initials}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-gray-900">{student.name}</div>
                        <div className="text-xs text-gray-500">{student.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold', SOURCE_BADGE[student.source].color)}>
                      {SOURCE_BADGE[student.source].label}
                    </span>
                    {student.plan && <div className="mt-0.5 text-[10px] text-gray-400">{student.plan}</div>}
                  </td>
                  <td className="px-4 py-4 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Coins className="h-3.5 w-3.5 text-yellow-500" />
                      <span className="text-sm font-semibold text-gray-900">{student.coins}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Flame className={cn('h-3.5 w-3.5', student.streak > 0 ? 'text-orange-500' : 'text-gray-300')} />
                      <span className="text-sm font-medium text-gray-700">{student.streak}d</span>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-center text-sm text-gray-700">{student.totalClasses}</td>
                  <td className="px-4 py-4 text-sm text-gray-500">{student.lastCheckin}</td>
                  <td className="px-4 py-4 text-center">
                    <span className={cn(
                      'rounded-full px-2 py-0.5 text-[10px] font-bold',
                      student.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                    )}>
                      {student.status === 'active' ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Student detail sidebar */}
      {selectedStudent && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm" onClick={() => setSelectedStudent(null)}>
          <div className="w-full max-w-md bg-white shadow-2xl overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 flex items-center justify-between border-b border-gray-100 bg-white px-6 py-4">
              <h3 className="font-display text-lg font-bold text-gray-900">Detalhes do Aluno</h3>
              <button onClick={() => setSelectedStudent(null)} className="rounded-lg p-1 hover:bg-gray-100">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-100 text-xl font-bold text-brand-700">
                  {selectedStudent.initials}
                </div>
                <div>
                  <div className="text-lg font-bold text-gray-900">{selectedStudent.name}</div>
                  <div className={cn('inline-block rounded-full px-2 py-0.5 text-xs font-bold mt-1', SOURCE_BADGE[selectedStudent.source].color)}>
                    {SOURCE_BADGE[selectedStudent.source].label} {selectedStudent.plan && `— ${selectedStudent.plan}`}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl bg-yellow-50 p-3 text-center">
                  <Coins className="mx-auto h-5 w-5 text-yellow-600" />
                  <div className="mt-1 font-display text-xl font-bold text-gray-900">{selectedStudent.coins}</div>
                  <div className="text-[10px] text-gray-500">FitCoins</div>
                </div>
                <div className="rounded-xl bg-orange-50 p-3 text-center">
                  <Flame className="mx-auto h-5 w-5 text-orange-500" />
                  <div className="mt-1 font-display text-xl font-bold text-gray-900">{selectedStudent.streak}</div>
                  <div className="text-[10px] text-gray-500">Dias seguidos</div>
                </div>
                <div className="rounded-xl bg-brand-50 p-3 text-center">
                  <Calendar className="mx-auto h-5 w-5 text-brand-600" />
                  <div className="mt-1 font-display text-xl font-bold text-gray-900">{selectedStudent.totalClasses}</div>
                  <div className="text-[10px] text-gray-500">Aulas total</div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-700">{selectedStudent.email}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-700">{selectedStudent.phone}</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-700">Ultimo check-in: {selectedStudent.lastCheckin}</span>
                </div>
              </div>

              <div className="flex gap-3">
                <button className="flex-1 rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
                  Agendar Aula
                </button>
                <button className="flex-1 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700">
                  Enviar Mensagem
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add student modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="font-display text-lg font-bold text-gray-900">Novo Aluno</h3>
              <button onClick={() => setShowAddModal(false)} className="rounded-lg p-1 hover:bg-gray-100">
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Nome completo</label>
                <input type="text" className="mt-1 w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Email</label>
                <input type="email" className="mt-1 w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">WhatsApp</label>
                <input type="tel" className="mt-1 w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100" placeholder="(21) 99999-9999" />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowAddModal(false)} className="flex-1 rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
                  Cancelar
                </button>
                <button onClick={() => setShowAddModal(false)} className="flex-1 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700">
                  Cadastrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
