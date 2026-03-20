'use client'

import { useState } from 'react'
import { completeOnboarding } from '@/actions/auth'
import {
  Zap, Building2, Dumbbell, Users, ChevronRight, ChevronLeft,
  Loader2, Sparkles, CheckCircle2,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const STEPS = [
  { id: 1, title: 'Seu negocio', icon: Building2 },
  { id: 2, title: 'Seu perfil', icon: Dumbbell },
  { id: 3, title: 'Prontinho!', icon: Sparkles },
]

const SPECIALTIES = [
  'Musculacao', 'Funcional', 'CrossFit', 'Pilates', 'Yoga',
  'Natacao', 'Lutas', 'Danca', 'Corrida', 'Outro',
]

export default function OnboardingPage() {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [formState, setFormState] = useState({
    orgName: '',
    orgPhone: '',
    role: 'trainer',
    specialty: '',
  })

  function updateField(field: string, value: string) {
    setFormState((prev) => ({ ...prev, [field]: value }))
  }

  async function handleFinish() {
    setLoading(true)
    setError('')

    const fd = new FormData()
    fd.set('orgName', formState.orgName)
    fd.set('orgPhone', formState.orgPhone)
    fd.set('role', formState.role)
    fd.set('specialty', formState.specialty)

    const result = await completeOnboarding(fd)
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-600">
            <Zap className="h-5 w-5 text-white" />
          </div>
          <span className="font-display text-2xl font-bold text-gray-900">
            Fit<span className="text-brand-600">Flow</span>
          </span>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-center gap-3 mb-8">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center gap-3">
              <div className={cn(
                'flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold transition-all',
                step > s.id
                  ? 'bg-success text-white'
                  : step === s.id
                    ? 'bg-brand-600 text-white shadow-md shadow-brand-200'
                    : 'bg-gray-200 text-gray-500'
              )}>
                {step > s.id ? <CheckCircle2 className="h-4 w-4" /> : s.id}
              </div>
              {i < STEPS.length - 1 && (
                <div className={cn(
                  'h-0.5 w-8 rounded-full transition-all',
                  step > s.id ? 'bg-success' : 'bg-gray-200'
                )} />
              )}
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
          {error && (
            <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Step 1: Business */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="font-display text-xl font-bold text-gray-900">
                  Sobre seu negocio
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Conte-nos sobre seu studio ou espaco fitness.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Nome do studio/academia
                </label>
                <input
                  type="text"
                  value={formState.orgName}
                  onChange={(e) => updateField('orgName', e.target.value)}
                  className="mt-1.5 block w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                  placeholder="Ex: Studio Fitness Premium"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  WhatsApp do negocio
                </label>
                <input
                  type="tel"
                  value={formState.orgPhone}
                  onChange={(e) => updateField('orgPhone', e.target.value)}
                  className="mt-1.5 block w-full rounded-xl border border-gray-300 px-4 py-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                  placeholder="(21) 99999-9999"
                />
              </div>

              <button
                onClick={() => setStep(2)}
                disabled={!formState.orgName}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-brand-700 disabled:opacity-40"
              >
                Continuar
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Step 2: Profile */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="font-display text-xl font-bold text-gray-900">
                  Seu perfil
                </h2>
                <p className="mt-1 text-sm text-gray-500">
                  Como voce atua no negocio?
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Sua funcao
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: 'trainer', label: 'Personal Trainer', icon: Dumbbell },
                    { id: 'admin', label: 'Gestor/Dono', icon: Users },
                  ].map((role) => (
                    <button
                      key={role.id}
                      type="button"
                      onClick={() => updateField('role', role.id)}
                      className={cn(
                        'flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all',
                        formState.role === role.id
                          ? 'border-brand-500 bg-brand-50 text-brand-700'
                          : 'border-gray-200 hover:border-gray-300 text-gray-600'
                      )}
                    >
                      <role.icon className="h-6 w-6" />
                      <span className="text-sm font-medium">{role.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Especialidade principal
                </label>
                <div className="flex flex-wrap gap-2">
                  {SPECIALTIES.map((spec) => (
                    <button
                      key={spec}
                      type="button"
                      onClick={() => updateField('specialty', spec)}
                      className={cn(
                        'rounded-full px-3 py-1.5 text-xs font-medium border transition-all',
                        formState.specialty === spec
                          ? 'border-brand-500 bg-brand-50 text-brand-700'
                          : 'border-gray-200 text-gray-600 hover:border-gray-300'
                      )}
                    >
                      {spec}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="flex items-center justify-center gap-1 rounded-xl border border-gray-300 px-4 py-3 text-sm font-medium text-gray-700 transition-all hover:bg-gray-50"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Voltar
                </button>
                <button
                  onClick={() => setStep(3)}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-brand-700"
                >
                  Continuar
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Ready */}
          {step === 3 && (
            <div className="space-y-6 text-center">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-100">
                <Sparkles className="h-8 w-8 text-brand-600" />
              </div>

              <div>
                <h2 className="font-display text-xl font-bold text-gray-900">
                  Tudo pronto!
                </h2>
                <p className="mt-2 text-sm text-gray-500">
                  Vamos configurar o <strong>{formState.orgName}</strong> para voce.
                  Isso inclui servicos padrao, sistema de FitCoins e recompensas.
                </p>
              </div>

              <div className="rounded-xl bg-gray-50 p-4 text-left space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  <span className="text-gray-700">3 servicos padrao criados</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  <span className="text-gray-700">4 recompensas FitCoins configuradas</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  <span className="text-gray-700">Dashboard personalizado</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  <span className="text-gray-700">Check-in QR Code habilitado</span>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(2)}
                  className="flex items-center justify-center gap-1 rounded-xl border border-gray-300 px-4 py-3 text-sm font-medium text-gray-700 transition-all hover:bg-gray-50"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Voltar
                </button>
                <button
                  onClick={handleFinish}
                  disabled={loading}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-brand-200/50 transition-all hover:bg-brand-700 disabled:opacity-60"
                >
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                  {loading ? 'Configurando...' : 'Comecar a usar o FitFlow!'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
