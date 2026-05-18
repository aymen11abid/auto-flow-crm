'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Printer, Loader } from 'lucide-react'
import { fetchRechnungById } from '@/lib/db'
import type { Rechnung, AngebotPosition } from '@/lib/types'

const TYP_LABEL: Record<AngebotPosition['typ'], string> = {
  teil: 'Ersatzteil',
  arbeit: 'Arbeitszeit',
  sonstiges: 'Sonstiges',
}

export default function RechnungPage() {
  const { id }   = useParams<{ id: string }>()
  const router   = useRouter()
  const [rechnung, setRechnung] = useState<Rechnung | null>(null)
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    fetchRechnungById(id).then(({ rechnung, error }) => {
      if (!error && rechnung) setRechnung(rechnung)
      setLoading(false)
    })
  }, [id])

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Loader size={20} className="animate-spin text-zinc-400" />
      </div>
    )
  }

  if (!rechnung) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <p className="text-zinc-500 text-sm">Rechnung nicht gefunden.</p>
      </div>
    )
  }

  return (
    <>
      {/* Toolbar — wird beim Drucken ausgeblendet */}
      <div className="print:hidden fixed top-0 left-0 right-0 bg-zinc-900 border-b border-zinc-800 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={() => router.back()} className="flex items-center gap-2 text-zinc-400 hover:text-zinc-100 text-sm transition-colors">
            <ArrowLeft size={16} />
            Zurück
          </button>
          <button
            onClick={() => window.print()}
            className="flex items-center gap-2 bg-orange-500 hover:bg-orange-400 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
          >
            <Printer size={14} />
            Drucken / PDF speichern
          </button>
        </div>
      </div>

      {/* Rechnung — druckbares Layout */}
      <div className="min-h-screen bg-white pt-16 print:pt-0">
        <div className="max-w-3xl mx-auto px-8 py-10 print:px-6 print:py-8">

          {/* Kopfzeile */}
          <div className="flex justify-between items-start mb-10">
            <div>
              <h1 className="text-2xl font-bold text-zinc-900">RECHNUNG</h1>
              <p className="text-sm text-zinc-500 mt-0.5">{rechnung.rechnungsnummer}</p>
            </div>
            <div className="text-right text-sm text-zinc-600">
              <p className="font-semibold text-zinc-900">Voxaro Werkstatt</p>
              <p className="text-xs text-zinc-500 mt-0.5">
                {new Date(rechnung.created_at).toLocaleDateString('de-DE', {
                  day: '2-digit', month: '2-digit', year: 'numeric',
                })}
              </p>
            </div>
          </div>

          {/* Empfänger */}
          <div className="mb-10">
            <p className="text-xs text-zinc-400 uppercase tracking-wider mb-1">Rechnungsempfänger</p>
            <p className="text-sm font-semibold text-zinc-900">{rechnung.kunden_name}</p>
            {rechnung.kunden_telefon && (
              <p className="text-sm text-zinc-600">{rechnung.kunden_telefon}</p>
            )}
            <p className="text-sm text-zinc-600 mt-1">Fahrzeug: {rechnung.fahrzeug}</p>
          </div>

          {/* Positionen */}
          <table className="w-full text-sm mb-8">
            <thead>
              <tr className="border-b-2 border-zinc-200">
                <th className="text-left py-2 pr-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Position</th>
                <th className="text-left py-2 pr-4 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Typ</th>
                <th className="text-right py-2 text-xs font-semibold text-zinc-500 uppercase tracking-wider">Betrag</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {rechnung.positionen.map((pos, i) => (
                <tr key={i}>
                  <td className="py-3 pr-4 text-zinc-900">{pos.beschreibung}</td>
                  <td className="py-3 pr-4 text-zinc-500 text-xs">{TYP_LABEL[pos.typ]}</td>
                  <td className="py-3 text-right text-zinc-900 font-medium">{pos.betrag.toFixed(2)} €</td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Summen */}
          <div className="border-t-2 border-zinc-200 pt-4 space-y-2 max-w-xs ml-auto">
            <div className="flex justify-between text-sm text-zinc-600">
              <span>Nettobetrag</span>
              <span>{rechnung.netto.toFixed(2)} €</span>
            </div>
            <div className="flex justify-between text-sm text-zinc-600">
              <span>MwSt. ({rechnung.mwst_prozent}%)</span>
              <span>{rechnung.mwst_betrag.toFixed(2)} €</span>
            </div>
            <div className="flex justify-between text-base font-bold text-zinc-900 border-t border-zinc-200 pt-2">
              <span>Gesamtbetrag</span>
              <span>{rechnung.gesamt.toFixed(2)} €</span>
            </div>
          </div>

          {/* Fußzeile */}
          <div className="mt-16 pt-6 border-t border-zinc-100 text-xs text-zinc-400 text-center">
            <p>Vielen Dank für Ihren Auftrag.</p>
            <p className="mt-1">Erstellt mit Voxaro · voxaro.vercel.app</p>
          </div>
        </div>
      </div>
    </>
  )
}
