'use client'

import { useState } from 'react'
import Link from 'next/link'
import { signUp } from '@/actions/auth'
import { Zap, Eye, EyeOff, Loader2, CheckCircle2 } from 'lucide-react'

export default function RegisterPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(formData: FormData) {
    setLoading(true)
    setError('')
    const result = await signUp(formData)
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    } else if (result?.message) {
      setSuccess(result.message)
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="lg:hidden mb-8 flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600">
          <Zap className="h-5 w-5 text-white" />
        </div>
        <span className="font-display text-xl font-bold text-gray-900">
          Fit<span className="text-brand-600">Flow</span>
        </span>
      </div>

      <h1 className="font-display text-2xl font-bold text-gray-900">
        Crie sua conta gratuita
      </h1>
      <p className="mt-2 text-sm text-gray-500">
        14 dias gratis. Sem cartao de credito.
      </p>

      {error && (
        <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {success && (
        <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700 flex items-start gap-2">
          <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
          {success}
        </div>
      )}

      <form action={handleSubmit} className="mt-8 space-y-5">
        <div>
          <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">
            Nome completo
          </label>
          <input
            id="fullName"
            name="fullName"
            type="text"
            required
            className="mt-1.5 block w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 transition-all"
            placeholder="Seu nome"
          />
        </div>

        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className="mt-1.5 block w-full rounded-xl border border-gray-300 px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 transition-all"
            placeholder="seu@email.com"
          />
        </div>

        <div>
          <label htmlFor="password" className="block text-sm font-medium text-gray-700">
            Senha
          </label>
          <div className="relative mt-1.5">
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              required
              minLength={6}
              autoComplete="new-password"
              className="block w-full rounded-xl border border-gray-300 px-4 py-3 pr-11 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 transition-all"
              placeholder="Minimo 6 caracteres"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-brand-200/50 transition-all hover:bg-brand-700 disabled:opacity-60"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
          {loading ? 'Criando conta...' : 'Criar conta gratis'}
        </button>

        <p className="text-xs text-center text-gray-400">
          Ao criar uma conta, voce concorda com os{' '}
          <a href="#" className="text-brand-600 hover:underline">Termos de Uso</a>
          {' '}e{' '}
          <a href="#" className="text-brand-600 hover:underline">Politica de Privacidade</a>.
        </p>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        Ja tem uma conta?{' '}
        <Link href="/login" className="font-medium text-brand-600 hover:text-brand-700">
          Entrar
        </Link>
      </p>
    </div>
  )
}
