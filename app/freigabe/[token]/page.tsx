'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, XCircle, Loader, AlertTriangle } from 'lucide-react'
import VoxaroLogo from '@/components/VoxaroLogo'
import type { Order, Freigabe } from '@/lib/types'

type PageState = 'loading' | 'ready' | 'not_found' | 'error'

export default function FreigabePage({ params }: { params: Promise<{ token: string }> }) {
  const [token, setToken]       = useState<string | null>(null)
  const [order, setOrder]       = useState<Order | null>(null)
  const [freigaben, setFreigaben] = useState<Freigabe[]>([])
  const [state, setState]       = useState<PageState>('loading')
  const [submitting, setSubmitting] = useState<string | null>(null)

  useEffect(() => {
    params.then(({ token }) => {
      setToken(token)
      fetch(`/api/freigabe/${token}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.error || !data.order) { setState('not_found'); return }
          setOrder(data.order)
          setFreigaben(data.freigaben ?? [])
          setState('ready')
        })
        .catch(() => setState('not_found'))
    })
  }, [params])

  async function resolve(freigabeId: string, result: 'approved' | 'rejected') {
    if (!token || submitting) return
    setSubmitting(freigabeId)
    const res  = await fetch(`/api/freigabe/${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ freigabeId, result }),
    })
    if (res.ok) {
      setFreigaben((prev) =>
        prev.map((f) => f.id === freigabeId ? { ...f, ergebnis: result } : f)
      )
    }
    setSubmitting(null)
  }

  function Shell({ children }: { children: React.ReactNode }) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm space-y-6">
          <div className="flex justify-center mb-2"><VoxaroLogo size="sm" /></div>
          {children}
        </div>
      </div>
    )
  }

  if (state === 'loading') return (
    <Shell><div className="flex justify-center py-10"><Loader size={24} className="animate-spin text-zinc-500" /></div></Shell>
  )

  if (state === 'not_found') return (
    <Shell>
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 text-center space-y-2">
        <AlertTriangle size={28} className="text-yellow-400 mx-auto" />
        <p className="font-semibold">Link nicht gefunden</p>
        <p className="text-sm text-zinc-500">Dieser Link ist ungültig oder abgelaufen.</p>
      </div>
    </Shell>
  )

  const offene    = freigaben.filter((f) => !f.ergebnis)
  const entschieden = freigaben.filter((f) => f.ergebnis)
  const gesamtOffen = offene.reduce((s, f) => s + (f.betrag ?? 0), 0)

  return (
    <Shell>
      <div className="space-y-3">
        {/* Header */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-1">
          <p className="text-xs text-zinc-500 uppercase tracking-wider">Ihr Fahrzeug</p>
          <p className="font-semibold text-zinc-100">{order?.fahrzeug}</p>
          <p className="text-xs text-zinc-500">{order?.kunden_name}</p>
        </div>

        {/* Offene Positionen */}
        {offene.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-zinc-500 uppercase tracking-wider px-1">
              Freigabe erforderlich · {offene.length} Position{offene.length > 1 ? 'en' : ''}
            </p>
            {offene.map((f) => (
              <div key={f.id} className="bg-zinc-900 border border-zinc-700 rounded-2xl overflow-hidden space-y-3">
                {f.foto_url && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={f.foto_url} alt="Schadensfoto" className="w-full object-cover max-h-56" />
                )}
                <div className="px-4 pb-4 space-y-3">
                <p className="text-sm text-zinc-200 leading-relaxed">{f.beschreibung}</p>
                {f.betrag && (
                  <div className="flex items-center justify-between bg-orange-950/30 border border-orange-800/50 rounded-xl px-3 py-2">
                    <span className="text-xs text-zinc-400">Geschätzte Kosten</span>
                    <span className="font-bold text-orange-300">{f.betrag.toFixed(2)} €</span>
                  </div>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={() => resolve(f.id, 'approved')}
                    disabled={submitting === f.id}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition-colors text-sm"
                  >
                    {submitting === f.id ? <Loader size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                    Freigeben
                  </button>
                  <button
                    onClick={() => resolve(f.id, 'rejected')}
                    disabled={submitting === f.id}
                    className="flex-1 flex items-center justify-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-300 font-medium py-2.5 rounded-xl transition-colors text-sm"
                  >
                    <XCircle size={14} />
                    Ablehnen
                  </button>
                </div>
                </div>{/* px-4 pb-4 */}
              </div>
            ))}
            {gesamtOffen > 0 && (
              <div className="flex justify-between text-sm px-1">
                <span className="text-zinc-500">Gesamt offen</span>
                <span className="font-bold text-orange-300">{gesamtOffen.toFixed(2)} €</span>
              </div>
            )}
          </div>
        )}

        {/* Bereits entschieden */}
        {entschieden.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs text-zinc-500 uppercase tracking-wider px-1">Bereits entschieden</p>
            {entschieden.map((f) => (
              <div key={f.id} className={[
                'flex items-start gap-3 rounded-2xl p-3 border text-sm',
                f.ergebnis === 'approved'
                  ? 'bg-green-950/30 border-green-800 text-green-300'
                  : 'bg-zinc-900 border-zinc-700 text-zinc-500',
              ].join(' ')}>
                {f.ergebnis === 'approved'
                  ? <CheckCircle2 size={15} className="shrink-0 mt-0.5" />
                  : <XCircle size={15} className="shrink-0 mt-0.5" />}
                <div className="flex-1 min-w-0">
                  <p className="leading-snug">{f.beschreibung}</p>
                  {f.betrag && <p className="text-xs mt-0.5 opacity-70">{f.betrag.toFixed(2)} €</p>}
                </div>
              </div>
            ))}
          </div>
        )}

        {offene.length === 0 && (
          <div className="bg-green-950/40 border border-green-800 rounded-2xl p-4 text-center text-green-300 text-sm">
            Alle Positionen wurden entschieden. Die Werkstatt wurde benachrichtigt.
          </div>
        )}
      </div>
    </Shell>
  )
}
