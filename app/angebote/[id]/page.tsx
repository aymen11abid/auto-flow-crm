'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import {
  ArrowLeft, Plus, Trash2, Loader, Send, CheckCircle,
  XCircle, FileText, Percent, Euro, Printer,
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { fetchAngebotById } from '@/lib/db'
import DashboardNav from '@/components/DashboardNav'
import type { Angebot, AngebotPosition } from '@/lib/types'

const EMPTY_POS: AngebotPosition = { beschreibung: '', betrag: 0, typ: 'arbeit' }

const STATUS_CFG = {
  entwurf:   { label: 'Entwurf',    color: 'bg-zinc-700/40 border-zinc-600 text-zinc-400',       icon: FileText },
  gesendet:  { label: 'Gesendet',   color: 'bg-blue-500/10 border-blue-500/30 text-blue-400',    icon: Send },
  genehmigt: { label: 'Genehmigt',  color: 'bg-green-500/10 border-green-500/30 text-green-400', icon: CheckCircle },
  abgelehnt: { label: 'Abgelehnt', color: 'bg-red-500/10 border-red-500/30 text-red-400',        icon: XCircle },
}

function berechne(
  positionen: AngebotPosition[],
  mwst: number,
  rabattTyp: 'prozent' | 'betrag' | null,
  rabattWert: number
) {
  const zwischen = positionen.reduce((s, p) => s + (p.betrag || 0), 0)
  const rabAbs   = rabattTyp === 'prozent' ? zwischen * (rabattWert / 100)
                 : rabattTyp === 'betrag'  ? rabattWert : 0
  const netto    = Math.max(0, zwischen - rabAbs)
  const mwstBet  = netto * (mwst / 100)
  return { zwischen, rabAbs, netto, mwstBet, gesamt: netto + mwstBet }
}

export default function AngebotDetailPage() {
  const router = useRouter()
  const { id } = useParams<{ id: string }>()

  const [angebot, setAngebot]     = useState<Angebot | null>(null)
  const [loading, setLoading]     = useState(true)
  const [saving, setSaving]       = useState(false)
  const [sending, setSending]     = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [success, setSuccess]     = useState<string | null>(null)

  // Edit-Felder
  const [name,      setName]      = useState('')
  const [telefon,   setTelefon]   = useState('')
  const [fahrzeug,  setFahrzeug]  = useState('')
  const [notiz,     setNotiz]     = useState('')
  const [mwst,      setMwst]      = useState(19)
  const [positionen, setPositionen] = useState<AngebotPosition[]>([])
  const [rabattTyp,  setRabattTyp]  = useState<'prozent' | 'betrag' | null>(null)
  const [rabattWert, setRabattWert] = useState(0)
  const [gueltigBis, setGueltigBis] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.replace('/login'); return }
    })
    fetchAngebotById(id).then(({ angebot: a }) => {
      if (!a) { router.replace('/angebote'); return }
      setAngebot(a)
      setName(a.kunden_name)
      setTelefon(a.kunden_telefon)
      setFahrzeug(a.fahrzeug)
      setNotiz(a.notiz ?? '')
      setMwst(a.mwst_prozent)
      setPositionen(a.positionen.length > 0 ? a.positionen : [])
      setRabattTyp(a.rabatt_typ)
      setRabattWert(a.rabatt_wert ?? 0)
      setGueltigBis(a.gueltig_bis ?? '')
      setLoading(false)
    })
  }, [id, router])

  const kalkuliert = useCallback(
    () => berechne(positionen, mwst, rabattTyp, rabattWert),
    [positionen, mwst, rabattTyp, rabattWert]
  )

  function updatePosition(i: number, field: keyof AngebotPosition, value: string | number) {
    setPositionen((prev) => prev.map((p, idx) => idx === i ? { ...p, [field]: value } : p))
  }

  async function handleSpeichern() {
    if (!name || !fahrzeug) { setError('Name und Fahrzeug sind Pflichtfelder.'); return }
    setSaving(true); setError(null); setSuccess(null)
    const { gesamt } = kalkuliert()
    const res = await fetch(`/api/angebote/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kunden_name: name, kunden_telefon: telefon, fahrzeug, notiz, positionen, mwst_prozent: mwst, rabatt_typ: rabattTyp, rabatt_wert: rabattWert, gueltig_bis: gueltigBis, gesamt }),
    })
    const json = await res.json()
    if (!res.ok) { setError(json.error ?? 'Fehler beim Speichern.'); setSaving(false); return }
    setAngebot((prev) => prev ? { ...prev, kunden_name: name, kunden_telefon: telefon, fahrzeug, notiz: notiz || null, positionen, mwst_prozent: mwst, rabatt_typ: rabattTyp, rabatt_wert: rabattWert, gueltig_bis: gueltigBis || null, gesamt: json.gesamt } : prev)
    setSuccess('Gespeichert.')
    setSaving(false)
    setTimeout(() => setSuccess(null), 2500)
  }

  async function handleSenden() {
    setSending(true); setError(null)
    const saveRes = await fetch(`/api/angebote/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kunden_name: name, kunden_telefon: telefon, fahrzeug, notiz, positionen, mwst_prozent: mwst, rabatt_typ: rabattTyp, rabatt_wert: rabattWert, gueltig_bis: gueltigBis }),
    })
    if (!saveRes.ok) { const j = await saveRes.json(); setError(j.error ?? 'Fehler.'); setSending(false); return }

    const res = await fetch(`/api/angebote/${id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ aktion: 'senden' }),
    })
    const json = await res.json()
    if (!res.ok) { setError(json.error ?? 'Fehler beim Senden.'); setSending(false); return }
    setAngebot((prev) => prev ? { ...prev, status: 'gesendet' } : prev)
    setSending(false)
    setSuccess('Angebot gesendet! Kunde erhält SMS.')
  }

  if (loading) return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-600">
      <Loader size={20} className="animate-spin mr-2" /> Lade…
    </div>
  )
  if (!angebot) return null

  const editable = true
  const cfg      = STATUS_CFG[angebot.status]
  const { zwischen, rabAbs, netto, mwstBet, gesamt } = kalkuliert()

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans">
      <DashboardNav />

      <header className="border-b border-zinc-800 bg-zinc-900/80 backdrop-blur sticky top-14 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => router.push('/angebote')} className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 transition-colors">
            <ArrowLeft size={16} />
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold text-zinc-100 truncate">{angebot.kunden_name || '—'}</span>
              {angebot.angebotsnummer && (
                <span className="text-xs text-zinc-600">{angebot.angebotsnummer}</span>
              )}
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border flex items-center gap-1 ${cfg.color}`}>
                <cfg.icon size={9} />
                {cfg.label}
              </span>
            </div>
            <p className="text-xs text-zinc-500">{angebot.fahrzeug}</p>
          </div>
          <button
            onClick={() => window.print()}
            className="p-2 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
            title="Drucken / PDF"
          >
            <Printer size={15} />
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6 space-y-4">

        {/* Kundendaten */}
        <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
          <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Kundendaten</h2>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-zinc-500 mb-1 block">Name *</label>
              <input value={name} onChange={(e) => setName(e.target.value)} disabled={!editable}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors" />
            </div>
            <div>
              <label className="text-xs text-zinc-500 mb-1 block">Telefon</label>
              <input value={telefon} onChange={(e) => setTelefon(e.target.value)} disabled={!editable}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors" />
            </div>
          </div>
          <div>
            <label className="text-xs text-zinc-500 mb-1 block">Fahrzeug *</label>
            <input value={fahrzeug} onChange={(e) => setFahrzeug(e.target.value)} disabled={!editable}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors" />
          </div>
          <div>
            <label className="text-xs text-zinc-500 mb-1 block">Notiz / Problem</label>
            <textarea value={notiz} onChange={(e) => setNotiz(e.target.value)} disabled={!editable} rows={2}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors resize-none" />
          </div>
          <div>
            <label className="text-xs text-zinc-500 mb-1 block">Gültig bis</label>
            <input type="date" value={gueltigBis} onChange={(e) => setGueltigBis(e.target.value)} disabled={!editable}
              className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors" />
          </div>
        </section>

        {/* Positionen */}
        <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
          <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">
            Positionen {positionen.length === 0 && editable && <span className="text-zinc-700 font-normal normal-case">(optional für Entwurf)</span>}
          </h2>

          {positionen.length === 0 && !editable && (
            <p className="text-xs text-zinc-600">Keine Positionen erfasst.</p>
          )}

          {positionen.map((pos, i) => (
            <div key={i} className="grid grid-cols-[1fr_auto_auto_auto] gap-2 items-center">
              <input
                value={pos.beschreibung}
                onChange={(e) => updatePosition(i, 'beschreibung', e.target.value)}
                disabled={!editable}
                placeholder="Bremsscheiben vorne"
                className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-orange-500 disabled:opacity-50 transition-colors"
              />
              <select
                value={pos.typ}
                onChange={(e) => updatePosition(i, 'typ', e.target.value)}
                disabled={!editable}
                className="bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-2 text-xs text-zinc-300 focus:outline-none focus:border-orange-500 disabled:opacity-50 transition-colors"
              >
                <option value="teil">Teil</option>
                <option value="arbeit">Arbeit</option>
                <option value="sonstiges">Sonstiges</option>
              </select>
              <div className="relative">
                <input
                  type="number" min="0" step="0.01"
                  value={pos.betrag || ''}
                  onChange={(e) => updatePosition(i, 'betrag', parseFloat(e.target.value) || 0)}
                  disabled={!editable}
                  placeholder="0"
                  className="w-24 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 pr-6 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-orange-500 disabled:opacity-50 transition-colors text-right"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-zinc-500">€</span>
              </div>
              {editable && (
                <button type="button" onClick={() => setPositionen((prev) => prev.filter((_, idx) => idx !== i))}
                  className="p-2 text-zinc-600 hover:text-red-400 transition-colors">
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          ))}

          {editable && (
            <button type="button"
              onClick={() => setPositionen((prev) => [...prev, { ...EMPTY_POS }])}
              className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-orange-400 transition-colors mt-1"
            >
              <Plus size={13} />
              Position hinzufügen
            </button>
          )}
        </section>

        {/* Rabatt + MwSt + Summen */}
        <section className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
          {/* Rabatt */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-500">Rabatt</span>
              {editable && (
                <div className="flex gap-1">
                  <button
                    onClick={() => setRabattTyp(rabattTyp === 'prozent' ? null : 'prozent')}
                    className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg border transition-colors ${rabattTyp === 'prozent' ? 'bg-orange-500/20 border-orange-500/40 text-orange-400' : 'bg-zinc-800 border-zinc-700 text-zinc-500 hover:text-zinc-300'}`}
                  >
                    <Percent size={10} /> %
                  </button>
                  <button
                    onClick={() => setRabattTyp(rabattTyp === 'betrag' ? null : 'betrag')}
                    className={`flex items-center gap-1 text-xs px-2 py-1 rounded-lg border transition-colors ${rabattTyp === 'betrag' ? 'bg-orange-500/20 border-orange-500/40 text-orange-400' : 'bg-zinc-800 border-zinc-700 text-zinc-500 hover:text-zinc-300'}`}
                  >
                    <Euro size={10} /> €
                  </button>
                </div>
              )}
            </div>
            {rabattTyp && (
              <div className="flex items-center gap-2">
                <input
                  type="number" min="0" step="0.01"
                  value={rabattWert || ''}
                  onChange={(e) => setRabattWert(parseFloat(e.target.value) || 0)}
                  disabled={!editable}
                  placeholder="0"
                  className="w-28 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-zinc-100 focus:outline-none focus:border-orange-500 disabled:opacity-50 transition-colors text-right"
                />
                <span className="text-xs text-zinc-500">{rabattTyp === 'prozent' ? '%' : '€'}</span>
                {rabAbs > 0 && (
                  <span className="text-xs text-green-400 ml-auto">− {rabAbs.toFixed(2)} €</span>
                )}
              </div>
            )}
          </div>

          {/* MwSt */}
          <div className="flex items-center justify-between">
            <span className="text-xs text-zinc-500">MwSt.</span>
            <div className="flex items-center gap-1.5">
              <input
                type="number" value={mwst}
                onChange={(e) => setMwst(parseFloat(e.target.value) || 0)}
                disabled={!editable}
                className="w-16 bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1 text-sm text-zinc-100 text-right focus:outline-none focus:border-orange-500 disabled:opacity-50 transition-colors"
              />
              <span className="text-xs text-zinc-500">%</span>
            </div>
          </div>

          {/* Summen */}
          <div className="border-t border-zinc-800 pt-3 space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-zinc-500">Zwischensumme</span>
              <span className="text-zinc-300">{zwischen.toFixed(2)} €</span>
            </div>
            {rabAbs > 0 && (
              <div className="flex justify-between text-xs">
                <span className="text-zinc-500">Rabatt</span>
                <span className="text-green-400">− {rabAbs.toFixed(2)} €</span>
              </div>
            )}
            <div className="flex justify-between text-xs">
              <span className="text-zinc-500">Netto</span>
              <span className="text-zinc-300">{netto.toFixed(2)} €</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-zinc-500">MwSt. ({mwst}%)</span>
              <span className="text-zinc-300">{mwstBet.toFixed(2)} €</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-zinc-800">
              <span className="text-sm font-semibold text-zinc-100">Gesamt</span>
              <span className="text-lg font-bold text-orange-400">{gesamt.toFixed(2)} €</span>
            </div>
          </div>
        </section>

        {/* Fehler / Erfolg */}
        {error && (
          <p className="text-sm text-red-400 bg-red-950/50 border border-red-800 rounded-lg px-4 py-3">{error}</p>
        )}
        {success && (
          <p className="text-sm text-green-400 bg-green-950/50 border border-green-800 rounded-lg px-4 py-3">{success}</p>
        )}

        {/* Aktionen */}
        <div className="flex gap-3 flex-wrap">
          <button
            onClick={handleSpeichern}
            disabled={saving || sending}
            className="flex-1 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-200 text-sm font-medium py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {saving ? <Loader size={14} className="animate-spin" /> : null}
            Speichern
          </button>
          {angebot.status === 'entwurf' && (
            <button
              onClick={handleSenden}
              disabled={saving || sending || !telefon}
              className="flex-1 bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-white text-sm font-medium py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
              title={!telefon ? 'Telefonnummer erforderlich für SMS-Versand' : undefined}
            >
              {sending ? <Loader size={14} className="animate-spin" /> : <Send size={14} />}
              Senden (SMS)
            </button>
          )}
          {angebot.status === 'genehmigt' && (
            <button
              onClick={() => {
                const p = new URLSearchParams({ name: angebot.kunden_name, telefon: angebot.kunden_telefon, fahrzeug: angebot.fahrzeug, problem: angebot.notiz ?? '' })
                router.push(`/?neuer_auftrag=1&${p.toString()}`)
              }}
              className="flex-1 bg-green-600 hover:bg-green-500 text-white text-sm font-medium py-3 rounded-xl transition-colors"
            >
              Zu Auftrag machen →
            </button>
          )}
        </div>

      </main>
    </div>
  )
}
