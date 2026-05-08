'use client'

import { useState } from 'react'
import { Trash2, Loader } from 'lucide-react'
import type { Order } from '@/lib/types'

interface Props {
  order: Order
  onConfirm: (reason: string) => Promise<void>
  onCancel: () => void
}

export default function DeleteModal({ order, onConfirm, onCancel }: Props) {
  const [reason, setReason]     = useState('')
  const [deleting, setDeleting] = useState(false)

  async function handleConfirm() {
    setDeleting(true)
    await onConfirm(reason.trim())
    setDeleting(false)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel() }}
    >
      <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-start gap-3 mb-4">
          <div className="bg-red-900/40 rounded-full p-2 shrink-0">
            <Trash2 size={18} className="text-red-400" />
          </div>
          <div>
            <h2 className="font-semibold text-zinc-100 text-base">Auftrag löschen?</h2>
            <p className="text-zinc-400 text-sm mt-0.5">
              <span className="text-zinc-200 font-medium">{order.kunden_name}</span>
              {' — '}{order.fahrzeug}
            </p>
          </div>
        </div>

        <div className="mb-5">
          <label className="block text-xs text-zinc-400 mb-1">Grund (optional)</label>
          <textarea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="z.B. Kunde hat Auftrag storniert..."
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-red-500 resize-none"
          />
        </div>

        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            className="text-sm text-zinc-400 hover:text-zinc-200 px-4 py-2 rounded-lg hover:bg-zinc-800 transition-colors"
          >
            Abbrechen
          </button>
          <button
            onClick={handleConfirm}
            disabled={deleting}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors"
          >
            {deleting ? <Loader size={14} className="animate-spin" /> : <Trash2 size={14} />}
            Ja, löschen
          </button>
        </div>
      </div>
    </div>
  )
}
