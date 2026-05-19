'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { PhoneCall, Plus, X, Loader, RefreshCw } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { fetchAnrufe, markAnrufErledigt } from '@/lib/db'
import DashboardNav from '@/components/DashboardNav'
import type { Anruf } from '@/lib/types'

export default function LeadsPage() {
  const router = useRouter()
  const [anrufe, setAnrufe]         = useState<Anruf[]>([])
  const [loading, setLoading]       = useState(true)
  const [werkstattId, setWerkstattId] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.replace('/login'); return }
      const wid = session.user.user_metadata?.werkstatt_id as string ?? ''
      setWerkstattId(wid)
      load(wid)
    })
  }, [router])

  async function load(wid = werkstattId) {
    setLoading(true)
    const data = await fetchAnrufe(wid)
    setAnrufe(data)
    setLoading(false)
  }

  async function handleIgnorieren(id: string) {
    await markAnrufErledigt(id, 'auftrag_erstellt')
    setAnrufe((prev) => prev.filter((a) => a.id !== id))
  }

  function handleAngebotErstellen(anruf: Anruf) {
    const p = new URLSearchParams({
      anruf_id: anruf.id,
      name:     anruf.kunden_name,
      telefon:  anruf.kunden_telefon,
      fahrzeug: anruf.fahrzeug,
      problem:  anruf.problem,
    })
    router.push(`/angebote/neu?${p.toString()}`)
  }

  function handleAuftragErstellen(anruf: Anruf) {
    const p = new URLSearchParams({
      name:     anruf.kunden_name,
      telefon:  anruf.kunden_telefon,
      fahrzeug: anruf.fahrzeug,
      problem:  anruf.problem,
    })
    router.push(`/?neuer_auftrag=1&${p.toString()}`)
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans">
      <DashboardNav />

      <header className="border-b border-zinc-800 bg-zinc-900/80 backdrop-blur sticky top-14 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PhoneCall size={14} className="text-orange-400" />
            <span className="text-sm font-semibold text-zinc-100">Leads & Rückrufe</span>
            {!loading && (
              <span className="text-xs text-zinc-600">({anrufe.length})</span>
            )}
          </div>
          <button onClick={() => load()} className="p-2 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors">
            <RefreshCw size={15} />
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-zinc-600">
            <Loader size={20} className="animate-spin mr-2" />
            Lade Leads…
          </div>
        ) : anrufe.length === 0 ? (
          <div className="text-center py-20 space-y-3">
            <PhoneCall size={32} className="text-zinc-800 mx-auto" />
            <p className="text-zinc-600 text-sm">Keine neuen Leads.</p>
            <p className="text-zinc-700 text-xs">Wenn Samir einen Anruf entgegennimmt, erscheint er hier.</p>
          </div>
        ) : (
          <ul className="space-y-3">
            {anrufe.map((anruf) => (
              <li key={anruf.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-zinc-100">
                        {anruf.kunden_name || 'Unbekannter Anrufer'}
                      </span>
                      <span className={[
                        'text-[10px] font-semibold px-2 py-0.5 rounded-full border',
                        anruf.typ === 'termin'
                          ? 'bg-orange-500/10 border-orange-500/30 text-orange-400'
                          : 'bg-red-500/10 border-red-500/30 text-red-400',
                      ].join(' ')}>
                        {anruf.typ === 'termin' ? 'Terminanfrage' : 'Eskalation / Rückruf'}
                      </span>
                    </div>
                    {anruf.kunden_telefon && (
                      <p className="text-xs text-zinc-500 mt-0.5">{anruf.kunden_telefon}</p>
                    )}
                    {anruf.fahrzeug && (
                      <p className="text-xs text-zinc-400 mt-0.5">{anruf.fahrzeug}</p>
                    )}
                    {anruf.problem && (
                      <p className="text-xs text-zinc-600 mt-1 line-clamp-2">{anruf.problem}</p>
                    )}
                    <p className="text-xs text-zinc-700 mt-1">
                      {new Date(anruf.created_at).toLocaleString('de-DE', {
                        day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
                      })}
                    </p>
                  </div>
                  <button
                    onClick={() => handleIgnorieren(anruf.id)}
                    className="shrink-0 p-1.5 text-zinc-700 hover:text-zinc-400 transition-colors"
                    title="Ignorieren"
                  >
                    <X size={14} />
                  </button>
                </div>

                <div className="flex gap-2 pt-3 border-t border-zinc-800">
                  <button
                    onClick={() => handleAngebotErstellen(anruf)}
                    className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium bg-orange-500 hover:bg-orange-400 text-white py-2 rounded-lg transition-colors"
                  >
                    <Plus size={12} />
                    Angebot erstellen
                  </button>
                  <button
                    onClick={() => handleAuftragErstellen(anruf)}
                    className="flex-1 flex items-center justify-center gap-1.5 text-xs font-medium bg-zinc-800 hover:bg-zinc-700 text-zinc-200 py-2 rounded-lg transition-colors"
                  >
                    <Plus size={12} />
                    Direkt als Auftrag
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}
