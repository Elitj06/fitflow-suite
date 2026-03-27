'use client'

import { useState } from 'react'
import { Settings, Building2, Bell, Shield, Trash2, Save } from 'lucide-react'

function SectionHeader({ icon: Icon, title, subtitle, accent = 'bg-brand-50 text-brand-600' }: {
  icon: React.ElementType; title: string; subtitle?: string; accent?: string
}) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${accent}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div>
        <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
        {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
      </div>
    </div>
  )
}

function Toggle({ label, description, defaultOn = false }: { label: string; description?: string; defaultOn?: boolean }) {
  const [on, setOn] = useState(defaultOn)
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-50 last:border-0">
      <div>
        <p className="text-sm font-medium text-gray-800">{label}</p>
        {description && <p className="text-xs text-gray-400 mt-0.5">{description}</p>}
      </div>
      <button
        onClick={() => setOn(!on)}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          on ? 'bg-brand-500' : 'bg-gray-200'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
            on ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  )
}

function InputField({ label, placeholder, type = 'text' }: { label: string; placeholder: string; type?: string }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <input
        type={type}
        placeholder={placeholder}
        className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-300 focus:border-brand-400 transition"
      />
    </div>
  )
}

export default function AdminPage() {
  return (
    <div className="p-6 space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center">
          <Settings className="w-5 h-5 text-gray-600" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-gray-900">Configurações</h1>
          <p className="text-sm text-gray-500">Gerencie as configurações gerais do estúdio</p>
        </div>
      </div>

      {/* Studio Profile */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        <SectionHeader
          icon={Building2}
          title="Perfil do Estúdio"
          subtitle="Informações públicas do seu negócio"
          accent="bg-blue-50 text-blue-600"
        />
        <div className="space-y-4">
          <InputField label="Nome do Estúdio" placeholder="Ex: Academia FitFlow" />
          <InputField label="Endereço" placeholder="Rua, número, bairro, cidade" />
          <InputField label="Telefone" placeholder="(21) 99999-9999" type="tel" />
          <div className="pt-2">
            <button className="flex items-center gap-2 bg-brand-500 hover:bg-brand-600 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors">
              <Save className="w-4 h-4" />
              Salvar Perfil
            </button>
          </div>
        </div>
      </div>

      {/* Notifications */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        <SectionHeader
          icon={Bell}
          title="Notificações"
          subtitle="Escolha como seus alunos recebem comunicados"
          accent="bg-yellow-50 text-yellow-600"
        />
        <div>
          <Toggle label="WhatsApp" description="Enviar avisos e confirmações via WhatsApp" defaultOn={true} />
          <Toggle label="Email" description="Enviar newsletters e resumos por e-mail" defaultOn={true} />
          <Toggle label="Notificações no App" description="Push notifications para alunos com o app instalado" defaultOn={false} />
        </div>
      </div>

      {/* Security */}
      <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-sm">
        <SectionHeader
          icon={Shield}
          title="Segurança"
          subtitle="Gerencie sua senha e sessões ativas"
          accent="bg-green-50 text-green-600"
        />
        <div className="flex flex-col sm:flex-row gap-3">
          <button className="flex items-center gap-2 border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-medium px-4 py-2.5 rounded-xl transition-colors">
            <Shield className="w-4 h-4" />
            Alterar Senha
          </button>
          <button className="flex items-center gap-2 border border-gray-200 hover:bg-gray-50 text-gray-700 text-sm font-medium px-4 py-2.5 rounded-xl transition-colors">
            <Shield className="w-4 h-4 text-orange-500" />
            Revogar Todas as Sessões
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-3">
          Revogar sessões desconectará todos os dispositivos, incluindo este.
        </p>
      </div>

      {/* Danger Zone */}
      <div className="bg-white rounded-2xl border border-red-100 p-5 shadow-sm">
        <SectionHeader
          icon={Trash2}
          title="Zona de Perigo"
          subtitle="Ações irreversíveis — proceda com cuidado"
          accent="bg-red-50 text-red-600"
        />
        <div className="bg-red-50 border border-red-100 rounded-xl p-4">
          <p className="text-sm font-medium text-red-800 mb-1">Excluir Conta</p>
          <p className="text-xs text-red-600 mb-4">
            Esta ação é permanente. Todos os dados do estúdio, alunos e histórico serão removidos
            definitivamente e não poderão ser recuperados.
          </p>
          <button className="flex items-center gap-2 bg-red-500 hover:bg-red-600 text-white text-sm font-medium px-4 py-2.5 rounded-xl transition-colors">
            <Trash2 className="w-4 h-4" />
            Excluir Conta Permanentemente
          </button>
        </div>
      </div>
    </div>
  )
}
