'use client'

import React, { useState, useRef } from 'react'
import { Loader, X, Copy, Check, ExternalLink, ImagePlus, Trash2 } from 'lucide-react'
import type { Order, FreigabeForm } from '@/lib/types'

interface Props {
  order: Order
  onClose: () => void
  onSuccess: (token: string) => void
}

export default function FreigabeModal({ order, onClose, onSuccess }: Props) {
  const [form, setForm]             = useState<FreigabeForm>({ beschreibung: '', foto_url: '', betrag: '' })
  const [file, setFile]             = useState<File | null>(null)
  const [preview, setPreview]       = useState<string | null>(null)
  const [uploading, setUploading]   = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]           = useState<string | null>(null)
  const [token, setToken]           = useState<string | null>(null)
  const [copied, setCopied]         = useState(false)
  const fileInputRef                = useRef<HTMLInputElement>(null)

  const freigabeUrl = token
    ? `${typeof window !== 'undefined' ? window.location.origin : ''}/freigabe/${token}`
    : ''

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null
    setFile(f)
    if (f) {
      setPreview(URL.createObjectURL(f))
    } else {
      setPreview(null)
    }
  }

  function removeFile() {
    setFile(null)
    setPreview(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function uploadFile(): Promise<string | null> {
    if (!file) return null
    setUploading(true)
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch('/api/upload', { method: 'POST', body: fd })
    const data = await res.json()
    setUploading(false)
    if (!res.ok || data.error) {
      setError(data.error ?? 'Foto-Upload fehlgeschlagen')
      return null
    }
    return data.url as string
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!form.beschreibung.trim()) return
    setSubmitting(true)
    setError(null)

    let foto_url: string | undefined
    if (file) {
      const url = await uploadFile()
      if (!url) { setSubmitting(false); return }
      foto_url = url
    }

    const res = await fetch('/api/freigabe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId: order.id,
        beschreibung: form.beschreibung,
        foto_url,
        betrag: form.betrag || undefined,
      }),
    })
    const data = await res.json()
    if (!res.ok || data.error) {
      setError(data.error ?? 'Fehler beim Erstellen')
    } else {
      setToken(data.token)
      onSuccess(data.token)
    }
    setSubmitting(false)
  }

  async function copyLink() {
    await navigator.clipboard.writeText(freigabeUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const busy = uploading || submitting

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4">
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl w-full max-w-md shadow-2xl">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <div>
            <p className="font-semibold text-zinc-100">Freigabe anfragen</p>
            <p className="text-xs text-zinc-500">{order.kunden_name} · {order.fahrzeug}</p>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 transition-colors">
            <X size={18} />
          </button>
        </div>

        {token ? (
          /* Success state */
          <div className="px-5 py-6 space-y-4">
            <div className="bg-green-950/50 border border-green-700 rounded-xl px-4 py-3">
              <p className="text-green-300 text-sm font-medium mb-1">Freigabe-Link erstellt & SMS gesendet</p>
              <p className="text-green-400/70 text-xs">Der Kunde wurde per SMS benachrichtigt.</p>
            </div>

            <div className="bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 flex items-center gap-2">
              <span className="flex-1 text-xs text-zinc-300 truncate font-mono">{freigabeUrl}</span>
              <button
                onClick={copyLink}
                className="shrink-0 flex items-center gap-1 text-xs text-orange-400 hover:text-orange-300 transition-colors"
              >
                {copied ? <Check size={13} /> : <Copy size={13} />}
                {copied ? 'Kopiert' : 'Kopieren'}
              </button>
            </div>

            <a
              href={freigabeUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm py-2.5 rounded-xl transition-colors"
            >
              <ExternalLink size={14} />
              Vorschau öffnen
            </a>

            <button
              onClick={onClose}
              className="w-full text-zinc-500 hover:text-zinc-300 text-sm py-2 transition-colors"
            >
              Schließen
            </button>
          </div>
        ) : (
          /* Form state */
          <form onSubmit={handleSubmit} className="px-5 py-5 space-y-4">
            {error && (
              <p className="text-red-400 text-sm bg-red-950/50 border border-red-800 rounded-lg px-3 py-2">{error}</p>
            )}

            <div className="flex flex-col gap-1">
              <label className="text-xs text-zinc-400">Was wurde gefunden? *</label>
              <textarea
                required
                rows={3}
                value={form.beschreibung}
                onChange={(e) => setForm({ ...form, beschreibung: e.target.value })}
                placeholder="Bremsscheiben vorne verschlissen, Austausch empfohlen..."
                className="bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-orange-500 resize-none"
              />
            </div>

            {/* Foto-Upload */}
            <div className="flex flex-col gap-1">
              <label className="text-xs text-zinc-400">Foto (optional)</label>
              {preview ? (
                <div className="relative rounded-xl overflow-hidden border border-zinc-700">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={preview} alt="Vorschau" className="w-full aspect-video object-cover" />
                  <button
                    type="button"
                    onClick={removeFile}
                    className="absolute top-2 right-2 bg-black/60 hover:bg-black/80 text-white rounded-full p-1 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center justify-center gap-2 border border-dashed border-zinc-600 hover:border-orange-500 rounded-xl py-5 text-zinc-500 hover:text-zinc-300 transition-colors text-sm"
                >
                  <ImagePlus size={16} />
                  Foto aufnehmen oder auswählen
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs text-zinc-400">Preis (Euro, optional)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.betrag}
                onChange={(e) => setForm({ ...form, betrag: e.target.value })}
                placeholder="149.90"
                className="bg-zinc-800 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-orange-500"
              />
            </div>

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 text-sm text-zinc-400 hover:text-zinc-200 py-2.5 rounded-xl hover:bg-zinc-800 transition-colors"
              >
                Abbrechen
              </button>
              <button
                type="submit"
                disabled={busy}
                className="flex-1 flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-white text-sm font-medium py-2.5 rounded-xl transition-colors"
              >
                {busy && <Loader size={13} className="animate-spin" />}
                {uploading ? 'Foto wird hochgeladen…' : 'Link erstellen & SMS senden'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
