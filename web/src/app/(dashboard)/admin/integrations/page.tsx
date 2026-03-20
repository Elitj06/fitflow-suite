'use client'

import { useState } from 'react'
import {
  Settings, CheckCircle2, XCircle, Loader2, Save,
  ExternalLink, Shield, Wifi, WifiOff, AlertTriangle,
  Link2, Unlink, TestTube, Zap,
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface IntegrationConfig {
  enabled: boolean
  status: 'connected' | 'disconnected' | 'error'
  lastSync?: string
}

export default function IntegrationsPage() {
  const [saving, setSaving] = useState<string | null>(null)
  const [testing, setTesting] = useState<string | null>(null)

  // Wellhub config
  const [wellhub, setWellhub] = useState({
    enabled: false,
    partnerId: '',
    secretKey: '',
    webhookUrl: '',
    status: 'disconnected' as 'connected' | 'disconnected' | 'error',
  })

  // TotalPass config
  const [totalpass, setTotalpass] = useState({
    enabled: false,
    apiKey: '',
    integrationCode: '',
    mode: 'checkin_only' as 'checkin_only' | 'booking_and_checkin',
    status: 'disconnected' as 'connected' | 'disconnected' | 'error',
  })

  function handleSaveWellhub() {
    setSaving('wellhub')
    setTimeout(() => {
      setWellhub(prev => ({ ...prev, status: prev.enabled ? 'connected' : 'disconnected' }))
      setSaving(null)
    }, 1500)
  }

  function handleSaveTotalPass() {
    setSaving('totalpass')
    setTimeout(() => {
      setTotalpass(prev => ({ ...prev, status: prev.enabled ? 'connected' : 'disconnected' }))
      setSaving(null)
    }, 1500)
  }

  function handleTest(provider: string) {
    setTesting(provider)
    setTimeout(() => setTesting(null), 2000)
  }

  const STATUS_UI = {
    connected: { label: 'Conectado', icon: CheckCircle2, color: 'text-green-600 bg-green-50 border-green-200' },
    disconnected: { label: 'Desconectado', icon: WifiOff, color: 'text-gray-500 bg-gray-50 border-gray-200' },
    error: { label: 'Erro', icon: AlertTriangle, color: 'text-red-600 bg-red-50 border-red-200' },
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-gray-900">Integracoes</h1>
        <p className="mt-1 text-sm text-gray-500">
          Conecte Wellhub (Gympass) e TotalPass para receber check-ins e agendamentos automaticamente.
        </p>
      </div>

      {/* Info banner */}
      <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5 flex gap-4">
        <Shield className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
        <div>
          <h3 className="text-sm font-semibold text-blue-900">Como funciona</h3>
          <p className="mt-1 text-sm text-blue-700 leading-relaxed">
            Quando um aluno faz check-in pelo app Wellhub ou TotalPass, o FitFlow recebe a notificacao
            automaticamente, registra a presenca e credita FitCoins. Sem intervencao manual.
          </p>
        </div>
      </div>

      {/* WELLHUB */}
      <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100">
              <span className="text-lg font-bold text-orange-600">W</span>
            </div>
            <div>
              <h2 className="font-display text-base font-bold text-gray-900">Wellhub</h2>
              <p className="text-xs text-gray-500">Antigo Gympass — Check-in, Booking e Status de usuario</p>
            </div>
          </div>
          <div className={cn('flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold', STATUS_UI[wellhub.status].color)}>
            {(() => { const Icon = STATUS_UI[wellhub.status].icon; return <Icon className="h-3.5 w-3.5" /> })()}
            {STATUS_UI[wellhub.status].label}
          </div>
        </div>

        <div className="p-6 space-y-5">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={wellhub.enabled}
              onChange={(e) => setWellhub(prev => ({ ...prev, enabled: e.target.checked }))}
              className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
            />
            <span className="text-sm font-medium text-gray-700">Ativar integracao Wellhub</span>
          </label>

          {wellhub.enabled && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Partner ID</label>
                  <input
                    type="text"
                    value={wellhub.partnerId}
                    onChange={(e) => setWellhub(prev => ({ ...prev, partnerId: e.target.value }))}
                    className="mt-1.5 w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                    placeholder="Fornecido pelo Wellhub"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Secret Key</label>
                  <input
                    type="password"
                    value={wellhub.secretKey}
                    onChange={(e) => setWellhub(prev => ({ ...prev, secretKey: e.target.value }))}
                    className="mt-1.5 w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                    placeholder="Chave secreta para verificar webhooks"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Webhook URL</label>
                <div className="mt-1.5 flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={`${typeof window !== 'undefined' ? window.location.origin : ''}/api/webhooks/wellhub?orgId=SEU_ORG_ID`}
                    className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-500"
                  />
                  <button
                    onClick={() => navigator.clipboard?.writeText(`${window.location.origin}/api/webhooks/wellhub?orgId=SEU_ORG_ID`)}
                    className="rounded-xl border border-gray-300 px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Copiar
                  </button>
                </div>
                <p className="mt-1.5 text-xs text-gray-400">
                  Cadastre esta URL no portal de parceiros Wellhub para check-in, booking e user status.
                </p>
              </div>

              <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-800">
                <strong>Importante:</strong> Registre DUAS URLs no portal Wellhub — uma para Cancel e uma para Change.
                Apos registrar, informe ao seu contato tecnico do Wellhub para ativar os webhooks no lado deles.
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => handleTest('wellhub')}
                  disabled={testing === 'wellhub'}
                  className="flex items-center gap-2 rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  {testing === 'wellhub' ? <Loader2 className="h-4 w-4 animate-spin" /> : <TestTube className="h-4 w-4" />}
                  Testar Conexao
                </button>
                <button
                  onClick={handleSaveWellhub}
                  disabled={saving === 'wellhub'}
                  className="flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
                >
                  {saving === 'wellhub' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Salvar
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* TOTALPASS */}
      <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100">
              <span className="text-lg font-bold text-purple-600">T</span>
            </div>
            <div>
              <h2 className="font-display text-base font-bold text-gray-900">TotalPass</h2>
              <p className="text-xs text-gray-500">Check-in por geolocalização e agendamento de aulas</p>
            </div>
          </div>
          <div className={cn('flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold', STATUS_UI[totalpass.status].color)}>
            {(() => { const Icon = STATUS_UI[totalpass.status].icon; return <Icon className="h-3.5 w-3.5" /> })()}
            {STATUS_UI[totalpass.status].label}
          </div>
        </div>

        <div className="p-6 space-y-5">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={totalpass.enabled}
              onChange={(e) => setTotalpass(prev => ({ ...prev, enabled: e.target.checked }))}
              className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
            />
            <span className="text-sm font-medium text-gray-700">Ativar integracao TotalPass</span>
          </label>

          {totalpass.enabled && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">API Key</label>
                  <input
                    type="text"
                    value={totalpass.apiKey}
                    onChange={(e) => setTotalpass(prev => ({ ...prev, apiKey: e.target.value }))}
                    className="mt-1.5 w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 font-mono"
                    placeholder="XXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
                  />
                  <p className="mt-1 text-xs text-gray-400">Obtida no Portal de Academias TotalPass</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Codigo de Integracao</label>
                  <input
                    type="text"
                    value={totalpass.integrationCode}
                    onChange={(e) => setTotalpass(prev => ({ ...prev, integrationCode: e.target.value }))}
                    className="mt-1.5 w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 font-mono uppercase"
                    placeholder="12ABCD3E"
                    maxLength={8}
                  />
                  <p className="mt-1 text-xs text-gray-400">8 caracteres — unico por unidade</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Modo de integracao</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setTotalpass(prev => ({ ...prev, mode: 'checkin_only' }))}
                    className={cn(
                      'rounded-xl border-2 p-4 text-left transition-all',
                      totalpass.mode === 'checkin_only'
                        ? 'border-brand-500 bg-brand-50'
                        : 'border-gray-200 hover:border-gray-300'
                    )}
                  >
                    <div className="text-sm font-semibold text-gray-900">Apenas Check-in</div>
                    <div className="mt-1 text-xs text-gray-500">
                      Aluno faz check-in no local (150m). Sem reserva previa.
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setTotalpass(prev => ({ ...prev, mode: 'booking_and_checkin' }))}
                    className={cn(
                      'rounded-xl border-2 p-4 text-left transition-all',
                      totalpass.mode === 'booking_and_checkin'
                        ? 'border-brand-500 bg-brand-50'
                        : 'border-gray-200 hover:border-gray-300'
                    )}
                  >
                    <div className="text-sm font-semibold text-gray-900">Booking + Check-in</div>
                    <div className="mt-1 text-xs text-gray-500">
                      Aluno reserva horario antes e faz check-in presencial.
                    </div>
                  </button>
                </div>
              </div>

              {totalpass.mode === 'booking_and_checkin' && (
                <div className="rounded-xl bg-blue-50 border border-blue-200 p-4 text-sm text-blue-800">
                  <strong>Nota:</strong> No modo Booking + Check-in, as aulas do FitFlow serao espelhadas
                  automaticamente no TotalPass. Exclua aulas duplicadas que ja existam no portal TotalPass.
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700">Webhook URL</label>
                <div className="mt-1.5 flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={`${typeof window !== 'undefined' ? window.location.origin : ''}/api/webhooks/totalpass?orgId=SEU_ORG_ID`}
                    className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-500"
                  />
                  <button
                    onClick={() => navigator.clipboard?.writeText(`${window.location.origin}/api/webhooks/totalpass?orgId=SEU_ORG_ID`)}
                    className="rounded-xl border border-gray-300 px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
                  >
                    Copiar
                  </button>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => handleTest('totalpass')}
                  disabled={testing === 'totalpass'}
                  className="flex items-center gap-2 rounded-xl border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  {testing === 'totalpass' ? <Loader2 className="h-4 w-4 animate-spin" /> : <TestTube className="h-4 w-4" />}
                  Testar Conexao
                </button>
                <button
                  onClick={handleSaveTotalPass}
                  disabled={saving === 'totalpass'}
                  className="flex items-center gap-2 rounded-xl bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50"
                >
                  {saving === 'totalpass' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Salvar
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* How to become a partner */}
      <div className="rounded-2xl border border-gray-200 bg-gray-50 p-6">
        <h3 className="font-display text-base font-semibold text-gray-900">Ainda nao e parceiro?</h3>
        <p className="mt-2 text-sm text-gray-600 leading-relaxed">
          Para integrar com Wellhub ou TotalPass, voce precisa se cadastrar como parceiro.
          O processo e gratuito e leva poucos dias.
        </p>
        <div className="mt-4 flex gap-3">
          <a
            href="https://site.gympass.com/br/partners"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <ExternalLink className="h-4 w-4" />
            Seja parceiro Wellhub
          </a>
          <a
            href="https://totalpass.com/br/parceiros"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <ExternalLink className="h-4 w-4" />
            Seja parceiro TotalPass
          </a>
        </div>
      </div>
    </div>
  )
}
