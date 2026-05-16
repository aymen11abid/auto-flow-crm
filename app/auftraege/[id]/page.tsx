'use client'

import { useEffect, useState, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
  ChevronLeft, Phone, AlertTriangle, Loader,
  CheckCircle2, XCircle, Clock, Sun, Sunset, MessageSquare, Pencil,
  Plus, Trash2, Send, Camera, X, CalendarDays,
} from 'lucide-react'
import imageCompression from 'browser-image-compression'
import { fetchOrderById, fetchKommentare, createKommentar, updateOrderFields, fetchFreigabenByAuftrag, updateOrderStatus, saveTermin } from '@/lib/db'
import { STATUS_CONFIG } from '@/lib/constants'
import { supabase } from '@/lib/supabase'
import VoxaroLogo from '@/components/VoxaroLogo'
import type { Order, Kommentar, Freigabe, OrderStatus } from '@/lib/types'

type Position = { beschreibung: string; betrag: string; foto_url?: string | null; uploading?: boolean }

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
  const [editing, setEditing]       = useState(false)
  const [editForm, setEditForm]     = useState({ kunden_telefonnummer: '', fahrzeug: '', problem_beschreibung: '' })
  const [savingEdit, setSavingEdit] = useState(false)
  const [freigaben, setFreigaben]   = useState<Freigabe[]>([])
  const [showModal, setShowModal]   = useState(false)
  const [positionen, setPositionen] = useState<Position[]>([{ beschreibung: '', betrag: '' }])
  const [sending, setSending]       = useState(false)
  const [sendError, setSendError]   = useState<string | null>(null)
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)
  const [terminDatum, setTerminDatum]         = useState('')
  const [terminDauer, setTerminDauer]         = useState<number>(60)
  const [terminEditing, setTerminEditing]     = useState(false)
  const [terminSaving, setTerminSaving]       = useState(false)
  const [terminSmsing, setTerminSmsing]       = useState(false)
  const [terminError, setTerminError]         = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.replace('/login'); return }
      Promise.all([fetchOrderById(id), fetchKommentare(id), fetchFreigabenByAuftrag(id)]).then(
        ([{ order, error }, kommentare, freigaben]) => {
          if (error || !order) { router.replace('/'); return }
          setOrder(order)
          setKommentare(kommentare)
          setFreigaben(freigaben)
          if (order.termin_datum) {
            const d = new Date(order.termin_datum)
            const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
            setTerminDatum(local.toISOString().slice(0, 16))
          }
          if (order.termin_dauer_minuten) setTerminDauer(order.termin_dauer_minuten)
          setLoadingPage(false)
        }
      )
    })
  }, [id, router])

  function openModal() {
    setPositionen([{ beschreibung: '', betrag: '' }])
    setSendError(null)
    setShowModal(true)
  }

  async function handleFotoUpload(index: number, file: File) {
    const next = [...positionen]
    next[index] = { ...next[index], uploading: true }
    setPositionen(next)
    setSendError(null)
    try {
      const compressed = await imageCompression(file, { maxSizeMB: 1, maxWidthOrHeight: 1920, useWebWorker: true })
      const form = new FormData()
      form.append('file', compressed, file.name)
      form.append('auftragId', order!.id)
      const res  = await fetch('/api/upload-foto', { method: 'POST', body: form })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Upload fehlgeschlagen')
      const updated = [...positionen]
      updated[index] = { ...updated[index], foto_url: data.url, uploading: false }
      setPositionen(updated)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unbekannter Fehler'
      const updated = [...positionen]
      updated[index] = { ...updated[index], uploading: false }
      setPositionen(updated)
      setSendError(`Foto-Upload fehlgeschlagen: ${msg}`)
    }
  }

  async function handleSendFreigabe() {
    if (!order || sending) return
    const valid = positionen.filter((p) => p.beschreibung.trim())
    if (!valid.length) { setSendError('Mindestens eine Beschreibung erforderlich.'); return }
    setSending(true)
    setSendError(null)
    const res = await fetch('/api/freigabe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId: order.id,
        positionen: valid.map((p) => ({
          beschreibung: p.beschreibung.trim(),
          betrag: p.betrag.trim() || null,
          foto_url: p.foto_url ?? null,
        })),
      }),
    })
    const data = await res.json()
    if (!res.ok) {
      setSendError(data.error ?? 'Fehler beim Senden.')
    } else {
      const fresh = await fetchFreigabenByAuftrag(order.id)
      setFreigaben(fresh)
      setShowModal(false)
    }
    setSending(false)
  }

  async function handleStatusChange(newStatus: OrderStatus) {
    if (!order) return
    await updateOrderStatus(order.id, newStatus)
    setOrder({ ...order, status: newStatus })
    if (newStatus === 'in_bearbeitung' || newStatus === 'abgeschlossen') {
      fetch('/api/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: order.id, trigger: newStatus }),
      }).catch(() => {})
    }
  }

  function startEdit() {
    if (!order) return
    setEditForm({
      kunden_telefonnummer: order.kunden_telefonnummer,
      fahrzeug:             order.fahrzeug,
      problem_beschreibung: order.problem_beschreibung,
    })
    setEditing(true)
  }

  async function handleSaveEdit() {
    if (!order || savingEdit) return
    setSavingEdit(true)
    const err = await updateOrderFields(order.id, editForm)
    if (err) {
      setError(err)
    } else {
      setOrder({ ...order, ...editForm })
      setEditing(false)
    }
    setSavingEdit(false)
  }

  async function handleSaveTermin(sendSms: boolean) {
    if (!order || terminSaving || terminSmsing) return
    setTerminError(null)
    if (sendSms) setTerminSmsing(true); else setTerminSaving(true)
    const isoTermin = terminDatum ? new Date(terminDatum).toISOString() : null
    const err = await saveTermin(order.id, isoTermin, terminDauer || null)
    if (err) { setTerminError(err); setTerminSaving(false); setTerminSmsing(false); return }
    setOrder({ ...order, termin_datum: isoTermin, termin_dauer_minuten: terminDauer || null })
    setTerminEditing(false)
    if (sendSms && isoTermin) {
      const res = await fetch('/api/termin-bestaetigung', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: order.id }),
      })
      if (!res.ok) {
        const data = await res.json()
        setTerminError(data.error ?? 'SMS-Versand fehlgeschlagen')
      }
    }
    setTerminSaving(false)
    setTerminSmsing(false)
  }

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

  const { color } = STATUS_CONFIG[order.status] ?? STATUS_CONFIG['in_bearbeitung']
  const isEskalation = order.status === 'eskalation_rueckruf'

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
        <div className="ml-auto">
          {editing ? (
            <div className="flex gap-2">
              <button onClick={() => setEditing(false)} className="text-xs px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:bg-zinc-700 transition-colors">
                Abbrechen
              </button>
              <button onClick={handleSaveEdit} disabled={savingEdit} className="text-xs px-3 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-400 disabled:opacity-40 text-white font-medium transition-colors">
                {savingEdit ? <Loader size={12} className="animate-spin" /> : 'Speichern'}
              </button>
            </div>
          ) : (
            <button onClick={startEdit} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700 transition-colors">
              <Pencil size={13} />
              Bearbeiten
            </button>
          )}
        </div>
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
            <select
              value={order.status}
              onChange={(e) => handleStatusChange(e.target.value as OrderStatus)}
              className={`text-xs px-2 py-0.5 rounded-full border font-medium cursor-pointer ${color}`}
            >
              {(Object.keys(STATUS_CONFIG) as OrderStatus[]).map((s) => (
                <option key={s} value={s} className="bg-zinc-900 text-zinc-100">
                  {STATUS_CONFIG[s].label}
                </option>
              ))}
            </select>
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
          {editing ? (
            <input
              type="tel"
              value={editForm.kunden_telefonnummer}
              onChange={(e) => setEditForm({ ...editForm, kunden_telefonnummer: e.target.value })}
              className="w-full bg-zinc-800 border border-zinc-700 focus:border-orange-500 rounded-xl px-4 py-2.5 text-sm text-zinc-100 outline-none"
            />
          ) : (
            <a
              href={`tel:${order.kunden_telefonnummer}`}
              className="flex items-center gap-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl px-4 py-3 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-orange-500/20 flex items-center justify-center shrink-0">
                <Phone size={15} className="text-orange-400" />
              </div>
              <span className="text-sm font-medium">{order.kunden_telefonnummer || '—'}</span>
            </a>
          )}
        </Section>

        {/* Fahrzeug */}
        {editing && (
          <Section title="Fahrzeug">
            <input
              type="text"
              value={editForm.fahrzeug}
              onChange={(e) => setEditForm({ ...editForm, fahrzeug: e.target.value })}
              className="w-full bg-zinc-800 border border-zinc-700 focus:border-orange-500 rounded-xl px-4 py-2.5 text-sm text-zinc-100 outline-none"
            />
          </Section>
        )}

        {/* Problembeschreibung */}
        <Section title="Problembeschreibung">
          {editing ? (
            <textarea
              rows={3}
              value={editForm.problem_beschreibung}
              onChange={(e) => setEditForm({ ...editForm, problem_beschreibung: e.target.value })}
              className="w-full bg-zinc-800 border border-zinc-700 focus:border-orange-500 rounded-xl px-4 py-2.5 text-sm text-zinc-100 outline-none resize-none"
            />
          ) : (
            <p className="text-sm text-zinc-300 leading-relaxed whitespace-pre-wrap">
              {order.problem_beschreibung || '—'}
            </p>
          )}
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

        {/* Termin */}
        <Section title="Termin" icon={<CalendarDays size={14} />}>
          {terminEditing ? (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs text-zinc-500">Datum & Uhrzeit</label>
                <input
                  type="datetime-local"
                  value={terminDatum}
                  onChange={(e) => setTerminDatum(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 focus:border-orange-500 rounded-xl px-4 py-2.5 text-sm text-zinc-100 outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-zinc-500">Dauer</label>
                <select
                  value={terminDauer}
                  onChange={(e) => setTerminDauer(Number(e.target.value))}
                  className="w-full bg-zinc-800 border border-zinc-700 focus:border-orange-500 rounded-xl px-4 py-2.5 text-sm text-zinc-100 outline-none"
                >
                  <option value={30}>30 Minuten</option>
                  <option value={60}>1 Stunde</option>
                  <option value={120}>2 Stunden</option>
                  <option value={180}>3 Stunden</option>
                  <option value={240}>4 Stunden</option>
                  <option value={1440}>1 Tag</option>
                  <option value={2880}>2 Tage</option>
                  <option value={4320}>3 Tage</option>
                  <option value={5760}>4 Tage</option>
                  <option value={7200}>5 Tage</option>
                </select>
              </div>
              {terminError && <p className="text-red-400 text-xs">{terminError}</p>}
              <div className="flex gap-2">
                <button
                  onClick={() => setTerminEditing(false)}
                  className="flex-1 text-sm py-2.5 rounded-xl bg-zinc-800 text-zinc-400 hover:bg-zinc-700 transition-colors"
                >
                  Abbrechen
                </button>
                <button
                  onClick={() => handleSaveTermin(false)}
                  disabled={terminSaving || terminSmsing || !terminDatum}
                  className="flex-1 text-sm py-2.5 rounded-xl bg-zinc-700 hover:bg-zinc-600 disabled:opacity-40 text-white font-medium transition-colors"
                >
                  {terminSaving ? <Loader size={14} className="animate-spin mx-auto" /> : 'Speichern'}
                </button>
                <button
                  onClick={() => handleSaveTermin(true)}
                  disabled={terminSaving || terminSmsing || !terminDatum}
                  className="flex-1 flex items-center justify-center gap-1.5 text-sm py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 disabled:opacity-40 text-white font-medium transition-colors"
                >
                  {terminSmsing ? <Loader size={14} className="animate-spin" /> : <Send size={14} />}
                  + SMS
                </button>
              </div>
            </div>
          ) : order.termin_datum ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-zinc-100">
                    {new Date(order.termin_datum).toLocaleString('de-DE', {
                      weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric',
                      hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin',
                    })} Uhr
                  </p>
                  {order.termin_dauer_minuten && (
                    <p className="text-xs text-zinc-500 mt-0.5">
                      Dauer: {order.termin_dauer_minuten < 60
                        ? `${order.termin_dauer_minuten} Min`
                        : order.termin_dauer_minuten >= 1440 && order.termin_dauer_minuten % 1440 === 0
                          ? `${order.termin_dauer_minuten / 1440} Tag${order.termin_dauer_minuten > 1440 ? 'e' : ''}`
                          : `${order.termin_dauer_minuten / 60} Std`}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => setTerminEditing(true)}
                  className="text-xs px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:bg-zinc-700 transition-colors"
                >
                  Ändern
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <p className="text-xs text-zinc-600">Noch kein Termin vereinbart.</p>
              <button
                onClick={() => setTerminEditing(true)}
                className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:bg-zinc-700 transition-colors"
              >
                <Plus size={12} />
                Termin setzen
              </button>
            </div>
          )}
        </Section>

        {/* Zusatzarbeiten */}
        <Section title="Zusatzarbeiten">
          {freigaben.length === 0 ? (
            <p className="text-xs text-zinc-600 py-1">Noch keine Zusatzarbeiten angefragt.</p>
          ) : (
            <ul className="space-y-2">
              {freigaben.map((f) => (
                <li key={f.id} className={[
                  'flex items-start gap-3 rounded-xl px-3 py-2.5 border text-sm',
                  f.ergebnis === 'approved'
                    ? 'bg-green-950/30 border-green-800 text-green-300'
                    : f.ergebnis === 'rejected'
                      ? 'bg-zinc-800/60 border-zinc-700 text-zinc-500'
                      : 'bg-yellow-950/30 border-yellow-800 text-yellow-300',
                ].join(' ')}>
                  {f.ergebnis === 'approved' && <CheckCircle2 size={14} className="shrink-0 mt-0.5" />}
                  {f.ergebnis === 'rejected' && <XCircle size={14} className="shrink-0 mt-0.5" />}
                  {!f.ergebnis && <Clock size={14} className="shrink-0 mt-0.5 animate-pulse" />}
                  <div className="flex-1 min-w-0">
                    <p className="leading-snug">{f.beschreibung}</p>
                    {f.betrag != null && (
                      <p className="text-xs mt-0.5 opacity-70">{f.betrag.toFixed(2)} €</p>
                    )}
                    {f.foto_url && (
                      <button
                        onClick={() => setLightboxUrl(f.foto_url)}
                        className="mt-1.5 flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={f.foto_url} alt="" className="w-8 h-8 rounded-md object-cover shrink-0" />
                        <span className="flex items-center gap-1">
                          <Camera size={11} />
                          Foto ansehen
                        </span>
                      </button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
          <button
            onClick={openModal}
            className="mt-1 flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl bg-orange-500 hover:bg-orange-400 text-white font-medium transition-colors"
          >
            <Plus size={13} />
            Zusatzarbeit anfragen
          </button>
        </Section>

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

      {/* Zusatzarbeit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 px-4 pb-4 sm:pb-0">
          <div className="w-full max-w-md bg-zinc-900 border border-zinc-700 rounded-2xl p-5 space-y-4">
            <h2 className="text-sm font-semibold text-zinc-100">Zusatzarbeiten anfragen</h2>

            <ul className="space-y-3">
              {positionen.map((p, i) => (
                <li key={i} className="flex gap-2 items-start">
                  <div className="flex-1 space-y-1.5">
                    <textarea
                      rows={3}
                      placeholder="Beschreibung der Arbeit"
                      value={p.beschreibung}
                      onChange={(e) => {
                        const next = [...positionen]
                        next[i] = { ...next[i], beschreibung: e.target.value }
                        setPositionen(next)
                      }}
                      className="w-full bg-zinc-800 border border-zinc-700 focus:border-orange-500 rounded-xl px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 resize-none"
                    />

                    {/* Foto Upload */}
                    {p.foto_url ? (
                      <div className="relative">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={p.foto_url} alt="Schadensfoto" className="w-full rounded-xl object-cover max-h-40" />
                        <button
                          onClick={() => { const next = [...positionen]; next[i] = { ...next[i], foto_url: null }; setPositionen(next) }}
                          className="absolute top-1.5 right-1.5 p-1 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <label className="flex items-center gap-2 w-full cursor-pointer px-3 py-2.5 rounded-xl bg-zinc-800 border border-zinc-700 border-dashed hover:border-orange-500 transition-colors">
                        {p.uploading
                          ? <Loader size={15} className="animate-spin text-zinc-400" />
                          : <Camera size={15} className="text-zinc-400" />}
                        <span className="text-xs text-zinc-500">{p.uploading ? 'Wird hochgeladen…' : 'Foto hinzufügen (optional)'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          className="hidden"
                          disabled={p.uploading}
                          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFotoUpload(i, f) }}
                        />
                      </label>
                    )}

                    <input
                      type="number"
                      placeholder="Betrag (€) optional"
                      value={p.betrag}
                      onChange={(e) => {
                        const next = [...positionen]
                        next[i] = { ...next[i], betrag: e.target.value }
                        setPositionen(next)
                      }}
                      className="w-full bg-zinc-800 border border-zinc-700 focus:border-orange-500 rounded-xl px-3 py-2 text-sm text-zinc-100 outline-none placeholder:text-zinc-600"
                    />
                  </div>
                  {positionen.length > 1 && (
                    <button
                      onClick={() => setPositionen(positionen.filter((_, j) => j !== i))}
                      className="mt-1.5 p-1.5 text-zinc-500 hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </li>
              ))}
            </ul>

            <button
              onClick={() => setPositionen([...positionen, { beschreibung: '', betrag: '' }])}
              className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-100 transition-colors"
            >
              <Plus size={13} />
              Position hinzufügen
            </button>

            {sendError && <p className="text-red-400 text-xs">{sendError}</p>}

            <div className="flex gap-2 pt-1">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 text-sm py-2.5 rounded-xl bg-zinc-800 text-zinc-400 hover:bg-zinc-700 transition-colors"
              >
                Abbrechen
              </button>
              <button
                onClick={handleSendFreigabe}
                disabled={sending}
                className="flex-1 flex items-center justify-center gap-1.5 text-sm py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 disabled:opacity-40 text-white font-medium transition-colors"
              >
                {sending ? <Loader size={14} className="animate-spin" /> : <Send size={14} />}
                Per SMS senden
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </>
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
