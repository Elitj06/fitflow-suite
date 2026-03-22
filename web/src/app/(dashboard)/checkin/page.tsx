'use client'

import { useState, useEffect, useRef } from 'react'
import {
  QrCode, Search, CheckCircle2, Clock,
  Coins, Sparkles, User, Zap, Loader2, RefreshCw,
  Camera, X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface CheckinItem {
  id: string
  time: string
  student: string
  studentId: string
  service: string
  serviceColor: string
  coinsReward: number
  checkedIn: boolean
  checkinMethod: string | null
  source: string
}

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
  const [items, setItems] = useState<CheckinItem[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [showCoinAnimation, setShowCoinAnimation] = useState<number | null>(null)
  const [mode, setMode] = useState<'list' | 'qr'>('list')
  const [qrInput, setQrInput] = useState('')
  const qrRef = useRef<HTMLInputElement>(null)

  const today = new Date().toISOString().split('T')[0]

  async function loadBookings() {
    setLoading(true)
    try {
      const res = await fetch(`/api/checkin?date=${today}`)
      if (res.ok) setItems(await res.json())
    } catch (e) {
      toast.error('Erro ao carregar agendamentos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadBookings() }, [])

  // Auto-focus QR input when in QR mode
  useEffect(() => {
    if (mode === 'qr') setTimeout(() => qrRef.current?.focus(), 100)
  }, [mode])

  async function doCheckin(bookingId: string, method: 'MANUAL' | 'QR_CODE' = 'MANUAL') {
    if (processing) return
    setProcessing(bookingId)
    try {
      const res = await fetch('/api/checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId, method }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Erro ao registrar check-in')
        return
      }
      // Show coin animation
      if (data.coinsAwarded > 0) {
        setShowCoinAnimation(data.coinsAwarded)
        setTimeout(() => setShowCoinAnimation(null), 2200)
      }
      toast.success(`Check-in de ${data.studentName} — +${data.coinsAwarded} FitCoins!`)
      // Update local state
      setItems((prev) => prev.map((i) => i.id === bookingId ? { ...i, checkedIn: true, checkinMethod: method } : i))
    } catch (e) {
      toast.error('Erro de conexao')
    } finally {
      setProcessing(null)
    }
  }

  // Handle QR code scan — the QR encodes the booking ID
  function handleQrSubmit(e: React.FormEvent) {
    e.preventDefault()
    const id = qrInput.trim()
    if (!id) return
    const item = items.find((i) => i.id === id || i.studentId === id)
    if (!item) {
      toast.error('QR Code nao reconhecido ou sem agendamento hoje')
    } else if (item.checkedIn) {
      toast.info(`${item.student} ja fez check-in`)
    } else {
      doCheckin(item.id, 'QR_CODE')
    }
    setQrInput('')
    qrRef.current?.focus()
  }

  const filtered = items.filter((i) =>
    i.student.toLowerCase().includes(search.toLowerCase()) ||
    i.service.toLowerCase().includes(search.toLowerCase())
  )
  const waitingCount = items.filter((i) => !i.checkedIn).length
  const checkedCount = items.filter((i) => i.checkedIn).length

  return (
    <div className="space-y-6">
      {showCoinAnimation !== null && <CoinAnimation coins={showCoinAnimation} />}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-gray-900">Check-in</h1>
          <p className="mt-1 text-sm text-gray-500">
            {loading ? 'Carregando...' : `${waitingCount} aguardando, ${checkedCount} realizados`}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadBookings}
            className="flex items-center gap-2 rounded-xl border border-gray-300 px-3 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
          <div className="flex rounded-xl border border-gray-300 overflow-hidden">
            <button
              onClick={() => setMode('list')}
              className={cn('flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-all',
                mode === 'list' ? 'bg-brand-600 text-white' : 'text-gray-600 hover:bg-gray-50'
              )}
            >
              <User className="h-4 w-4" /> Lista
            </button>
            <button
              onClick={() => setMode('qr')}
              className={cn('flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-all',
                mode === 'qr' ? 'bg-brand-600 text-white' : 'text-gray-600 hover:bg-gray-50'
              )}
            >
              <QrCode className="h-4 w-4" /> QR Code
            </button>
          </div>
        </div>
      </div>

      {/* QR Mode */}
      {mode === 'qr' && (
        <div className="rounded-2xl border border-gray-200 bg-white p-8 text-center">
          <div className="mx-auto max-w-sm">
            <div className="mx-auto flex h-64 w-64 items-center justify-center rounded-2xl border-2 border-dashed border-brand-300 bg-brand-50">
              <div className="text-center">
                <Camera className="mx-auto h-16 w-16 text-brand-400" />
                <p className="mt-3 text-sm font-medium text-brand-600">Aguardando QR Code</p>
                <p className="mt-1 text-xs text-brand-400">Aponte a camera do leitor aqui</p>
              </div>
            </div>
            <form onSubmit={handleQrSubmit} className="mt-4">
              <input
                ref={qrRef}
                type="text"
                value={qrInput}
                onChange={(e) => setQrInput(e.target.value)}
                placeholder="Ou digite o ID do agendamento..."
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                autoFocus
              />
              <p className="mt-3 text-xs text-gray-500">
                O QR Code do aluno contém o ID do agendamento. O leitor de QR envia automaticamente.
              </p>
            </form>
          </div>
        </div>
      )}

      {/* List Mode */}
      {mode === 'list' && (
        <>
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

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 py-16 text-gray-400">
              <CheckCircle2 className="h-12 w-12 mb-3 opacity-30" />
              <p className="text-sm font-medium">Nenhum agendamento encontrado para hoje</p>
              <p className="text-xs mt-1">Crie agendamentos na aba Agenda</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filtered.map((item) => {
                const initials = item.student.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
                return (
                  <div key={item.id}
                    className={cn(
                      'flex items-center gap-4 rounded-2xl border bg-white p-4 transition-all',
                      item.checkedIn ? 'border-green-200 bg-green-50/50' : 'border-gray-200 hover:border-brand-200 hover:shadow-sm'
                    )}
                  >
                    <div className={cn(
                      'flex h-12 w-12 items-center justify-center rounded-full text-sm font-bold flex-shrink-0',
                      item.checkedIn ? 'bg-green-100 text-green-700' : 'bg-brand-100 text-brand-700'
                    )}>
                      {item.checkedIn ? <CheckCircle2 className="h-5 w-5" /> : initials}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 truncate">{item.student}</span>
                        {item.checkedIn && (
                          <span className="rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-bold text-green-700 uppercase flex-shrink-0">
                            Presente
                          </span>
                        )}
                        {item.source === 'WHATSAPP' && (
                          <span className="rounded-full bg-green-100 px-1.5 py-0.5 text-[9px] font-bold text-green-700 flex-shrink-0">WA</span>
                        )}
                      </div>
                      <div className="mt-0.5 flex items-center gap-3 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(item.time).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        <span className="truncate">{item.service}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 rounded-full bg-yellow-100 px-2.5 py-1 flex-shrink-0">
                      <Coins className="h-3.5 w-3.5 text-yellow-600" />
                      <span className="text-xs font-bold text-yellow-700">+{item.coinsReward}</span>
                    </div>

                    {!item.checkedIn ? (
                      <button
                        onClick={() => doCheckin(item.id, 'MANUAL')}
                        disabled={!!processing}
                        className="flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-brand-700 hover:shadow-md active:scale-95 disabled:opacity-60 flex-shrink-0"
                      >
                        {processing === item.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <><Zap className="h-4 w-4" /> Check-in</>
                        )}
                      </button>
                    ) : (
                      <div className="flex items-center gap-1 text-sm font-medium text-green-600 flex-shrink-0">
                        <CheckCircle2 className="h-4 w-4" /> Feito
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}
    </div>
  )
}
