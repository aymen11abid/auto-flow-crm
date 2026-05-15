'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, XCircle, Loader, AlertTriangle, Wrench, Car, Camera, X } from 'lucide-react'
import VoxaroLogo from '@/components/VoxaroLogo'
import type { PublicOrder, Freigabe, OrderStatus } from '@/lib/types'

type PageState = 'loading' | 'ready' | 'not_found'

const STATUS_STEPS: { key: OrderStatus | 'warten_auf_freigabe'; label: string }[] = [
  { key: 'neu',                 label: 'Eingang' },
  { key: 'in_bearbeitung',     label: 'In Arbeit' },
  { key: 'warten_auf_freigabe', label: 'Rückfrage' },
  { key: 'abgeschlossen',      label: 'Fertig' },
]

function getStepIndex(status: OrderStatus): number {
  if (status === 'eskalation_rueckruf') return 1
  return STATUS_STEPS.findIndex((s) => s.key === status)
}

export default function KundenPortalPage({ params }: { params: Promise<{ token: string }> }) {
  const [order, setOrder]       = useState<PublicOrder | null>(null)
  const [freigaben, setFreigaben] = useState<Freigabe[]>([])
  const [state, setState]       = useState<PageState>('loading')
  const [submitting, setSubmitting] = useState<string | null>(null)
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)

  useEffect(() => {
    params.then(({ token }) => {
      fetch(`/api/portal/${token}`)
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

  async function resolve(freigabeId: string, batchToken: string, result: 'approved' | 'rejected') {
    if (submitting) return
    setSubmitting(freigabeId)
    const res = await fetch(`/api/freigabe/${batchToken}`, {
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
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center px-4 py-10">
        <div className="w-full max-w-sm space-y-5">
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

  if (!order) return null

  const currentStep = getStepIndex(order.status)
  const isAbgeschlossen = order.status === 'abgeschlossen'
  const offene = freigaben.filter((f) => !f.ergebnis)
  const entschieden = freigaben.filter((f) => f.ergebnis)

  return (
    <>
    {lightboxUrl && (
      <div
        className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
        onClick={() => setLightboxUrl(null)}
      >
        <button
          onClick={() => setLightboxUrl(null)}
          className="absolute top-4 right-4 bg-zinc-800 hover:bg-zinc-700 rounded-full p-2 text-zinc-300"
        >
          <X size={18} />
        </button>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={lightboxUrl}
          alt="Schadensfoto"
          className="max-w-full max-h-[90vh] rounded-xl object-contain"
          onClick={(e) => e.stopPropagation()}
        />
      </div>
    )}
    <Shell>
      {/* Fahrzeug-Header */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-1">
        <div className="flex items-center gap-2 text-zinc-500 text-xs mb-1">
          <Car size={13} />
          <span className="uppercase tracking-wider">Ihr Fahrzeug</span>
        </div>
        <p className="font-semibold text-zinc-100">{order.fahrzeug}</p>
        <p className="text-sm text-zinc-400">{order.problem_beschreibung}</p>
        <p className="text-xs text-zinc-600 mt-1">
          Eingang: {new Date(order.erstellt_am).toLocaleDateString('de-DE', {
            day: '2-digit', month: '2-digit', year: 'numeric',
          })}
        </p>
      </div>

      {/* Status-Timeline */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
        <p className="text-xs text-zinc-500 uppercase tracking-wider mb-4">Status</p>

        {order.status === 'eskalation_rueckruf' ? (
          <div className="flex items-center gap-2 text-sm text-red-300 bg-red-950/40 border border-red-800 rounded-xl px-3 py-2.5">
            <AlertTriangle size={15} className="shrink-0" />
            Wir melden uns telefonisch bei Ihnen.
          </div>
        ) : (
          <div className="flex items-center gap-1">
            {STATUS_STEPS.map((step, i) => {
              const done    = i < currentStep
              const active  = i === currentStep
              return (
                <div key={step.key} className="flex items-center flex-1 last:flex-none">
                  <div className="flex flex-col items-center gap-1 shrink-0">
                    <div className={[
                      'w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all',
                      done   ? 'bg-green-600 text-white' :
                      active ? 'bg-orange-500 text-white ring-2 ring-orange-400/50' :
                               'bg-zinc-800 text-zinc-600',
                    ].join(' ')}>
                      {done ? <CheckCircle2 size={14} /> :
                       active ? <Wrench size={12} /> :
                       <span>{i + 1}</span>}
                    </div>
                    <span className={[
                      'text-[10px] text-center leading-tight w-14',
                      done ? 'text-green-400' : active ? 'text-orange-300 font-medium' : 'text-zinc-600',
                    ].join(' ')}>
                      {step.label}
                    </span>
                  </div>
                  {i < STATUS_STEPS.length - 1 && (
                    <div className={[
                      'flex-1 h-0.5 mb-4 mx-1',
                      done ? 'bg-green-600' : 'bg-zinc-800',
                    ].join(' ')} />
                  )}
                </div>
              )
            })}
          </div>
        )}

        {isAbgeschlossen && (
          <div className="mt-3 text-center text-green-300 text-sm bg-green-950/40 border border-green-800 rounded-xl px-3 py-2">
            Ihr Fahrzeug ist fertig — bitte abholen.
          </div>
        )}
      </div>

      {/* Offene Freigaben */}
      {offene.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-zinc-500 uppercase tracking-wider px-1">
            Freigabe erforderlich · {offene.length} Position{offene.length > 1 ? 'en' : ''}
          </p>
          {offene.map((f) => (
            <div key={f.id} className="bg-zinc-900 border border-zinc-700 rounded-2xl p-4 space-y-3">
              {f.foto_url && (
                <button
                  onClick={() => setLightboxUrl(f.foto_url)}
                  className="w-full flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded-xl px-3 py-2 text-left transition-colors"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={f.foto_url} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0" />
                  <span className="flex items-center gap-1.5 text-xs text-zinc-400">
                    <Camera size={12} />
                    Schadensfoto ansehen
                  </span>
                </button>
              )}
              <div className="space-y-3">
              <p className="text-sm text-zinc-200 leading-relaxed">{f.beschreibung}</p>
              {f.betrag != null && (
                <div className="flex items-center justify-between bg-orange-950/30 border border-orange-800/50 rounded-xl px-3 py-2">
                  <span className="text-xs text-zinc-400">Geschätzte Kosten</span>
                  <span className="font-bold text-orange-300">{f.betrag.toFixed(2)} €</span>
                </div>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => resolve(f.id, f.batch_token, 'approved')}
                  disabled={submitting === f.id}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl transition-colors text-sm"
                >
                  {submitting === f.id ? <Loader size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                  Freigeben
                </button>
                <button
                  onClick={() => resolve(f.id, f.batch_token, 'rejected')}
                  disabled={submitting === f.id}
                  className="flex-1 flex items-center justify-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-300 font-medium py-2.5 rounded-xl transition-colors text-sm"
                >
                  <XCircle size={14} />
                  Ablehnen
                </button>
              </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Entschiedene Freigaben */}
      {entschieden.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-zinc-500 uppercase tracking-wider px-1">Entschieden</p>
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
                {f.betrag != null && <p className="text-xs mt-0.5 opacity-70">{f.betrag.toFixed(2)} €</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Alles erledigt */}
      {freigaben.length > 0 && offene.length === 0 && (
        <div className="bg-green-950/40 border border-green-800 rounded-2xl p-4 text-center text-green-300 text-sm">
          Alle Positionen wurden entschieden. Die Werkstatt wurde benachrichtigt.
        </div>
      )}

      <p className="text-center text-xs text-zinc-700 pb-2">
        Powered by Voxaro
      </p>
    </Shell>
    </>
  )
}
