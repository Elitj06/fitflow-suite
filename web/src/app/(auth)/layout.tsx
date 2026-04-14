import { Zap } from 'lucide-react'
import Link from 'next/link'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen">
      {/* Left panel - Branding */}
      <div className="relative hidden w-1/2 overflow-hidden bg-gradient-to-br from-brand-900 via-brand-800 to-indigo-900 lg:flex lg:flex-col lg:justify-between p-12">
        <div className="absolute inset-0">
          <div className="absolute -top-20 -left-20 h-[500px] w-[500px] rounded-full bg-brand-600/20 blur-3xl" />
          <div className="absolute -bottom-20 -right-20 h-[400px] w-[400px] rounded-full bg-violet-500/15 blur-3xl" />
          <div className="absolute top-1/2 left-1/3 h-[300px] w-[300px] rounded-full bg-indigo-400/10 blur-3xl" />
        </div>
        <div className="relative">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <span className="font-display text-2xl font-bold text-white">
              Fit<span className="text-brand-300">Flow</span>
            </span>
          </Link>
        </div>
        <div className="relative space-y-6">
          <h2 className="font-display text-4xl font-bold leading-tight text-white">
            Transforme seu negocio fitness com inteligencia artificial
          </h2>
          <p className="text-lg text-brand-200/80 leading-relaxed">
            Agendamento, check-in, FitCoins e chatbot IA no WhatsApp.
            Tudo em uma plataforma.
          </p>
          <div className="flex gap-8 pt-4">
            <div>
              <div className="font-display text-3xl font-extrabold text-white">500+</div>
              <div className="text-sm text-brand-300">Trainers ativos</div>
            </div>
            <div>
              <div className="font-display text-3xl font-extrabold text-white">98%</div>
              <div className="text-sm text-brand-300">Satisfacao</div>
            </div>
            <div>
              <div className="font-display text-3xl font-extrabold text-white">15k</div>
              <div className="text-sm text-brand-300">Aulas/mes</div>
            </div>
          </div>
        </div>
        <div className="relative text-sm text-brand-400">
          &copy; 2026 FitFlow. Todos os direitos reservados.
        </div>
      </div>

      {/* Right panel - Form */}
      <div className="flex w-full flex-col justify-center px-6 py-12 lg:w-1/2 lg:px-16 bg-white dark:bg-gray-950">
        <div className="mx-auto w-full max-w-md">{children}</div>
      </div>
    </div>
  )
}
