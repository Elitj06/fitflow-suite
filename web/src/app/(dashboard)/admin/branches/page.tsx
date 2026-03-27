'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Building2, Plus, MapPin, Phone, CheckCircle, Pencil } from 'lucide-react'

export default function BranchesPage() {
  const [branches, setBranches] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', address: '', phone: '' })
  const [saving, setSaving] = useState(false)
  const [orgId, setOrgId] = useState<string | null>(null)

  useEffect(() => {
    loadBranches()
  }, [])

  async function loadBranches() {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profile } = await supabase
      .from('profiles')
      .select('org_id')
      .eq('user_id', user.id)
      .single()

    if (!profile) return
    setOrgId(profile.org_id)

    const { data } = await supabase
      .from('branches')
      .select('*')
      .eq('org_id', profile.org_id)
      .order('created_at')

    setBranches(data || [])
    setLoading(false)
  }

  async function createBranch() {
    if (!form.name.trim() || !orgId) return
    setSaving(true)

    const supabase = createClient()
    const { error } = await supabase
      .from('branches')
      .insert({
        org_id: orgId,
        name: form.name,
        address: form.address || null,
        phone: form.phone || null,
        is_main: branches.length === 0
      })

    if (!error) {
      setForm({ name: '', address: '', phone: '' })
      setShowForm(false)
      loadBranches()
    }
    setSaving(false)
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Building2 className="w-6 h-6" />
            Unidades
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Gerencie as unidades do seu estúdio
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition"
        >
          <Plus className="w-4 h-4" />
          Nova Unidade
        </button>
      </div>

      {showForm && (
        <div className="mb-6 p-5 rounded-2xl border border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Nova Unidade</h2>
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Nome da unidade (ex: Studio RR Recreio)"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none dark:bg-gray-800 dark:border-gray-600 dark:text-white"
            />
            <input
              type="text"
              placeholder="Endereço (opcional)"
              value={form.address}
              onChange={e => setForm(f => ({ ...f, address: e.target.value }))}
              className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none dark:bg-gray-800 dark:border-gray-600 dark:text-white"
            />
            <input
              type="text"
              placeholder="Telefone (opcional)"
              value={form.phone}
              onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              className="w-full rounded-xl border border-gray-300 px-4 py-2.5 text-sm focus:border-blue-500 focus:outline-none dark:bg-gray-800 dark:border-gray-600 dark:text-white"
            />
            <div className="flex gap-2">
              <button
                onClick={createBranch}
                disabled={saving || !form.name.trim()}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-50 transition"
              >
                {saving ? 'Salvando...' : 'Criar Unidade'}
              </button>
              <button
                onClick={() => setShowForm(false)}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-xl text-sm font-semibold transition"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-400">Carregando...</div>
      ) : branches.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Building2 className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Nenhuma unidade cadastrada ainda.</p>
          <p className="text-sm mt-1">Crie sua primeira unidade clicando em &quot;Nova Unidade&quot;.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {branches.map(branch => (
            <div key={branch.id} className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-blue-500" />
                  <h3 className="font-semibold text-gray-900 dark:text-white">{branch.name}</h3>
                </div>
                {branch.is_main && (
                  <span className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> Principal
                  </span>
                )}
              </div>
              {branch.address && (
                <p className="text-sm text-gray-500 flex items-center gap-1.5 mb-1">
                  <MapPin className="w-3.5 h-3.5" /> {branch.address}
                </p>
              )}
              {branch.phone && (
                <p className="text-sm text-gray-500 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5" /> {branch.phone}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
