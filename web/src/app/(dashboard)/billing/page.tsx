'use client'

import { CreditCard, Package, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react'

const plans = [
  {
    name: 'Pacote Studio',
    price: 'R$ 297',
    period: '/mês',
    description: 'Ideal para estúdios de pilates e pequenas academias',
    features: [
      'FitBot AI no WhatsApp (1 unidade)',
      'Agendamento inteligente 24h',
      'Integração Wellhub + TotalPass',
      'FitCoins — fidelização de alunos',
      'Dashboard de gestão completo',
      'Suporte via WhatsApp',
    ],
    cta: 'Assinar Pacote Studio',
    highlight: false,
  },
  {
    name: 'Pacote Orla',
    price: 'R$ 497',
    period: '/mês',
    description: 'Para academias em expansão com múltiplas modalidades',
    features: [
      'FitBot AI no WhatsApp (até 3 unidades)',
      'Tudo do Pacote Studio',
      'Lista de espera automática',
      'Campanhas automáticas de reengajamento',
      'Avaliação pós-aula via WhatsApp',
      'Relatório de frequência personalizado',
      'Suporte prioritário',
    ],
    cta: 'Assinar Pacote Orla',
    highlight: true,
  },
  {
    name: 'Pacote Box',
    price: 'R$ 897',
    period: '/mês',
    description: 'Solução completa para redes e franquias',
    features: [
      'FitBot AI no WhatsApp (ilimitado)',
      'Tudo do Pacote Orla',
      'Dashboard consolidado multi-unidade',
      'Controle de evolução do aluno',
      'App do aluno (iOS + Android)',
      'Integração com sistema legado',
      'Gerente de conta dedicado',
    ],
    cta: 'Falar com a Laura',
    highlight: false,
  },
]

export default function BillingPage() {
  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <CreditCard className="w-6 h-6" />
          Cobrança e Planos
        </h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Escolha o plano ideal para o seu estúdio ou academia
        </p>
      </div>

      {/* Status atual */}
      <div className="mb-8 p-4 rounded-xl border border-yellow-200 bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-800 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-medium text-yellow-800 dark:text-yellow-300">Período de demonstração ativo</p>
          <p className="text-sm text-yellow-700 dark:text-yellow-400 mt-0.5">
            Você está usando o FitFlow Suite em modo piloto. Para ativar sua assinatura, escolha um plano abaixo.
          </p>
        </div>
      </div>

      {/* Planos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className={`rounded-2xl border p-6 flex flex-col ${
              plan.highlight
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 shadow-lg'
                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
            }`}
          >
            {plan.highlight && (
              <span className="text-xs font-semibold text-blue-600 dark:text-blue-400 uppercase tracking-wide mb-2">
                Mais popular
              </span>
            )}
            <div className="flex items-center gap-2 mb-1">
              <Package className="w-5 h-5 text-gray-600 dark:text-gray-300" />
              <h2 className="text-lg font-bold text-gray-900 dark:text-white">{plan.name}</h2>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">{plan.description}</p>
            <div className="flex items-baseline gap-1 mb-6">
              <span className="text-3xl font-bold text-gray-900 dark:text-white">{plan.price}</span>
              <span className="text-gray-500 dark:text-gray-400 text-sm">{plan.period}</span>
            </div>
            <ul className="space-y-2 flex-1 mb-6">
              {plan.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                  {f}
                </li>
              ))}
            </ul>
            <button
              className={`w-full py-2.5 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 transition ${
                plan.highlight
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-800 dark:text-white'
              }`}
              onClick={() => window.open('https://wa.me/5521999007170', '_blank')}
            >
              {plan.cta}
              <ExternalLink className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      {/* Rodapé */}
      <p className="text-center text-sm text-gray-400 dark:text-gray-500">
        Dúvidas sobre os planos? Fale com a Laura diretamente no WhatsApp.
      </p>
    </div>
  )
}
