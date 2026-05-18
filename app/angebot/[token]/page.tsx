'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { CheckCircle, XCircle, Loader, Car, Wrench, Package } from 'lucide-react'
import type { Angebot, AngebotPosition } from '@/lib/types'

const TYP_LABEL: Record<AngebotPosition['typ'], string> = {
  teil: 'Ersatzteil',
  arbeit: 'Arbeitszeit',
  sonstiges: 'Sonstiges',
}

export default function AngebotKundePage() {
  const { token } = useParams<{ token: string }>()

  const [angebot, setAngebot] = useState<Angebot | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving,  setSaving]  = useState(false)
  const [done,    setDone]    = useState<'genehmigt' | 'abgelehnt' | null>(null)
  const [error,   setError]   = useState<string | null>(null)

  useEffect(() => {
    fetch(`/api/angebot/${token}`)
      .then((r) => r.json())
      .then(({ angebot, error }) => {
        if (error) setError('Angebot nicht gefunden.')
        else {
          setAngebot(angebot)
          if (angebot.status === 'genehmigt' || angebot.status === 'abgelehnt') {
            setDone(angebot.status)
          }
        }
        setLoading(false)
      })
      .catch(() => { setError('Fehler beim Laden.'); setLoading(false) })
  }, [token])

  async function entscheiden(ergebnis: 'genehmigt' | 'abgelehnt') {
    setSaving(true)
    const res = await fetch(`/api/angebot/${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ergebnis }),
    })
    const json = await res.json()
    if (json.ok) {
      setDone(ergebnis)
    } else {
      setError(json.error ?? 'Fehler.')
    }
    setSaving(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader size={20} className="animate-spin text-zinc-600" />
      </div>
    )
  }

  if (error || !angebot) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
        <p className="text-zinc-500 text-sm">{error ?? 'Angebot nicht gefunden.'}</p>
      </div>
    )
  }

  if (done) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4">
        <div className="text-center space-y-3 max-w-sm">
          {done === 'genehmigt' ? (
            <>
              <CheckCircle size={48} className="text-green-400 mx-auto" />
              <p className="text-lg font-semibold text-zinc-100">Angebot genehmigt</p>
              <p className="text-sm text-zinc-500">
                Die Werkstatt wurde informiert und wird sich bei Ihnen melden.
              </p>
            </>
          ) : (
            <>
              <XCircle size={48} className="text-red-400 mx-auto" />
              <p className="text-lg font-semibold text-zinc-100">Angebot abgelehnt</p>
              <p className="text-sm text-zinc-500">
                Vielen Dank für Ihre Rückmeldung.
              </p>
            </>
          )}
        </div>
      </div>
    )
  }

  const netto  = angebot.positionen.reduce((s, p) => s + p.betrag, 0)
  const mwstB  = Math.round((angebot.gesamt - netto) * 100) / 100

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans">
      <div className="max-w-md mx-auto px-4 py-8 space-y-6">

        {/* Kopf */}
        <div className="space-y-1">
          <p className="text-xs text-zinc-500 uppercase tracking-wider">Angebot für Sie</p>
          <h1 className="text-xl font-bold text-zinc-100">{angebot.kunden_name}</h1>
          <p className="text-sm text-zinc-400 flex items-center gap-1.5">
            <Car size={13} className="text-zinc-600" />
            {angebot.fahrzeug}
          </p>
          {angebot.notiz && (
            <p className="text-xs text-zinc-600 mt-1">{angebot.notiz}</p>
          )}
        </div>

        {/* Positionen */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-800">
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Leistungen</p>
          </div>
          <ul className="divide-y divide-zinc-800">
            {angebot.positionen.map((pos, i) => (
              <li key={i} className="px-4 py-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm text-zinc-100">{pos.beschreibung}</p>
                  <p className="text-xs text-zinc-600 flex items-center gap-1 mt-0.5">
                    {pos.typ === 'teil' ? <Package size={10} /> : <Wrench size={10} />}
                    {TYP_LABEL[pos.typ]}
                  </p>
                </div>
                <span className="text-sm font-medium text-zinc-200 shrink-0">
                  {pos.betrag.toFixed(2)} €
                </span>
              </li>
            ))}
          </ul>
          <div className="px-4 py-3 border-t border-zinc-800 space-y-1.5 bg-zinc-900/50">
            <div className="flex justify-between text-xs text-zinc-500">
              <span>Netto</span><span>{netto.toFixed(2)} €</span>
            </div>
            <div className="flex justify-between text-xs text-zinc-500">
              <span>MwSt. ({angebot.mwst_prozent}%)</span><span>{mwstB.toFixed(2)} €</span>
            </div>
            <div className="flex justify-between text-sm font-bold text-zinc-100 pt-1 border-t border-zinc-800">
              <span>Gesamt</span>
              <span className="text-orange-400">{angebot.gesamt.toFixed(2)} €</span>
            </div>
          </div>
        </div>

        {/* Buttons */}
        {angebot.status === 'gesendet' && (
          <div className="space-y-2">
            <button
              onClick={() => entscheiden('genehmigt')}
              disabled={saving}
              className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-semibold py-4 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {saving ? <Loader size={16} className="animate-spin" /> : <CheckCircle size={16} />}
              Angebot genehmigen
            </button>
            <button
              onClick={() => entscheiden('abgelehnt')}
              disabled={saving}
              className="w-full bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-400 font-medium py-3 rounded-xl transition-colors"
            >
              Ablehnen
            </button>
          </div>
        )}

        {angebot.status === 'entwurf' && (
          <p className="text-center text-xs text-zinc-600">
            Dieses Angebot wurde noch nicht zur Genehmigung freigegeben.
          </p>
        )}

        <p className="text-center text-xs text-zinc-700 pt-2">
          Powered by Voxaro
        </p>
      </div>
    </div>
  )
}
