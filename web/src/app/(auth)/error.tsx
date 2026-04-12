'use client'

import { useEffect } from 'react'

export default function AuthError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[Auth Error]', error)
  }, [error])

  return (
    <div className="flex min-h-screen items-center justify-center p-8">
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center max-w-md">
        <h2 className="text-lg font-semibold text-red-800 mb-2">
          Erro de autenticacao
        </h2>
        <p className="text-sm text-red-600 mb-4">
          Nao foi possivel completar a operacao. Tente novamente.
        </p>
        <button
          onClick={reset}
          className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors"
        >
          Tentar novamente
        </button>
      </div>
    </div>
  )
}
