'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Plus, Trash2, ArrowLeft, Loader } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import type { AngebotPosition } from '@/lib/types'

const EMPTY_POS: AngebotPosition = { beschreibung: '', betrag: 0, typ: 'arbeit' }

export default function AngebotNeuPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-950 flex items-center justify-center"><Loader size={20} className="animate-spin text-zinc-600" /></div>}>
      <AngebotNeuForm />
    </Suspense>
  )
}

function AngebotNeuForm() {
  const router       = useRouter()
  const params       = useSearchParams()

  const [werkstattId, setWerkstattId] = useState<string>('')
  const [saving, setSaving]           = useState(false)
  const [error, setError]             = useState<string | null>(null)

  // Kopf-Felder (werden aus URL prefilled wenn von Anruf-Lead)
  const [anrufId,  setAnrufId]  = useState<string | null>(null)
  const [name,     setName]     = useState('')
  const [telefon,  setTelefon]  = useState('')
  const [fahrzeug, setFahrzeug] = useState('')
  const [notiz,    setNotiz]    = useState('')
  const [mwst,     setMwst]     = useState(19)

  const [positionen, setPositionen] = useState<AngebotPosition[]>([{ ...EMPTY_POS }])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.replace('/login'); return }
      setWerkstattId(session.user.user_metadata?.werkstatt_id ?? '')
    })
    // Prefill aus URL-Params (von Anruf-Lead)
    setAnrufId(params.get('anruf_id'))
    setName(params.get('name') ?? '')
    setTelefon(params.get('telefon') ?? '')
    setFahrzeug(params.get('fahrzeug') ?? '')
    const problem = params.get('problem') ?? ''
    if (problem) setNotiz(problem)
  }, [router, params])

  const gesamt = useCallback(() => {
    const netto = positionen.reduce((s, p) => s + (p.betrag || 0), 0)
    return netto * (1 + mwst / 100)
  }, [positionen, mwst])

  function updatePosition(i: number, field: keyof AngebotPosition, value: string | number) {
    setPositionen((prev) => prev.map((p, idx) =>
      idx === i ? { ...p, [field]: value } : p
    ))
  }

  function addPosition() {
    setPositionen((prev) => [...prev, { ...EMPTY_POS }])
  }

  function removePosition(i: number) {
    setPositionen((prev) => prev.filter((_, idx) => idx !== i))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name || !fahrzeug || positionen.some((p) => !p.beschreibung)) {
      setError('Name, Fahrzeug und alle Positionen müssen ausgefüllt sein.')
      return
    }
    setSaving(true)
    setError(null)

    const res = await fetch('/api/angebot', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        werkstatt_id: werkstattId,
        anruf_id: anrufId,
        kunden_name: name,
        kunden_telefon: telefon,
        fahrzeug,
        notiz: notiz || null,
        positionen,
        mwst_prozent: mwst,
      }),
    })

    const json = await res.json()
    if (!res.ok || json.error) {
      setError(json.error ?? 'Fehler beim Speichern.')
      setSaving(false)
      return
    }

    router.push('/angebote')
  }

  const netto  = positionen.reduce((s, p) => s + (p.betrag || 0), 0)
  const total  = gesamt()

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans">
      <header className="border-b border-zinc-800 bg-zinc-900/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          <button onClick={() => router.back()} className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 transition-colors">
            <ArrowLeft size={16} />
          </button>
          <h1 className="text-sm font-semibold text-zinc-100">Neues Angebot</h1>
          {anrufId && (
            <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded-full">
              aus Anruf
            </span>
          )}
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Kundendaten */}
          <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
            <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Kundendaten</h2>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Name *</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Hans Müller"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-orange-500 transition-colors"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-500 mb-1 block">Telefon</label>
                <input
                  value={telefon}
                  onChange={(e) => setTelefon(e.target.value)}
                  placeholder="+49 172 …"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-orange-500 transition-colors"
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-zinc-500 mb-1 block">Fahrzeug *</label>
              <input
                value={fahrzeug}
                onChange={(e) => setFahrzeug(e.target.value)}
                placeholder="VW Golf, Bj. 2019"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-orange-500 transition-colors"
              />
            </div>
            <div>
              <label className="text-xs text-zinc-500 mb-1 block">Notiz / Problem</label>
              <textarea
                value={notiz}
                onChange={(e) => setNotiz(e.target.value)}
                rows={2}
                placeholder="Bremsscheiben vorne, Geräusche beim Bremsen…"
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-orange-500 transition-colors resize-none"
              />
            </div>
          </section>

          {/* Positionen */}
          <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
            <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Positionen *</h2>

            {positionen.map((pos, i) => (
              <div key={i} className="grid grid-cols-[1fr_auto_auto_auto] gap-2 items-center">
                <input
                  value={pos.beschreibung}
                  onChange={(e) => updatePosition(i, 'beschreibung', e.target.value)}
                  placeholder="Bremsscheiben vorne"
                  className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-orange-500 transition-colors"
                />
                <select
                  value={pos.typ}
                  onChange={(e) => updatePosition(i, 'typ', e.target.value)}
                  className="bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-2 text-xs text-zinc-300 focus:outline-none focus:border-orange-500 transition-colors"
                >
                  <option value="teil">Teil</option>
                  <option value="arbeit">Arbeit</option>
                  <option value="sonstiges">Sonstiges</option>
                </select>
                <div className="relative">
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={pos.betrag || ''}
                    onChange={(e) => updatePosition(i, 'betrag', parseFloat(e.target.value) || 0)}
                    placeholder="0"
                    className="w-24 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 pr-6 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-orange-500 transition-colors text-right"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-zinc-500">€</span>
                </div>
                {positionen.length > 1 && (
                  <button type="button" onClick={() => removePosition(i)} className="p-2 text-zinc-600 hover:text-red-400 transition-colors">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}

            <button type="button" onClick={addPosition}
              className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-orange-400 transition-colors mt-1"
            >
              <Plus size={13} />
              Position hinzufügen
            </button>
          </section>

          {/* MwSt + Gesamt */}
          <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-500">MwSt.</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  value={mwst}
                  onChange={(e) => setMwst(parseFloat(e.target.value) || 0)}
                  className="w-16 bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1 text-sm text-zinc-100 text-right focus:outline-none focus:border-orange-500 transition-colors"
                />
                <span className="text-xs text-zinc-500">%</span>
              </div>
            </div>
            <div className="flex items-center justify-between border-t border-zinc-800 pt-3">
              <span className="text-xs text-zinc-500">Netto</span>
              <span className="text-sm text-zinc-300">{netto.toFixed(2)} €</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-500">MwSt. ({mwst}%)</span>
              <span className="text-sm text-zinc-300">{(total - netto).toFixed(2)} €</span>
            </div>
            <div className="flex items-center justify-between border-t border-zinc-800 pt-3">
              <span className="text-sm font-semibold text-zinc-100">Gesamt</span>
              <span className="text-lg font-bold text-orange-400">{total.toFixed(2)} €</span>
            </div>
          </section>

          {error && (
            <p className="text-sm text-red-400 bg-red-950/50 border border-red-800 rounded-lg px-4 py-3">{error}</p>
          )}

          <div className="flex gap-3">
            <button type="button" onClick={() => router.back()}
              className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium py-3 rounded-xl transition-colors"
            >
              Abbrechen
            </button>
            <button type="submit" disabled={saving}
              className="flex-1 bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-white text-sm font-medium py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {saving ? <><Loader size={14} className="animate-spin" /> Wird gespeichert…</> : 'Angebot erstellen + SMS senden'}
            </button>
          </div>

        </form>
      </main>
    </div>
  )
}
