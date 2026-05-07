'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Phone, Plus, RefreshCw, Wrench, AlertTriangle, Clock, CheckCircle, Loader } from 'lucide-react'

type AuftragStatus =
  | 'neu'
  | 'in_bearbeitung'
  | 'warten_auf_freigabe'
  | 'abgeschlossen'
  | 'eskalation_rueckruf'

interface Auftrag {
  id: string
  kunden_name: string
  kunden_telefonnummer: string
  fahrzeug: string
  problem_beschreibung: string
  status: AuftragStatus
  foto_url: string | null
  erstellt_am: string
}

const STATUS_CONFIG: Record<AuftragStatus, { label: string; color: string; icon: React.ReactNode }> = {
  neu:                   { label: 'Neu',                icon: <Plus size={12} />,          color: 'bg-blue-900/50 text-blue-300 border-blue-700' },
  in_bearbeitung:        { label: 'In Bearbeitung',     icon: <Wrench size={12} />,         color: 'bg-yellow-900/50 text-yellow-300 border-yellow-700' },
  warten_auf_freigabe:   { label: 'Warten auf Freigabe',icon: <Clock size={12} />,          color: 'bg-purple-900/50 text-purple-300 border-purple-700' },
  abgeschlossen:         { label: 'Abgeschlossen',      icon: <CheckCircle size={12} />,    color: 'bg-green-900/50 text-green-300 border-green-700' },
  eskalation_rueckruf:   { label: 'Eskalation / Rückruf', icon: <AlertTriangle size={12} />, color: 'bg-red-900/50 text-red-300 border-red-700' },
}

const EMPTY_FORM = {
  kunden_name: '',
  kunden_telefonnummer: '',
  fahrzeug: '',
  problem_beschreibung: '',
  status: 'neu' as AuftragStatus,
}

export default function Dashboard() {
  const [auftraege, setAuftraege] = useState<Auftrag[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [formOpen, setFormOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function fetchAuftraege() {
    setLoading(true)
    const { data, error } = await supabase
      .from('auftraege')
      .select('*')
      .order('erstellt_am', { ascending: false })

    if (error) {
      setError(error.message)
    } else {
      // Eskalationen immer oben
      const sorted = [
        ...(data ?? []).filter((a) => a.status === 'eskalation_rueckruf'),
        ...(data ?? []).filter((a) => a.status !== 'eskalation_rueckruf'),
      ]
      setAuftraege(sorted)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchAuftraege()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    const { error } = await supabase.from('auftraege').insert([form])

    if (error) {
      setError(error.message)
    } else {
      setForm(EMPTY_FORM)
      setFormOpen(false)
      await fetchAuftraege()
    }
    setSubmitting(false)
  }

  const eskalationCount = auftraege.filter((a) => a.status === 'eskalation_rueckruf').length

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Wrench size={22} className="text-orange-400" />
            <span className="text-lg font-bold tracking-tight">Auto-Flow CRM</span>
            {eskalationCount > 0 && (
              <span className="flex items-center gap-1 text-xs font-semibold bg-red-600 text-white px-2 py-0.5 rounded-full animate-pulse">
                <AlertTriangle size={11} />
                {eskalationCount} Eskalation{eskalationCount > 1 ? 'en' : ''}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchAuftraege}
              className="p-2 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
              title="Neu laden"
            >
              <RefreshCw size={16} />
            </button>
            <button
              onClick={() => setFormOpen((v) => !v)}
              className="flex items-center gap-2 bg-orange-500 hover:bg-orange-400 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              <Plus size={16} />
              Neuer Auftrag
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">

        {/* Fehlerhinweis */}
        {error && (
          <div className="bg-red-950 border border-red-700 text-red-300 rounded-lg px-4 py-3 text-sm">
            {error}
          </div>
        )}

        {/* Formular */}
        {formOpen && (
          <section className="bg-zinc-900 border border-zinc-700 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4">
              Test-Auftrag anlegen
            </h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-zinc-400">Kundenname *</label>
                <input
                  required
                  value={form.kunden_name}
                  onChange={(e) => setForm({ ...form, kunden_name: e.target.value })}
                  placeholder="Max Mustermann"
                  className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-orange-500"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-zinc-400">Telefonnummer *</label>
                <input
                  required
                  value={form.kunden_telefonnummer}
                  onChange={(e) => setForm({ ...form, kunden_telefonnummer: e.target.value })}
                  placeholder="+49 151 12345678"
                  className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-orange-500"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-zinc-400">Fahrzeug *</label>
                <input
                  required
                  value={form.fahrzeug}
                  onChange={(e) => setForm({ ...form, fahrzeug: e.target.value })}
                  placeholder="VW Golf 7, 2019"
                  className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-orange-500"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-zinc-400">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as AuftragStatus })}
                  className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-orange-500"
                >
                  {(Object.keys(STATUS_CONFIG) as AuftragStatus[]).map((s) => (
                    <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1 sm:col-span-2">
                <label className="text-xs text-zinc-400">Problembeschreibung *</label>
                <textarea
                  required
                  rows={3}
                  value={form.problem_beschreibung}
                  onChange={(e) => setForm({ ...form, problem_beschreibung: e.target.value })}
                  placeholder="Fahrzeug springt nicht an, Batterie verdächtig..."
                  className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-orange-500 resize-none"
                />
              </div>
              <div className="sm:col-span-2 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => { setFormOpen(false); setForm(EMPTY_FORM) }}
                  className="text-sm text-zinc-400 hover:text-zinc-200 px-4 py-2 rounded-lg hover:bg-zinc-800 transition-colors"
                >
                  Abbrechen
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors"
                >
                  {submitting && <Loader size={14} className="animate-spin" />}
                  Auftrag speichern
                </button>
              </div>
            </form>
          </section>
        )}

        {/* Auftragsliste */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">
              Aufträge {!loading && <span className="text-zinc-600">({auftraege.length})</span>}
            </h2>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20 text-zinc-600">
              <Loader size={20} className="animate-spin mr-2" />
              Lade Aufträge...
            </div>
          ) : auftraege.length === 0 ? (
            <div className="text-center py-20 text-zinc-600 text-sm">
              Noch keine Aufträge vorhanden.
            </div>
          ) : (
            <ul className="space-y-3">
              {auftraege.map((auftrag) => {
                const isEskalation = auftrag.status === 'eskalation_rueckruf'
                const cfg = STATUS_CONFIG[auftrag.status]

                return (
                  <li
                    key={auftrag.id}
                    className={[
                      'rounded-xl border p-4 transition-colors',
                      isEskalation
                        ? 'bg-red-950/30 border-red-600 shadow-[0_0_0_2px_rgba(220,38,38,0.4)] animate-pulse-border'
                        : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700',
                    ].join(' ')}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start gap-3">
                      {/* Hauptinfo */}
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          {isEskalation && (
                            <AlertTriangle size={15} className="text-red-400 shrink-0 animate-pulse" />
                          )}
                          <span className="font-semibold text-zinc-100 truncate">
                            {auftrag.kunden_name}
                          </span>
                          <span className="text-zinc-500 text-sm truncate">{auftrag.fahrzeug}</span>
                          <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium ${cfg.color}`}>
                            {cfg.icon}
                            {cfg.label}
                          </span>
                        </div>
                        <p className="text-sm text-zinc-400 line-clamp-2">
                          {auftrag.problem_beschreibung}
                        </p>
                        <p className="text-xs text-zinc-600">
                          {new Date(auftrag.erstellt_am).toLocaleString('de-DE', {
                            day: '2-digit', month: '2-digit', year: 'numeric',
                            hour: '2-digit', minute: '2-digit',
                          })}
                        </p>
                      </div>

                      {/* Anrufen-Button */}
                      <a
                        href={`tel:${auftrag.kunden_telefonnummer}`}
                        className={[
                          'flex items-center gap-2 shrink-0 text-sm font-medium px-4 py-2 rounded-lg transition-colors',
                          isEskalation
                            ? 'bg-red-600 hover:bg-red-500 text-white'
                            : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200',
                        ].join(' ')}
                      >
                        <Phone size={15} />
                        Anrufen
                      </a>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </main>
    </div>
  )
}
