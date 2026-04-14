'use client'

import { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import { signIn } from '@/actions/auth'
import { Zap, Eye, EyeOff, Loader2, AlertCircle } from 'lucide-react'

function LoginForm() {
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const searchParams = useSearchParams()
  const router = useRouter()

  useEffect(() => {
    const errorParam = searchParams.get('error')
    if (errorParam) setError(decodeURIComponent(errorParam))
  }, [searchParams])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const formData = new FormData()
    formData.set('email', email)
    formData.set('password', password)
    const result = await signIn(formData)
    if (result?.error) {
      setError(result.error)
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="lg:hidden mb-8 flex items-center gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600">
          <Zap className="h-5 w-5 text-white" />
        </div>
        <span className="font-display text-xl font-bold text-gray-900 dark:text-white">
          Fit<span className="text-brand-600">Flow</span>
        </span>
      </div>

      <h1 className="font-display text-2xl font-bold text-gray-900 dark:text-white">Bem-vindo de volta</h1>
      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Entre na sua conta para acessar o painel.</p>

      {error && (
        <div className="mt-4 flex items-start gap-2 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20 p-3 text-sm text-red-700 dark:text-red-400">
          <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Email</label>
          <input id="email" name="email" type="email" required autoComplete="email"
            value={email} onChange={e => setEmail(e.target.value)}
            className="mt-1.5 block w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:focus:ring-brand-900 transition-all"
            placeholder="seu@email.com" />
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Senha</label>
            <a href="#" className="text-xs font-medium text-brand-600 hover:text-brand-700">Esqueceu a senha?</a>
          </div>
          <div className="relative mt-1.5">
            <input id="password" name="password" type={showPassword ? 'text' : 'password'}
              required autoComplete="current-password"
              value={password} onChange={e => setPassword(e.target.value)}
              className="block w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-3 pr-11 text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100 dark:focus:ring-brand-900 transition-all"
              placeholder="••••••••" />
            <button type="button" onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 z-10">
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        <button type="submit" disabled={loading}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-brand-200/50 dark:shadow-brand-900/30 transition-all hover:bg-brand-700 disabled:opacity-60">
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
        Nao tem uma conta?{' '}
        <Link href="/register" className="font-medium text-brand-600 hover:text-brand-700">
          Criar conta gratis
        </Link>
      </p>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="animate-pulse h-64 rounded-xl bg-gray-100 dark:bg-gray-800" />}>
      <LoginForm />
    </Suspense>
  )
}
