'use client'

import React, { useState } from 'react'
import { Loader } from 'lucide-react'
import { createOrder } from '@/lib/db'
import { EMPTY_ORDER_FORM, STATUS_CONFIG } from '@/lib/constants'
import type { OrderStatus } from '@/lib/types'

interface Props {
  werkstattId: string
  onSuccess: () => void
  onCancel: () => void
}

export default function OrderForm({ werkstattId, onSuccess, onCancel }: Props) {
  const [form, setForm]         = useState(EMPTY_ORDER_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError]       = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    const err = await createOrder(form, werkstattId)
    if (err) {
      setError(err)
    } else {
      setForm(EMPTY_ORDER_FORM)
      onSuccess()
    }
    setSubmitting(false)
  }

  return (
    <section className="bg-zinc-900 border border-zinc-700 rounded-xl p-5">
      <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4">
        Test-Auftrag anlegen
      </h2>

      {error && (
        <p className="text-red-400 text-sm mb-3">{error}</p>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-zinc-400">Kundenname *</label>
          <input required value={form.kunden_name}
            onChange={(e) => setForm({ ...form, kunden_name: e.target.value })}
            placeholder="Max Mustermann"
            className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-orange-500"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-zinc-400">Telefonnummer *</label>
          <input required value={form.kunden_telefonnummer}
            onChange={(e) => setForm({ ...form, kunden_telefonnummer: e.target.value })}
            placeholder="+49 151 12345678"
            className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-orange-500"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-zinc-400">Fahrzeug *</label>
          <input required value={form.fahrzeug}
            onChange={(e) => setForm({ ...form, fahrzeug: e.target.value })}
            placeholder="VW Golf 7, 2019"
            className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-orange-500"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-zinc-400">Status</label>
          <select value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value as OrderStatus })}
            className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-orange-500"
          >
            {(Object.keys(STATUS_CONFIG) as OrderStatus[]).map((s) => (
              <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1 sm:col-span-2">
          <label className="text-xs text-zinc-400">Problembeschreibung *</label>
          <textarea required rows={3} value={form.problem_beschreibung}
            onChange={(e) => setForm({ ...form, problem_beschreibung: e.target.value })}
            placeholder="Fahrzeug springt nicht an, Batterie verdächtig..."
            className="bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-orange-500 resize-none"
          />
        </div>
        <div className="sm:col-span-2 flex justify-end gap-3">
          <button type="button" onClick={onCancel}
            className="text-sm text-zinc-400 hover:text-zinc-200 px-4 py-2 rounded-lg hover:bg-zinc-800 transition-colors"
          >
            Abbrechen
          </button>
          <button type="submit" disabled={submitting}
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-400 disabled:opacity-50 text-white text-sm font-medium px-5 py-2 rounded-lg transition-colors"
          >
            {submitting && <Loader size={14} className="animate-spin" />}
            Auftrag speichern
          </button>
        </div>
      </form>
    </section>
  )
}
