'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import {
  Phone, Plus, RefreshCw, Wrench, AlertTriangle,
  Clock, CheckCircle, Loader, Trash2, XCircle,
} from 'lucide-react'

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
  geloescht_am: string | null
  loeschgrund: string | null
}

const STATUS_CONFIG: Record<AuftragStatus, { label: string; color: string; icon: React.ReactNode }> = {
  neu:                 { label: 'Neu',                  icon: <Plus size={12} />,            color: 'bg-blue-900/50 text-blue-300 border-blue-700' },
  in_bearbeitung:      { label: 'In Bearbeitung',       icon: <Wrench size={12} />,           color: 'bg-yellow-900/50 text-yellow-300 border-yellow-700' },
  warten_auf_freigabe: { label: 'Warten auf Freigabe',  icon: <Clock size={12} />,            color: 'bg-purple-900/50 text-purple-300 border-purple-700' },
  abgeschlossen:       { label: 'Abgeschlossen',        icon: <CheckCircle size={12} />,      color: 'bg-green-900/50 text-green-300 border-green-700' },
  eskalation_rueckruf: { label: 'Eskalation / Rückruf', icon: <AlertTriangle size={12} />,   color: 'bg-red-900/50 text-red-300 border-red-700' },
}

const EMPTY_FORM = {
  kunden_name: '',
  kunden_telefonnummer: '',
  fahrzeug: '',
  problem_beschreibung: '',
  status: 'neu' as AuftragStatus,
}

interface DeleteModal {
  auftrag: Auftrag | null
  grund: string
  deleting: boolean
}

export default function Dashboard() {
  const [auftraege, setAuftraege]   = useState<Auftrag[]>([])
  const [loading, setLoading]       = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm]             = useState(EMPTY_FORM)
  const [formOpen, setFormOpen]     = useState(false)
  const [error, setError]           = useState<string | null>(null)
  const [deleteModal, setDeleteModal] = useState<DeleteModal>({
    auftrag: null,
    grund: '',
    deleting: false,
  })

  async function fetchAuftraege() {
    setLoading(true)
    const { data, error } = await supabase
      .from('auftraege')
      .select('*')
      .order('erstellt_am', { ascending: false })

    if (error) {
      setError(error.message)
    } else {
      const all = data ?? []
      // Reihenfolge: Eskalation (aktiv) → Rest (aktiv) → Gelöscht (grau, unten)
      const sorted = [
        ...all.filter((a) => !a.geloescht_am && a.status === 'eskalation_rueckruf'),
        ...all.filter((a) => !a.geloescht_am && a.status !== 'eskalation_rueckruf'),
        ...all.filter((a) => !!a.geloescht_am),
      ]
      setAuftraege(sorted)
    }
    setLoading(false)
  }

  useEffect(() => { fetchAuftraege() }, [])

  async function handleSubmit(e: SubmitEvent) {
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

  async function handleDelete() {
    if (!deleteModal.auftrag) return
    setDeleteModal((m) => ({ ...m, deleting: true }))

    const { error } = await supabase
      .from('auftraege')
      .update({
        geloescht_am: new Date().toISOString(),
        loeschgrund:  deleteModal.grund.trim() || null,
      })
      .eq('id', deleteModal.auftrag.id)

    if (error) {
      setError(error.message)
      setDeleteModal((m) => ({ ...m, deleting: false }))
    } else {
      // Optimistisch: Karte sofort grau färben ohne Reload
      const deletedId   = deleteModal.auftrag.id
      const deletedGrund = deleteModal.grund.trim() || null
      setAuftraege((prev) => {
        const updated = prev.map((a) =>
          a.id === deletedId
            ? { ...a, geloescht_am: new Date().toISOString(), loeschgrund: deletedGrund }
            : a
        )
        return [
          ...updated.filter((a) => !a.geloescht_am && a.status === 'eskalation_rueckruf'),
          ...updated.filter((a) => !a.geloescht_am && a.status !== 'eskalation_rueckruf'),
          ...updated.filter((a) => !!a.geloescht_am),
        ]
      })
      setDeleteModal({ auftrag: null, grund: '', deleting: false })
    }
  }

  const eskalationCount = auftraege.filter(
    (a) => a.status === 'eskalation_rueckruf' && !a.geloescht_am
  ).length

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans">

      {/* ── Lösch-Modal ───────────────────────────────────────────────────── */}
      {deleteModal.auftrag && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
          onClick={(e) => {
            if (e.target === e.currentTarget)
              setDeleteModal({ auftrag: null, grund: '', deleting: false })
          }}
        >
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-md shadow-2xl">
            <div className="flex items-start gap-3 mb-4">
              <div className="bg-red-900/40 rounded-full p-2 shrink-0">
                <Trash2 size={18} className="text-red-400" />
              </div>
              <div>
                <h2 className="font-semibold text-zinc-100 text-base">Auftrag löschen?</h2>
                <p className="text-zinc-400 text-sm mt-0.5">
                  <span className="text-zinc-200 font-medium">{deleteModal.auftrag.kunden_name}</span>
                  {' — '}{deleteModal.auftrag.fahrzeug}
                </p>
              </div>
            </div>

            <div className="mb-5">
              <label className="block text-xs text-zinc-400 mb-1">
                Grund (optional)
              </label>
              <textarea
                rows={3}
                value={deleteModal.grund}
                onChange={(e) => setDeleteModal((m) => ({ ...m, grund: e.target.value }))}
                placeholder="z.B. Kunde hat Auftrag storniert..."
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-red-500 resize-none"
              />
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeleteModal({ auftrag: null, grund: '', deleting: false })}
                className="text-sm text-zinc-400 hover:text-zinc-200 px-4 py-2 rounded-lg hover:bg-zinc-800 transition-colors"
              >
                Abbrechen
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteModal.deleting}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors"
              >
                {deleteModal.deleting
                  ? <Loader size={14} className="animate-spin" />
                  : <Trash2 size={14} />
                }
                Ja, löschen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Header ────────────────────────────────────────────────────────── */}
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

        {error && (
          <div className="bg-red-950 border border-red-700 text-red-300 rounded-lg px-4 py-3 text-sm">
            {error}
          </div>
        )}

        {/* ── Formular ────────────────────────────────────────────────────── */}
        {formOpen && (
          <section className="bg-zinc-900 border border-zinc-700 rounded-xl p-5">
            <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4">
              Test-Auftrag anlegen
            </h2>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs text-zinc-400">Kundenname *</label>
                <input required value={form.kunden_name}
                  onChange={(e) => setForm({ ...form, kunden_name: e.target.value })}
                  placeholder="Max Mustermann"
                  className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-orange-500"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-zinc-400">Telefonnummer *</label>
                <input required value={form.kunden_telefonnummer}
                  onChange={(e) => setForm({ ...form, kunden_telefonnummer: e.target.value })}
                  placeholder="+49 151 12345678"
                  className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-orange-500"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-zinc-400">Fahrzeug *</label>
                <input required value={form.fahrzeug}
                  onChange={(e) => setForm({ ...form, fahrzeug: e.target.value })}
                  placeholder="VW Golf 7, 2019"
                  className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-orange-500"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs text-zinc-400">Status</label>
                <select value={form.status}
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
                <textarea required rows={3} value={form.problem_beschreibung}
                  onChange={(e) => setForm({ ...form, problem_beschreibung: e.target.value })}
                  placeholder="Fahrzeug springt nicht an, Batterie verdächtig..."
                  className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-orange-500 resize-none"
                />
              </div>
              <div className="sm:col-span-2 flex justify-end gap-3">
                <button type="button"
                  onClick={() => { setFormOpen(false); setForm(EMPTY_FORM) }}
                  className="text-sm text-zinc-400 hover:text-zinc-200 px-4 py-2 rounded-lg hover:bg-zinc-800 transition-colors"
                >
                  Abbrechen
                </button>
                <button type="submit" disabled={submitting}
                  className="flex items-center gap-2 bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors"
                >
                  {submitting && <Loader size={14} className="animate-spin" />}
                  Auftrag speichern
                </button>
              </div>
            </form>
          </section>
        )}

        {/* ── Auftragsliste ────────────────────────────────────────────────── */}
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
                const isDeleted    = !!auftrag.geloescht_am
                const cfg          = STATUS_CONFIG[auftrag.status]

                return (
                  <li
                    key={auftrag.id}
                    className={[
                      'rounded-xl border p-4 transition-all',
                      isDeleted
                        ? 'bg-zinc-900/40 border-zinc-800 opacity-50 grayscale'
                        : isEskalation
                          ? 'bg-red-950/30 border-red-600 shadow-[0_0_0_2px_rgba(220,38,38,0.4)] animate-pulse-border'
                          : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700',
                    ].join(' ')}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start gap-3">

                      {/* ── Hauptinfo ── */}
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          {isEskalation && !isDeleted && (
                            <AlertTriangle size={15} className="text-red-400 shrink-0 animate-pulse" />
                          )}
                          {isDeleted && (
                            <XCircle size={15} className="text-zinc-500 shrink-0" />
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
                        {isDeleted && auftrag.loeschgrund && (
                          <p className="text-xs text-zinc-600 italic">
                            Gelöscht: {auftrag.loeschgrund}
                          </p>
                        )}
                        <p className="text-xs text-zinc-600">
                          {new Date(auftrag.erstellt_am).toLocaleString('de-DE', {
                            day: '2-digit', month: '2-digit', year: 'numeric',
                            hour: '2-digit', minute: '2-digit',
                          })}
                        </p>
                      </div>

                      {/* ── Buttons ── */}
                      <div className="flex items-center gap-2 shrink-0">
                        {!isDeleted && (
                          <>
                            <a
                              href={`tel:${auftrag.kunden_telefonnummer}`}
                              className={[
                                'flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg transition-colors',
                                isEskalation
                                  ? 'bg-red-600 hover:bg-red-500 text-white'
                                  : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200',
                              ].join(' ')}
                            >
                              <Phone size={15} />
                              Anrufen
                            </a>
                            <button
                              onClick={() => setDeleteModal({ auftrag, grund: '', deleting: false })}
                              className="p-2 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-zinc-800 transition-colors"
                              title="Auftrag löschen"
                            >
                              <Trash2 size={16} />
                            </button>
                          </>
                        )}
                      </div>

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
