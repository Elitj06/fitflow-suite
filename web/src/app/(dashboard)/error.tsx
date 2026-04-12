'use client'

import { useEffect } from 'react'

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[Dashboard Error]', error)
  }, [error])

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-8">
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-center max-w-md">
        <h2 className="text-lg font-semibold text-red-800 mb-2">
          Algo deu errado
        </h2>
        <p className="text-sm text-red-600 mb-4">
          Ocorreu um erro inesperado. Tente novamente ou entre em contato com o suporte.
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
