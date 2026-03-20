'use client'

import { useState } from 'react'
import {
  QrCode, Search, CheckCircle2, XCircle, Clock,
  Coins, Sparkles, User, ArrowRight, Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface CheckinStudent {
  id: string
  name: string
  initials: string
  booking: string
  time: string
  service: string
  coinsReward: number
  status: 'waiting' | 'checked_in'
}

const MOCK_STUDENTS: CheckinStudent[] = [
  { id: '1', name: 'Ana Silva', initials: 'AS', booking: 'b1', time: '08:00', service: 'Personal Training', coinsReward: 2, status: 'checked_in' },
  { id: '2', name: 'Carlos Mendes', initials: 'CM', booking: 'b2', time: '09:00', service: 'Personal Training', coinsReward: 2, status: 'waiting' },
  { id: '3', name: 'Maria Oliveira', initials: 'MO', booking: 'b3', time: '10:00', service: 'Avaliacao Fisica', coinsReward: 3, status: 'waiting' },
  { id: '4', name: 'Grupo A - Pedro', initials: 'PS', booking: 'b4', time: '11:00', service: 'Treino em Grupo', coinsReward: 1, status: 'waiting' },
  { id: '5', name: 'Grupo A - Julia', initials: 'JC', booking: 'b4', time: '11:00', service: 'Treino em Grupo', coinsReward: 1, status: 'waiting' },
  { id: '6', name: 'Grupo A - Rafael', initials: 'RL', booking: 'b4', time: '11:00', service: 'Treino em Grupo', coinsReward: 1, status: 'waiting' },
]

function CoinAnimation({ coins }: { coins: number }) {
  return (
    <div className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center">
      <div className="animate-bounce">
        <div className="flex items-center gap-2 rounded-2xl bg-yellow-400 px-6 py-4 shadow-2xl shadow-yellow-300/50">
          <Coins className="h-8 w-8 text-yellow-800" />
          <span className="font-display text-3xl font-extrabold text-yellow-900">+{coins}</span>
          <Sparkles className="h-6 w-6 text-yellow-700" />
        </div>
      </div>
    </div>
  )
}

export default function CheckinPage() {
  const [students, setStudents] = useState(MOCK_STUDENTS)
  const [search, setSearch] = useState('')
  const [showCoinAnimation, setShowCoinAnimation] = useState<number | null>(null)
  const [mode, setMode] = useState<'list' | 'qr'>('list')

  const filteredStudents = students.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.service.toLowerCase().includes(search.toLowerCase())
  )

  const waitingCount = students.filter((s) => s.status === 'waiting').length
  const checkedCount = students.filter((s) => s.status === 'checked_in').length

  function handleCheckin(studentId: string) {
    const student = students.find((s) => s.id === studentId)
    if (!student || student.status === 'checked_in') return

    // Show coin animation
    setShowCoinAnimation(student.coinsReward)
    setTimeout(() => setShowCoinAnimation(null), 2000)

    // Update status
    setStudents((prev) =>
      prev.map((s) => (s.id === studentId ? { ...s, status: 'checked_in' as const } : s))
    )
  }

  return (
    <div className="space-y-6">
      {/* Coin animation overlay */}
      {showCoinAnimation !== null && <CoinAnimation coins={showCoinAnimation} />}

      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-900">Check-in</h1>
          <p className="mt-1 text-sm text-gray-500">
            {waitingCount} aguardando, {checkedCount} realizados
          </p>
        </div>
        <div className="flex rounded-xl border border-gray-300 overflow-hidden">
          <button
            onClick={() => setMode('list')}
            className={cn('flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-all',
              mode === 'list' ? 'bg-brand-600 text-white' : 'text-gray-600 hover:bg-gray-50'
            )}
          >
            <User className="h-4 w-4" />
            Lista
          </button>
          <button
            onClick={() => setMode('qr')}
            className={cn('flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-all',
              mode === 'qr' ? 'bg-brand-600 text-white' : 'text-gray-600 hover:bg-gray-50'
            )}
          >
            <QrCode className="h-4 w-4" />
            QR Code
          </button>
        </div>
      </div>

      {/* QR Mode */}
      {mode === 'qr' && (
        <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center">
          <div className="mx-auto max-w-sm">
            <div className="mx-auto flex h-64 w-64 items-center justify-center rounded-2xl border-2 border-dashed border-brand-300 bg-brand-50">
              <div className="text-center">
                <QrCode className="mx-auto h-16 w-16 text-brand-400" />
                <p className="mt-3 text-sm font-medium text-brand-600">
                  Camera ativa
                </p>
                <p className="mt-1 text-xs text-brand-400">
                  Aponte o QR Code do aluno aqui
                </p>
              </div>
            </div>
            <p className="mt-4 text-sm text-gray-500">
              O aluno mostra o QR Code no app e voce escaneia para registrar a presenca.
              As FitCoins sao creditadas automaticamente.
            </p>
          </div>
        </div>
      )}

      {/* List Mode */}
      {mode === 'list' && (
        <>
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar aluno ou servico..."
              className="w-full rounded-xl border border-gray-200 bg-white py-3 pl-11 pr-4 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
          </div>

          {/* Student list */}
          <div className="space-y-3">
            {filteredStudents.map((student) => (
              <div
                key={student.id}
                className={cn(
                  'flex items-center gap-4 rounded-2xl border bg-white p-4 transition-all',
                  student.status === 'checked_in'
                    ? 'border-green-200 bg-green-50/50'
                    : 'border-gray-200 hover:border-brand-200 hover:shadow-sm'
                )}
              >
                {/* Avatar */}
                <div className={cn(
                  'flex h-12 w-12 items-center justify-center rounded-full text-sm font-bold',
                  student.status === 'checked_in'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-brand-100 text-brand-700'
                )}>
                  {student.status === 'checked_in' ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    student.initials
                  )}
                </div>

                {/* Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900">{student.name}</span>
                    {student.status === 'checked_in' && (
                      <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-700 uppercase">
                        Presente
                      </span>
                    )}
                  </div>
                  <div className="mt-0.5 flex items-center gap-3 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {student.time}
                    </span>
                    <span>{student.service}</span>
                  </div>
                </div>

                {/* Coins reward indicator */}
                <div className="flex items-center gap-1 rounded-full bg-yellow-100 px-2.5 py-1">
                  <Coins className="h-3.5 w-3.5 text-yellow-600" />
                  <span className="text-xs font-bold text-yellow-700">+{student.coinsReward}</span>
                </div>

                {/* Check-in button */}
                {student.status === 'waiting' ? (
                  <button
                    onClick={() => handleCheckin(student.id)}
                    className="flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-700 hover:shadow-md active:scale-95"
                  >
                    <Zap className="h-4 w-4" />
                    Check-in
                  </button>
                ) : (
                  <div className="flex items-center gap-1 text-sm font-medium text-green-600">
                    <CheckCircle2 className="h-4 w-4" />
                    Feito
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
