'use client'

import { useState } from 'react'
import {
  Bot, MessageSquare, Calendar, ShoppingCart, Settings,
  Wifi, WifiOff, QrCode, BarChart3, Clock, Users,
  Zap, ArrowUpRight, CheckCircle2, AlertCircle, Save,
  Loader2, RefreshCw, TestTube, Send,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const MOCK_STATS = {
  totalMessages: 1247,
  todayMessages: 34,
  bookingsViaBot: 89,
  salesViaBot: 23,
  avgResponseTime: '2.3s',
  satisfactionRate: '94%',
}

const MOCK_RECENT_CONVERSATIONS = [
  { id: '1', contact: 'Ana Silva', lastMessage: 'Quero agendar para amanha as 8h', time: '5 min', mode: 'SCHEDULING', unread: true },
  { id: '2', contact: 'Carlos Mendes', lastMessage: 'Obrigado! Ja esta confirmado.', time: '12 min', mode: 'ATTENDANCE', unread: false },
  { id: '3', contact: '+55 21 99876-5432', lastMessage: 'Quais planos voces tem?', time: '25 min', mode: 'SALES', unread: true },
  { id: '4', contact: 'Maria Oliveira', lastMessage: 'Posso cancelar a aula de sexta?', time: '1h', mode: 'SCHEDULING', unread: false },
  { id: '5', contact: '+55 21 98765-1234', lastMessage: 'Boa tarde, qual o horario?', time: '2h', mode: 'ATTENDANCE', unread: false },
]

const MODE_CONFIG = {
  ATTENDANCE: { label: 'Atendimento', color: 'bg-blue-100 text-blue-700', icon: MessageSquare },
  SCHEDULING: { label: 'Agendamento', color: 'bg-green-100 text-green-700', icon: Calendar },
  SALES: { label: 'Vendas', color: 'bg-amber-100 text-amber-700', icon: ShoppingCart },
}

export default function ChatbotPage() {
  const [tab, setTab] = useState<'overview' | 'config' | 'test'>('overview')
  const [connected, setConnected] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testMessage, setTestMessage] = useState('')
  const [testResponse, setTestResponse] = useState('')
  const [testLoading, setTestLoading] = useState(false)

  // Config state
  const [config, setConfig] = useState({
    welcomeMessage: 'Ola! Bem-vindo ao Studio Fitness Premium. Como posso ajudar? 💪',
    businessHours: 'Segunda a Sexta, 6h as 22h. Sabado 8h as 18h.',
    aiPersonality: 'amigavel e profissional',
    attendanceEnabled: true,
    schedulingEnabled: true,
    salesEnabled: true,
    autoReply: true,
    humanHandoffMessage: 'Vou transferir voce para um de nossos atendentes. Aguarde um momento!',
  })

  function handleSave() {
    setSaving(true)
    setTimeout(() => setSaving(false), 1500)
  }

  function handleTest() {
    if (!testMessage.trim()) return
    setTestLoading(true)
    setTestResponse('')
    setTimeout(() => {
      setTestResponse(
        'Ola! Claro, posso ajudar com o agendamento. Temos horarios disponiveis amanha:\n\n' +
        '• 08:00 - Personal Training\n' +
        '• 09:00 - Personal Training\n' +
        '• 10:00 - Treino em Grupo (3 vagas)\n\n' +
        'Qual horario prefere? 😊'
      )
      setTestLoading(false)
    }, 2000)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-green-400 to-emerald-600 shadow-md shadow-green-200">
            <Bot className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="font-display text-2xl font-bold text-gray-900">FitBot IA</h1>
            <div className="flex items-center gap-2 mt-0.5">
              {connected ? (
                <span className="flex items-center gap-1 text-xs font-semibold text-green-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                  Conectado ao WhatsApp
                </span>
              ) : (
                <span className="flex items-center gap-1 text-xs font-semibold text-red-500">
                  <WifiOff className="h-3 w-3" />
                  Desconectado
                </span>
              )}
            </div>
          </div>
        </div>

        {!connected && (
          <button className="flex items-center gap-2 rounded-xl bg-green-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-green-700">
            <QrCode className="h-4 w-4" />
            Conectar WhatsApp
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-xl border border-gray-200 bg-gray-100 p-1 w-fit">
        {[
          { key: 'overview', label: 'Visao Geral', icon: BarChart3 },
          { key: 'config', label: 'Configuracao', icon: Settings },
          { key: 'test', label: 'Testar Bot', icon: TestTube },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as any)}
            className={cn('flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium transition-all',
              tab === t.key ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            )}
          >
            <t.icon className="h-3.5 w-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {/* Overview tab */}
      {tab === 'overview' && (
        <div className="space-y-6">
          {/* Stats */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { label: 'Mensagens Hoje', value: MOCK_STATS.todayMessages, icon: MessageSquare, color: '#6366f1' },
              { label: 'Agendamentos via Bot', value: MOCK_STATS.bookingsViaBot, icon: Calendar, color: '#10b981' },
              { label: 'Vendas via Bot', value: MOCK_STATS.salesViaBot, icon: ShoppingCart, color: '#f59e0b' },
              { label: 'Tempo de Resposta', value: MOCK_STATS.avgResponseTime, icon: Clock, color: '#8b5cf6' },
              { label: 'Satisfacao', value: MOCK_STATS.satisfactionRate, icon: Zap, color: '#ec4899' },
              { label: 'Total de Mensagens', value: MOCK_STATS.totalMessages, icon: BarChart3, color: '#14b8a6' },
            ].map((stat) => (
              <div key={stat.label} className="rounded-2xl border border-gray-200 bg-white p-5">
                <div className="inline-flex rounded-xl p-2" style={{ backgroundColor: stat.color + '15', color: stat.color }}>
                  <stat.icon className="h-5 w-5" />
                </div>
                <div className="mt-3 font-display text-2xl font-bold text-gray-900">{stat.value}</div>
                <div className="text-sm text-gray-500">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Recent conversations */}
          <div className="rounded-2xl border border-gray-200 bg-white">
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
              <h3 className="font-display text-base font-semibold text-gray-900">Conversas Recentes</h3>
              <a href="/chatbot/conversations" className="text-sm font-medium text-brand-600 hover:text-brand-700">
                Ver todas
              </a>
            </div>
            <div className="divide-y divide-gray-100">
              {MOCK_RECENT_CONVERSATIONS.map((conv) => {
                const modeConf = MODE_CONFIG[conv.mode as keyof typeof MODE_CONFIG]
                return (
                  <div key={conv.id} className="flex items-center gap-4 px-6 py-4 hover:bg-gray-50 transition-colors cursor-pointer">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100 text-sm font-bold text-gray-600">
                      {conv.contact.startsWith('+') ? '?' : conv.contact.split(' ').map(n => n[0]).join('').substring(0, 2)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900 truncate">{conv.contact}</span>
                        {conv.unread && <span className="h-2 w-2 rounded-full bg-brand-500" />}
                      </div>
                      <div className="text-xs text-gray-500 truncate">{conv.lastMessage}</div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold', modeConf.color)}>
                        {modeConf.label}
                      </span>
                      <span className="text-xs text-gray-400">{conv.time}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Config tab */}
      {tab === 'config' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-gray-200 bg-white p-6 space-y-6">
            <h3 className="font-display text-lg font-semibold text-gray-900">Configuracoes do Bot</h3>

            <div>
              <label className="block text-sm font-medium text-gray-700">Mensagem de boas-vindas</label>
              <textarea
                rows={3}
                value={config.welcomeMessage}
                onChange={(e) => setConfig({ ...config, welcomeMessage: e.target.value })}
                className="mt-1.5 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 resize-none"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Horario de funcionamento</label>
              <input
                type="text"
                value={config.businessHours}
                onChange={(e) => setConfig({ ...config, businessHours: e.target.value })}
                className="mt-1.5 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Personalidade da IA</label>
              <select
                value={config.aiPersonality}
                onChange={(e) => setConfig({ ...config, aiPersonality: e.target.value })}
                className="mt-1.5 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
              >
                <option value="amigavel e profissional">Amigavel e Profissional</option>
                <option value="formal e objetivo">Formal e Objetivo</option>
                <option value="casual e descontraido">Casual e Descontraido</option>
                <option value="motivador e energetico">Motivador e Energetico</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">Modos ativos</label>
              <div className="space-y-3">
                {[
                  { key: 'attendanceEnabled', label: 'Atendimento', desc: 'Responde duvidas e FAQ automaticamente', icon: MessageSquare, color: 'blue' },
                  { key: 'schedulingEnabled', label: 'Agendamento', desc: 'Marca e gerencia sessoes via WhatsApp', icon: Calendar, color: 'green' },
                  { key: 'salesEnabled', label: 'Vendas', desc: 'Apresenta planos e fecha vendas', icon: ShoppingCart, color: 'amber' },
                ].map((mode) => (
                  <label key={mode.key} className="flex items-center gap-4 rounded-xl border border-gray-200 p-4 cursor-pointer hover:bg-gray-50 transition-colors">
                    <input
                      type="checkbox"
                      checked={config[mode.key as keyof typeof config] as boolean}
                      onChange={(e) => setConfig({ ...config, [mode.key]: e.target.checked })}
                      className="h-4 w-4 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                    />
                    <mode.icon className={cn('h-5 w-5', `text-${mode.color}-500`)} />
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">{mode.label}</div>
                      <div className="text-xs text-gray-500">{mode.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Mensagem de transferencia para humano</label>
              <input
                type="text"
                value={config.humanHandoffMessage}
                onChange={(e) => setConfig({ ...config, humanHandoffMessage: e.target.value })}
                className="mt-1.5 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
              />
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 rounded-xl bg-brand-600 px-6 py-3 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              {saving ? 'Salvando...' : 'Salvar Configuracoes'}
            </button>
          </div>
        </div>
      )}

      {/* Test tab */}
      {tab === 'test' && (
        <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
          <div className="border-b border-gray-100 px-6 py-4">
            <h3 className="font-display text-base font-semibold text-gray-900">Simular Conversa</h3>
            <p className="text-xs text-gray-500 mt-0.5">Teste o FitBot antes de ativar para seus clientes</p>
          </div>

          {/* Chat area */}
          <div className="h-96 bg-[#ece5dd] p-4 overflow-y-auto space-y-3">
            {testResponse && (
              <>
                {/* User message */}
                <div className="flex justify-end">
                  <div className="max-w-[70%] rounded-2xl rounded-br-md bg-[#dcf8c6] px-4 py-2 shadow-sm">
                    <p className="text-sm text-gray-900">{testMessage}</p>
                    <p className="text-[10px] text-gray-500 text-right mt-1">Agora</p>
                  </div>
                </div>
                {/* Bot response */}
                <div className="flex justify-start">
                  <div className="max-w-[70%] rounded-2xl rounded-bl-md bg-white px-4 py-2 shadow-sm">
                    <div className="flex items-center gap-1 mb-1">
                      <Bot className="h-3 w-3 text-green-600" />
                      <span className="text-[10px] font-bold text-green-600">FitBot IA</span>
                    </div>
                    <p className="text-sm text-gray-900 whitespace-pre-line">{testResponse}</p>
                    <p className="text-[10px] text-gray-500 text-right mt-1">Agora</p>
                  </div>
                </div>
              </>
            )}
            {testLoading && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-md bg-white px-4 py-3 shadow-sm">
                  <div className="flex gap-1">
                    <span className="h-2 w-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="h-2 w-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: '200ms' }} />
                    <span className="h-2 w-2 rounded-full bg-gray-300 animate-bounce" style={{ animationDelay: '400ms' }} />
                  </div>
                </div>
              </div>
            )}
            {!testResponse && !testLoading && (
              <div className="flex h-full items-center justify-center text-center">
                <div>
                  <Bot className="mx-auto h-12 w-12 text-gray-300" />
                  <p className="mt-2 text-sm text-gray-400">
                    Envie uma mensagem para testar o FitBot
                  </p>
                  <p className="text-xs text-gray-300 mt-1">
                    Tente: "Quero agendar uma aula amanha"
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t border-gray-200 px-4 py-3 flex gap-2">
            <input
              type="text"
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleTest()}
              placeholder="Digite uma mensagem de teste..."
              className="flex-1 rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
            <button
              onClick={handleTest}
              disabled={testLoading || !testMessage.trim()}
              className="flex items-center gap-2 rounded-xl bg-green-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              Enviar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
