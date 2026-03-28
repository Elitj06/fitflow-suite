'use client'

import { useState, useEffect } from 'react'
import { Dumbbell, Plus, Clock, Users, Coins, MapPin, Trash2, Loader2 } from 'lucide-react'

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#14b8a6', '#f97316', '#06b6d4']

const CATEGORIES = [
  { value: 'GROUP', label: 'Coletivo' },
  { value: 'PERSONAL', label: 'Personal' },
  { value: 'EVALUATION', label: 'Avaliação' },
  { value: 'OTHER', label: 'Outro' },
]

const MODALITY_SUGGESTIONS = [
  'Musculação', 'Personal Training', 'Pilates', 'Yoga', 'Funcional',
  'CrossFit', 'Natação', 'Corrida', 'Ciclismo', 'Beach Tennis',
  'Vôlei de Praia', 'Calistenia', 'Boxe', 'Muay Thai', 'Jiu-Jitsu',
  'Zumba', 'Dança', 'Stretching', 'Reabilitação', 'Outro'
]

const LOCATION_SUGGESTIONS = [
  'Studio', 'Praia', 'Condomínio', 'Praça', 'Parque', 'Academia Parceira',
  'Ao ar livre', 'Online', 'Residência do aluno'
]

interface Service {
  id: string
  name: string
  description?: string
  durationMinutes: number
  price: number
  maxCapacity: number
  category: string
  color: string
  coinsReward: number
  location?: string
  modality?: string
}

export default function ServicesPage() {
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '', description: '', durationMinutes: 60, price: 0,
    maxCapacity: 10, category: 'GROUP', color: '#6366f1',
    coinsReward: 1, location: '', modality: ''
  })

  useEffect(() => { loadServices() }, [])

  async function loadServices() {
    const res = await fetch('/api/services')
    if (res.ok) setServices(await res.json())
    setLoading(false)
  }

  async function createService() {
    setSaving(true)
    const res = await fetch('/api/services', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    })
    if (res.ok) {
      setShowForm(false)
      setForm({ name: '', description: '', durationMinutes: 60, price: 0, maxCapacity: 10, category: 'GROUP', color: '#6366f1', coinsReward: 1, location: '', modality: '' })
      loadServices()
    }
    setSaving(false)
  }

  async function deleteService(id: string) {
    await fetch(`/api/services?id=${id}`, { method: 'DELETE' })
    loadServices()
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Dumbbell className="w-6 h-6" />
            Serviços & Modalidades
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Configure os serviços oferecidos — studio, praia, condomínio ou onde for!
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition"
        >
          <Plus className="w-4 h-4" /> Novo Serviço
        </button>
      </div>

      {showForm && (
        <div className="mb-6 p-6 rounded-2xl border border-blue-200 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-800">
          <h2 className="font-semibold text-gray-900 dark:text-white mb-4">Novo Serviço</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Nome *</label>
              <input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))}
                placeholder="Ex: Personal Training na Praia"
                className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Modalidade</label>
              <select value={form.modality} onChange={e => setForm(f => ({...f, modality: e.target.value}))}
                className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white focus:outline-none focus:border-blue-500">
                <option value="">Selecionar...</option>
                {MODALITY_SUGGESTIONS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Local</label>
              <select value={form.location} onChange={e => setForm(f => ({...f, location: e.target.value}))}
                className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white focus:outline-none focus:border-blue-500">
                <option value="">Selecionar...</option>
                {LOCATION_SUGGESTIONS.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Tipo</label>
              <select value={form.category} onChange={e => setForm(f => ({...f, category: e.target.value}))}
                className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white focus:outline-none focus:border-blue-500">
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Duração (min)</label>
              <input type="number" value={form.durationMinutes} onChange={e => setForm(f => ({...f, durationMinutes: +e.target.value}))}
                className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Capacidade máxima</label>
              <input type="number" value={form.maxCapacity} onChange={e => setForm(f => ({...f, maxCapacity: +e.target.value}))}
                className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">FitCoins por aula</label>
              <input type="number" value={form.coinsReward} onChange={e => setForm(f => ({...f, coinsReward: +e.target.value}))}
                className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white focus:outline-none focus:border-blue-500" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Cor</label>
              <div className="mt-1 flex gap-2 flex-wrap">
                {COLORS.map(c => (
                  <button key={c} onClick={() => setForm(f => ({...f, color: c}))}
                    className={`w-7 h-7 rounded-full border-2 transition ${form.color === c ? 'border-gray-900 scale-110' : 'border-transparent'}`}
                    style={{ backgroundColor: c }} />
                ))}
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Descrição</label>
              <input value={form.description} onChange={e => setForm(f => ({...f, description: e.target.value}))}
                placeholder="Descreva o serviço..."
                className="mt-1 w-full rounded-xl border border-gray-300 px-3 py-2 text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-white focus:outline-none focus:border-blue-500" />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={createService} disabled={saving || !form.name.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-50 flex items-center gap-2 transition">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {saving ? 'Salvando...' : 'Criar Serviço'}
            </button>
            <button onClick={() => setShowForm(false)}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-xl text-sm font-semibold transition">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>
      ) : services.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Dumbbell className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Nenhum serviço cadastrado.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {services.map(s => (
            <div key={s.id} className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: s.color }} />
                  <h3 className="font-semibold text-gray-900 dark:text-white text-sm">{s.name}</h3>
                </div>
                <button onClick={() => deleteService(s.id)}
                  className="text-gray-300 hover:text-red-500 transition">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              {s.modality && <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-1">{s.modality}</p>}
              {s.location && (
                <p className="text-xs text-gray-500 flex items-center gap-1 mb-2">
                  <MapPin className="w-3 h-3" /> {s.location}
                </p>
              )}
              {s.description && <p className="text-xs text-gray-500 mb-3">{s.description}</p>}
              <div className="flex gap-3 text-xs text-gray-500">
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {s.durationMinutes}min</span>
                <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {s.maxCapacity}</span>
                <span className="flex items-center gap-1"><Coins className="w-3 h-3" /> {s.coinsReward} coins</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
