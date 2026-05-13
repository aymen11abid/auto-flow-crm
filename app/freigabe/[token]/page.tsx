'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, XCircle, Loader, AlertTriangle } from 'lucide-react'
import VoxaroLogo from '@/components/VoxaroLogo'
import type { Order } from '@/lib/types'

type PageState = 'loading' | 'ready' | 'not_found' | 'already_resolved' | 'submitting' | 'approved' | 'rejected' | 'error'

export default function FreigabePage({ params }: { params: Promise<{ token: string }> }) {
  const [token, setToken]   = useState<string | null>(null)
  const [order, setOrder]   = useState<Order | null>(null)
  const [state, setState]   = useState<PageState>('loading')
  const [errMsg, setErrMsg] = useState('')

  useEffect(() => {
    params.then(({ token }) => {
      setToken(token)
      fetch(`/api/freigabe/${token}`)
        .then((r) => r.json())
        .then((data) => {
          if (data.error || !data.order) {
            setState('not_found')
            return
          }
          const o: Order = data.order
          if (o.freigabe_ergebnis === 'approved') { setState('approved'); setOrder(o); return }
          if (o.freigabe_ergebnis === 'rejected')  { setState('rejected');  setOrder(o); return }
          setOrder(o)
          setState('ready')
        })
        .catch(() => setState('not_found'))
    })
  }, [params])

  async function resolve(result: 'approved' | 'rejected') {
    if (!token) return
    setState('submitting')
    const res  = await fetch(`/api/freigabe/${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ result }),
    })
    const data = await res.json()
    if (!res.ok || data.error) {
      setErrMsg(data.error ?? 'Fehler')
      setState('error')
    } else {
      setState(result)
    }
  }

  /* ── Shared layout wrapper ─────────────────────────────────── */
  function Shell({ children }: { children: React.ReactNode }) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-sm space-y-6">
          <div className="flex justify-center mb-2">
            <VoxaroLogo size="sm" />
          </div>
          {children}
        </div>
      </div>
    )
  }

  if (state === 'loading') return (
    <Shell>
      <div className="flex justify-center py-10">
        <Loader size={24} className="animate-spin text-zinc-500" />
      </div>
    </Shell>
  )

  if (state === 'not_found') return (
    <Shell>
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 text-center space-y-2">
        <AlertTriangle size={28} className="text-yellow-400 mx-auto" />
        <p className="font-semibold text-zinc-100">Link nicht gefunden</p>
        <p className="text-sm text-zinc-500">Dieser Freigabe-Link ist ungültig oder abgelaufen.</p>
      </div>
    </Shell>
  )

  if (state === 'approved') return (
    <Shell>
      <div className="bg-green-950/60 border border-green-700 rounded-2xl p-8 text-center space-y-3">
        <CheckCircle2 size={40} className="text-green-400 mx-auto" />
        <p className="text-lg font-bold text-green-300">Freigabe erteilt</p>
        <p className="text-sm text-zinc-400">
          {order?.freigabe_betrag
            ? `${order.freigabe_betrag.toFixed(2)} € wurden freigegeben.`
            : 'Die Reparatur wurde freigegeben.'}
        </p>
        <p className="text-xs text-zinc-600">Die Werkstatt wurde benachrichtigt.</p>
      </div>
    </Shell>
  )

  if (state === 'rejected') return (
    <Shell>
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-8 text-center space-y-3">
        <XCircle size={40} className="text-zinc-500 mx-auto" />
        <p className="text-lg font-bold text-zinc-300">Abgelehnt</p>
        <p className="text-sm text-zinc-500">Die Werkstatt wird Sie für weitere Informationen kontaktieren.</p>
      </div>
    </Shell>
  )

  if (state === 'error') return (
    <Shell>
      <div className="bg-red-950/50 border border-red-700 rounded-2xl p-6 text-center space-y-2">
        <AlertTriangle size={28} className="text-red-400 mx-auto" />
        <p className="font-semibold text-red-300">Fehler</p>
        <p className="text-sm text-red-400">{errMsg}</p>
        <button onClick={() => setState('ready')} className="text-sm text-zinc-400 hover:text-zinc-200 underline mt-2">
          Erneut versuchen
        </button>
      </div>
    </Shell>
  )

  /* ── Main approval view ─────────────────────────────────────── */
  return (
    <Shell>
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl overflow-hidden">

        {/* Photo */}
        {order?.freigabe_foto_url && (
          <div className="aspect-video bg-zinc-800 overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={order.freigabe_foto_url}
              alt="Schadensfoto"
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <div className="p-5 space-y-4">
          {/* Customer & vehicle */}
          <div>
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-0.5">Ihr Fahrzeug</p>
            <p className="font-semibold text-zinc-100">{order?.fahrzeug}</p>
          </div>

          {/* Mechanic's finding */}
          <div className="bg-zinc-800/60 border border-zinc-700 rounded-xl p-3">
            <p className="text-xs text-zinc-500 mb-1">Befund des Mechanikers</p>
            <p className="text-sm text-zinc-200 leading-relaxed">{order?.freigabe_beschreibung}</p>
          </div>

          {/* Price */}
          {order?.freigabe_betrag && (
            <div className="flex items-center justify-between bg-orange-950/30 border border-orange-800/50 rounded-xl px-4 py-3">
              <span className="text-sm text-zinc-300">Geschätzte Kosten</span>
              <span className="text-lg font-bold text-orange-300">
                {order.freigabe_betrag.toFixed(2)} €
              </span>
            </div>
          )}

          {/* Action buttons */}
          <div className="space-y-2 pt-1">
            <button
              onClick={() => resolve('approved')}
              disabled={state === 'submitting'}
              className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-semibold py-3.5 rounded-xl transition-colors text-sm"
            >
              {state === 'submitting' ? (
                <Loader size={16} className="animate-spin" />
              ) : (
                <CheckCircle2 size={16} />
              )}
              Ja, Reparatur freigeben
            </button>
            <button
              onClick={() => resolve('rejected')}
              disabled={state === 'submitting'}
              className="w-full text-zinc-400 hover:text-zinc-200 text-sm py-2.5 rounded-xl hover:bg-zinc-800 transition-colors disabled:opacity-50"
            >
              Ablehnen / Rückruf gewünscht
            </button>
          </div>

          <p className="text-xs text-zinc-600 text-center">
            {order?.kunden_name} · {order?.kunden_telefonnummer}
          </p>
        </div>
      </div>
    </Shell>
  )
}
