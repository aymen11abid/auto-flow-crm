'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ChevronLeft, Phone, AlertTriangle, Loader,
  CheckCircle2, XCircle, Clock, Sun, Sunset, MessageSquare,
} from 'lucide-react'
import { fetchOrderById, fetchKommentare, createKommentar } from '@/lib/db'
import { STATUS_CONFIG } from '@/lib/constants'
import { supabase } from '@/lib/supabase'
import VoxaroLogo from '@/components/VoxaroLogo'
import type { Order, Kommentar } from '@/lib/types'

export default function AuftragDetailPage() {
  const params  = useParams()
  const router  = useRouter()
  const id      = params.id as string

  const [order, setOrder]           = useState<Order | null>(null)
  const [kommentare, setKommentare] = useState<Kommentar[]>([])
  const [loadingPage, setLoadingPage] = useState(true)
  const [kommentarText, setKommentarText] = useState('')
  const [saving, setSaving]         = useState(false)
  const [error, setError]           = useState<string | null>(null)
  const textareaRef                 = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.replace('/login'); return }
      Promise.all([fetchOrderById(id), fetchKommentare(id)]).then(
        ([{ order, error }, kommentare]) => {
          if (error || !order) { router.replace('/'); return }
          setOrder(order)
          setKommentare(kommentare)
          setLoadingPage(false)
        }
      )
    })
  }, [id, router])

  async function handleAddKommentar() {
    const text = kommentarText.trim()
    if (!text || saving) return
    setSaving(true)
    const err = await createKommentar(id, text)
    if (err) {
      setError(err)
    } else {
      setKommentarText('')
      const fresh = await fetchKommentare(id)
      setKommentare(fresh)
    }
    setSaving(false)
    textareaRef.current?.focus()
  }

  if (loadingPage) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <Loader size={24} className="animate-spin text-zinc-500" />
      </div>
    )
  }

  if (!order) return null

  const { label, color, Icon } = STATUS_CONFIG[order.status]
  const isEskalation = order.status === 'eskalation_rueckruf'

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans pb-12">

      {/* Sticky Header */}
      <header className="sticky top-0 z-10 bg-zinc-900/90 backdrop-blur border-b border-zinc-800 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
        >
          <ChevronLeft size={20} />
        </button>
        <VoxaroLogo size="sm" />
      </header>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">

        {/* Hero */}
        <div className={[
          'rounded-2xl border p-5',
          isEskalation
            ? 'bg-red-950/30 border-red-700'
            : 'bg-zinc-900 border-zinc-800',
        ].join(' ')}>
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium ${color}`}>
              <Icon size={11} />
              {label}
            </span>
            {order.ist_wiederholung && (
              <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium bg-orange-950/50 text-orange-300 border-orange-700">
                Rückrufer
              </span>
            )}
          </div>
          <h1 className="text-2xl font-bold text-zinc-100 mt-2">{order.kunden_name}</h1>
          <p className="text-zinc-400 text-sm mt-0.5">{order.fahrzeug}</p>
          <p className="text-xs text-zinc-600 mt-2">
            {new Date(order.erstellt_am).toLocaleString('de-DE', {
              day: '2-digit', month: '2-digit', year: 'numeric',
              hour: '2-digit', minute: '2-digit',
            })}
          </p>
        </div>

        {/* Kontakt */}
        <Section title="Kontakt">
          <a
            href={`tel:${order.kunden_telefonnummer}`}
            className="flex items-center gap-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl px-4 py-3 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center shrink-0">
              <Phone size={15} className="text-orange-400" />
            </div>
            <span className="text-sm font-medium">{order.kunden_telefonnummer || '—'}</span>
          </a>
        </Section>

        {/* Problembeschreibung */}
        <Section title="Problembeschreibung">
          <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">
            {order.problem_beschreibung || '—'}
          </p>
        </Section>

        {/* Wunschtermin & Rückruf */}
        {(order.wunschtermin_tag || order.rueckruf_wunsch) && (
          <Section title="Terminwunsch">
            {order.wunschtermin_tag && (
              <Row
                icon={<Sun size={14} className="text-yellow-400" />}
                label="Wunschtermin"
                value={`${order.wunschtermin_tag}${order.wunschtermin_zeit ? ` · ${order.wunschtermin_zeit}` : ''}`}
              />
            )}
            {order.rueckruf_wunsch && (
              <Row
                icon={order.rueckruf_wunsch === 'nachmittags'
                  ? <Sunset size={14} className="text-orange-400" />
                  : <Sun size={14} className="text-yellow-400" />}
                label="Rückruf"
                value={order.rueckruf_wunsch}
              />
            )}
          </Section>
        )}

        {/* Freigabe */}
        {order.freigabe_token && (
          <Section title="Freigabe">
            <div className={[
              'flex items-center gap-2 text-sm px-3 py-2 rounded-xl border',
              order.freigabe_ergebnis === 'approved'
                ? 'bg-green-950/50 border-green-800 text-green-300'
                : order.freigabe_ergebnis === 'rejected'
                  ? 'bg-red-950/50 border-red-800 text-red-300'
                  : 'bg-yellow-950/40 border-yellow-800 text-yellow-300',
            ].join(' ')}>
              {order.freigabe_ergebnis === 'approved' && <CheckCircle2 size={15} />}
              {order.freigabe_ergebnis === 'rejected' && <XCircle size={15} />}
              {!order.freigabe_ergebnis && <Clock size={15} className="animate-pulse" />}
              <span className="font-medium">
                {order.freigabe_ergebnis === 'approved' ? 'Freigegeben' :
                 order.freigabe_ergebnis === 'rejected' ? 'Abgelehnt' : 'Ausstehend'}
              </span>
              {order.freigabe_betrag && (
                <span className="ml-auto font-bold">{order.freigabe_betrag.toFixed(2)} €</span>
              )}
            </div>
            {order.freigabe_beschreibung && (
              <p className="text-xs text-zinc-500 mt-2 leading-relaxed">{order.freigabe_beschreibung}</p>
            )}
          </Section>
        )}

        {/* Foto */}
        {order.foto_url && (
          <Section title="Foto">
            <a href={order.foto_url} target="_blank" rel="noopener noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={order.foto_url}
                alt="Auftragsfoto"
                className="w-full rounded-xl object-cover max-h-72 hover:opacity-90 transition-opacity"
              />
            </a>
          </Section>
        )}
        {order.freigabe_foto_url && (
          <Section title="Freigabe-Foto">
            <a href={order.freigabe_foto_url} target="_blank" rel="noopener noreferrer">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={order.freigabe_foto_url}
                alt="Freigabefoto"
                className="w-full rounded-xl object-cover max-h-72 hover:opacity-90 transition-opacity"
              />
            </a>
          </Section>
        )}

        {/* Kommentare */}
        <Section title={`Kommentare (${kommentare.length})`} icon={<MessageSquare size={14} />}>
          {kommentare.length === 0 ? (
            <p className="text-xs text-zinc-600 py-2">Noch keine Kommentare.</p>
          ) : (
            <ul className="space-y-2">
              {kommentare.map((k) => (
                <li key={k.id} className="bg-zinc-800/60 border border-zinc-700 rounded-xl px-3 py-2.5">
                  <p className="text-sm text-zinc-200 leading-relaxed">{k.text}</p>
                  <p className="text-xs text-zinc-600 mt-1">
                    {new Date(k.erstellt_am).toLocaleString('de-DE', {
                      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
                    })}
                  </p>
                </li>
              ))}
            </ul>
          )}

          {error && <p className="text-red-400 text-xs mt-2">{error}</p>}

          <div className="mt-3 flex gap-2 items-end">
            <textarea
              ref={textareaRef}
              rows={2}
              value={kommentarText}
              onChange={(e) => setKommentarText(e.target.value)}
              placeholder="Kommentar hinzufügen…"
              className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-orange-500 resize-none"
            />
            <button
              onClick={handleAddKommentar}
              disabled={saving || !kommentarText.trim()}
              className="shrink-0 bg-orange-500 hover:bg-orange-400 disabled:opacity-40 text-white text-sm font-medium px-4 py-2 rounded-xl transition-colors h-[60px]"
            >
              {saving ? <Loader size={14} className="animate-spin" /> : 'Speichern'}
            </button>
          </div>
        </Section>

        {/* Eskalation warning */}
        {isEskalation && (
          <div className="flex items-center gap-2 bg-red-950/40 border border-red-700 rounded-xl px-4 py-3 text-red-300 text-sm">
            <AlertTriangle size={16} className="shrink-0 animate-pulse" />
            Dieser Auftrag erfordert sofortigen Rückruf.
          </div>
        )}

      </div>
    </div>
  )
}

function Section({
  title, icon, children,
}: {
  title: string
  icon?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4 space-y-3">
      <h2 className="flex items-center gap-1.5 text-xs font-semibold text-zinc-500 uppercase tracking-wider">
        {icon}
        {title}
      </h2>
      {children}
    </div>
  )
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {icon}
      <span className="text-zinc-500">{label}:</span>
      <span className="text-zinc-200 capitalize">{value}</span>
    </div>
  )
}
