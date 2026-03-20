import Link from 'next/link'
import {
  Calendar,
  QrCode,
  Coins,
  MessageSquare,
  Bot,
  ShoppingCart,
  ArrowRight,
  CheckCircle2,
  Zap,
  Shield,
  Smartphone,
  Star,
  TrendingUp,
  Users,
  BarChart3,
} from 'lucide-react'

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold tracking-wide text-brand-700 uppercase">
      <span className="h-1.5 w-1.5 rounded-full bg-brand-500 animate-pulse" />
      {children}
    </span>
  )
}

function FeatureCard({
  icon: Icon,
  title,
  description,
  accent,
}: {
  icon: React.ElementType
  title: string
  description: string
  accent: string
}) {
  return (
    <div className="group relative rounded-2xl border border-gray-200 bg-white p-6 transition-all hover:border-brand-300 hover:shadow-lg hover:shadow-brand-100/50 hover:-translate-y-1">
      <div
        className="mb-4 inline-flex rounded-xl p-3"
        style={{ backgroundColor: accent + '15', color: accent }}
      >
        <Icon className="h-6 w-6" />
      </div>
      <h3 className="font-display text-lg font-semibold text-gray-900">
        {title}
      </h3>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">
        {description}
      </p>
    </div>
  )
}

function PricingCard({
  name,
  price,
  description,
  features,
  popular,
  cta,
}: {
  name: string
  price: string
  description: string
  features: string[]
  popular?: boolean
  cta: string
}) {
  return (
    <div
      className={`relative rounded-2xl border p-8 transition-all ${
        popular
          ? 'border-brand-500 bg-white shadow-xl shadow-brand-100/50 scale-[1.03]'
          : 'border-gray-200 bg-white hover:border-brand-300 hover:shadow-lg'
      }`}
    >
      {popular && (
        <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
          <span className="rounded-full bg-brand-600 px-4 py-1 text-xs font-bold text-white uppercase tracking-wider">
            Mais Popular
          </span>
        </div>
      )}
      <h3 className="font-display text-xl font-bold text-gray-900">{name}</h3>
      <p className="mt-1 text-sm text-gray-500">{description}</p>
      <div className="mt-6 flex items-baseline gap-1">
        <span className="font-display text-4xl font-extrabold text-gray-900">
          {price}
        </span>
        <span className="text-sm text-gray-500">/mes</span>
      </div>
      <ul className="mt-8 space-y-3">
        {features.map((feat) => (
          <li key={feat} className="flex items-start gap-2.5">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
            <span className="text-sm text-gray-700">{feat}</span>
          </li>
        ))}
      </ul>
      <Link
        href="/register"
        className={`mt-8 flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3 text-sm font-semibold transition-all ${
          popular
            ? 'bg-brand-600 text-white hover:bg-brand-700 shadow-md shadow-brand-200'
            : 'bg-gray-100 text-gray-900 hover:bg-brand-50 hover:text-brand-700'
        }`}
      >
        {cta}
        <ArrowRight className="h-4 w-4" />
      </Link>
    </div>
  )
}

function StatBadge({
  value,
  label,
}: {
  value: string
  label: string
}) {
  return (
    <div className="text-center">
      <div className="font-display text-3xl font-extrabold text-white">
        {value}
      </div>
      <div className="mt-1 text-sm text-brand-200">{label}</div>
    </div>
  )
}

export default function LandingPage() {
  return (
    <div className="relative overflow-hidden">
      {/* NAV */}
      <nav className="fixed top-0 z-50 w-full border-b border-white/10 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand-600">
              <Zap className="h-5 w-5 text-white" />
            </div>
            <span className="font-display text-xl font-bold text-gray-900">
              Fit<span className="text-brand-600">Flow</span>
            </span>
          </Link>
          <div className="hidden items-center gap-8 md:flex">
            <a
              href="#features"
              className="text-sm font-medium text-gray-600 transition-colors hover:text-brand-600"
            >
              Recursos
            </a>
            <a
              href="#chatbot"
              className="text-sm font-medium text-gray-600 transition-colors hover:text-brand-600"
            >
              FitBot IA
            </a>
            <a
              href="#pricing"
              className="text-sm font-medium text-gray-600 transition-colors hover:text-brand-600"
            >
              Planos
            </a>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-sm font-medium text-gray-700 hover:text-brand-600"
            >
              Entrar
            </Link>
            <Link
              href="/register"
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-all hover:bg-brand-700 shadow-sm"
            >
              Comecar Gratis
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative pt-32 pb-20 md:pt-40 md:pb-28">
        {/* Background effects */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 h-[600px] w-[600px] rounded-full bg-brand-200/30 blur-3xl" />
          <div className="absolute -bottom-40 -left-40 h-[500px] w-[500px] rounded-full bg-indigo-200/20 blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[800px] w-[800px] rounded-full bg-gradient-to-br from-brand-100/20 to-violet-100/20 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-3xl text-center">
            <Badge>Novo: FitBot IA para WhatsApp</Badge>

            <h1 className="mt-6 font-display text-5xl font-extrabold leading-[1.1] tracking-tight text-gray-900 md:text-6xl lg:text-7xl">
              Gestao{' '}
              <span className="bg-gradient-to-r from-brand-600 to-violet-600 bg-clip-text text-transparent">
                inteligente
              </span>{' '}
              para Personal Trainers
            </h1>

            <p className="mt-6 text-lg leading-relaxed text-gray-600 md:text-xl">
              Agendamento, check-in com QR Code, sistema de recompensas FitCoins
              e chatbot IA no WhatsApp. Tudo que voce precisa para escalar seu
              negocio fitness em uma unica plataforma.
            </p>

            <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <Link
                href="/register"
                className="flex items-center gap-2 rounded-xl bg-brand-600 px-8 py-4 text-base font-semibold text-white shadow-lg shadow-brand-200/50 transition-all hover:bg-brand-700 hover:shadow-xl hover:-translate-y-0.5"
              >
                Comecar Gratis — 14 dias
                <ArrowRight className="h-5 w-5" />
              </Link>
              <a
                href="#features"
                className="flex items-center gap-2 rounded-xl border border-gray-300 bg-white px-8 py-4 text-base font-semibold text-gray-700 transition-all hover:border-brand-300 hover:text-brand-600"
              >
                Ver Recursos
              </a>
            </div>

            <p className="mt-4 text-xs text-gray-500">
              Sem cartao de credito. Cancele quando quiser.
            </p>
          </div>
        </div>
      </section>

      {/* SOCIAL PROOF BAR */}
      <section className="relative bg-brand-900 py-10">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-around gap-8 px-6">
          <StatBadge value="500+" label="Personal Trainers" />
          <StatBadge value="15k+" label="Agendamentos/mes" />
          <StatBadge value="98%" label="Satisfacao" />
          <StatBadge value="4.9" label="Avaliacao media" />
        </div>
      </section>

      {/* FEATURES */}
      <section id="features" className="py-20 md:py-28">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <Badge>Produto 1 — FitFlow Pro</Badge>
            <h2 className="mt-4 font-display text-3xl font-bold text-gray-900 md:text-4xl">
              Tudo que seu studio precisa, em um so lugar
            </h2>
            <p className="mt-4 text-gray-600">
              Do agendamento ao check-in, dos pagamentos as recompensas.
              Automatize sua operacao e foque no que importa: seus alunos.
            </p>
          </div>

          <div className="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <FeatureCard
              icon={Calendar}
              title="Agendamento Inteligente"
              description="Seus alunos marcam aulas pelo app ou WhatsApp. Controle de horarios, capacidade e recorrencia automatica."
              accent="#6366f1"
            />
            <FeatureCard
              icon={QrCode}
              title="Check-in QR Code"
              description="Aluno escaneia o QR ao chegar. Presenca registrada, FitCoins creditados automaticamente."
              accent="#10b981"
            />
            <FeatureCard
              icon={Coins}
              title="FitCoins & Recompensas"
              description="Sistema de gamificacao: cada check-in gera moedas que podem ser trocadas por premios. Engajamento garantido."
              accent="#eab308"
            />
            <FeatureCard
              icon={Users}
              title="Gestao de Alunos"
              description="Ficha completa de cada aluno: historico de treinos, frequencia, pagamentos e evolucao."
              accent="#8b5cf6"
            />
            <FeatureCard
              icon={BarChart3}
              title="Dashboard & Analytics"
              description="Metricas em tempo real: taxa de presenca, receita, alunos ativos, horarios de pico."
              accent="#ec4899"
            />
            <FeatureCard
              icon={Shield}
              title="LGPD Compliant"
              description="Dados protegidos com isolamento por organizacao (RLS), criptografia e consentimento."
              accent="#14b8a6"
            />
          </div>
        </div>
      </section>

      {/* CHATBOT SECTION */}
      <section
        id="chatbot"
        className="relative overflow-hidden bg-gray-900 py-20 md:py-28"
      >
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-20 -left-20 h-[400px] w-[400px] rounded-full bg-green-500/10 blur-3xl" />
          <div className="absolute -bottom-20 -right-20 h-[400px] w-[400px] rounded-full bg-brand-500/10 blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <Badge>Produto 2 — FitBot IA</Badge>
            <h2 className="mt-4 font-display text-3xl font-bold text-white md:text-4xl">
              Seu atendente, vendedor e secretaria.{' '}
              <span className="text-green-400">No WhatsApp. 24h.</span>
            </h2>
            <p className="mt-4 text-gray-400">
              Chatbot com inteligencia artificial que atende, agenda e vende
              pelos seus clientes. Funciona integrado ao FitFlow ou de forma
              independente para qualquer negocio.
            </p>
          </div>

          <div className="mt-16 grid gap-8 md:grid-cols-3">
            {/* Mode: Attendance */}
            <div className="rounded-2xl border border-gray-800 bg-gray-800/50 p-8 backdrop-blur-sm">
              <div className="inline-flex rounded-xl bg-blue-500/20 p-3">
                <MessageSquare className="h-6 w-6 text-blue-400" />
              </div>
              <h3 className="mt-4 font-display text-xl font-bold text-white">
                Modo Atendimento
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-400">
                Responde duvidas, horarios de funcionamento, informacoes sobre
                servicos, FAQ. Se a pergunta for complexa, escala para um humano
                automaticamente.
              </p>
              <div className="mt-6 space-y-2">
                {[
                  'Base de conhecimento customizavel',
                  'Respostas naturais com IA',
                  'Escalacao inteligente para humano',
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-2 text-sm text-gray-300"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 text-blue-400" />
                    {item}
                  </div>
                ))}
              </div>
            </div>

            {/* Mode: Scheduling */}
            <div className="rounded-2xl border border-gray-800 bg-gray-800/50 p-8 backdrop-blur-sm">
              <div className="inline-flex rounded-xl bg-green-500/20 p-3">
                <Bot className="h-6 w-6 text-green-400" />
              </div>
              <h3 className="mt-4 font-display text-xl font-bold text-white">
                Modo Agendamento
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-400">
                O cliente marca, cancela ou reagenda sessoes direto no WhatsApp.
                A IA verifica disponibilidade em tempo real e confirma
                automaticamente.
              </p>
              <div className="mt-6 space-y-2">
                {[
                  'Verificacao de disponibilidade real',
                  'Confirmacao e lembrete automatico',
                  'Cancelamento com politica configurable',
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-2 text-sm text-gray-300"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />
                    {item}
                  </div>
                ))}
              </div>
            </div>

            {/* Mode: Sales */}
            <div className="rounded-2xl border border-gray-800 bg-gray-800/50 p-8 backdrop-blur-sm">
              <div className="inline-flex rounded-xl bg-amber-500/20 p-3">
                <ShoppingCart className="h-6 w-6 text-amber-400" />
              </div>
              <h3 className="mt-4 font-display text-xl font-bold text-white">
                Modo Vendas
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-400">
                Apresenta planos, coleta dados do cliente, gera link de
                pagamento e fecha a venda. Tudo sem intervencao humana.
              </p>
              <div className="mt-6 space-y-2">
                {[
                  'Apresentacao de planos personalizada',
                  'Coleta de dados + link de pagamento',
                  'Follow-up automatico',
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-2 text-sm text-gray-300"
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 text-amber-400" />
                    {item}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-12 text-center">
            <p className="text-sm text-gray-500">
              O FitBot funciona com qualquer negocio — nao apenas fitness.
              Restaurantes, clinicas, saloes, escolas e mais.
            </p>
          </div>
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="py-20 md:py-28">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <Badge>Planos</Badge>
            <h2 className="mt-4 font-display text-3xl font-bold text-gray-900 md:text-4xl">
              Escolha o plano ideal para voce
            </h2>
            <p className="mt-4 text-gray-600">
              Comece gratis por 14 dias. Sem cartao de credito.
            </p>
          </div>

          <div className="mt-16 grid gap-8 md:grid-cols-3">
            <PricingCard
              name="Starter"
              price="R$ 49"
              description="Para personal trainers individuais"
              features={[
                '1 personal trainer',
                'Ate 30 alunos',
                'Agendamento basico',
                'Check-in QR Code',
                'Dashboard simples',
              ]}
              cta="Comecar Gratis"
            />
            <PricingCard
              name="Pro"
              price="R$ 99"
              description="Para studios em crescimento"
              popular
              features={[
                'Ate 3 trainers',
                'Ate 100 alunos',
                'Agendamento + recorrencia',
                'FitCoins & Recompensas',
                'Analytics avancado',
                'FitBot Basico (500 msgs)',
              ]}
              cta="Comecar Gratis"
            />
            <PricingCard
              name="Business"
              price="R$ 199"
              description="Para studios profissionais"
              features={[
                'Trainers ilimitados',
                'Alunos ilimitados',
                'Todos os recursos Pro',
                'FitBot Completo (ilimitado)',
                'API & Webhooks',
                'Suporte prioritario',
                'Multi-unidade',
              ]}
              cta="Falar com Vendas"
            />
          </div>

          <div className="mt-12 text-center">
            <p className="text-sm text-gray-500">
              Quer apenas o FitBot IA?{' '}
              <a href="#" className="text-brand-600 hover:underline font-medium">
                Veja os planos standalone a partir de R$ 79/mes
              </a>
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative overflow-hidden bg-brand-600 py-20">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -top-20 -right-20 h-[300px] w-[300px] rounded-full bg-white/10 blur-3xl" />
        </div>
        <div className="relative mx-auto max-w-3xl px-6 text-center">
          <h2 className="font-display text-3xl font-bold text-white md:text-4xl">
            Pronto para transformar seu negocio fitness?
          </h2>
          <p className="mt-4 text-lg text-brand-100">
            Junte-se a mais de 500 personal trainers que ja usam o FitFlow.
            Comece gratis hoje.
          </p>
          <Link
            href="/register"
            className="mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-8 py-4 text-base font-bold text-brand-700 shadow-lg transition-all hover:bg-brand-50 hover:-translate-y-0.5"
          >
            Criar Conta Gratuita
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-gray-200 bg-white py-12">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex flex-col items-center justify-between gap-6 md:flex-row">
            <div className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600">
                <Zap className="h-4 w-4 text-white" />
              </div>
              <span className="font-display text-lg font-bold text-gray-900">
                Fit<span className="text-brand-600">Flow</span>
              </span>
            </div>
            <div className="flex gap-8 text-sm text-gray-500">
              <a href="#" className="hover:text-brand-600">
                Termos de Uso
              </a>
              <a href="#" className="hover:text-brand-600">
                Privacidade
              </a>
              <a href="#" className="hover:text-brand-600">
                Suporte
              </a>
              <a href="#" className="hover:text-brand-600">
                Blog
              </a>
            </div>
            <p className="text-sm text-gray-400">
              &copy; 2026 FitFlow. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
