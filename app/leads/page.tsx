'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { PhoneCall, Plus, X, Loader, RefreshCw, Search } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { fetchAnrufe, markAnrufErledigt } from '@/lib/db'
import DashboardNav from '@/components/DashboardNav'
import type { Anruf } from '@/lib/types'

export default function LeadsPage() {
  const router = useRouter()
  const [anrufe, setAnrufe]           = useState<Anruf[]>([])
  const [loading, setLoading]         = useState(true)
  const [werkstattId, setWerkstattId] = useState('')
  const [suche, setSuche]             = useState('')
  const [filterTyp, setFilterTyp]     = useState<'alle' | 'termin' | 'eskalation'>('alle')

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
    const p = new URLSearchParams({ anruf_id: anruf.id, name: anruf.kunden_name, telefon: anruf.kunden_telefon, fahrzeug: anruf.fahrzeug, problem: anruf.problem })
    router.push(`/angebote/neu?${p.toString()}`)
  }

  function handleAuftragErstellen(anruf: Anruf) {
    const p = new URLSearchParams({ name: anruf.kunden_name, telefon: anruf.kunden_telefon, fahrzeug: anruf.fahrzeug, problem: anruf.problem })
    router.push(`/?neuer_auftrag=1&${p.toString()}`)
  }

  const q = suche.toLowerCase().trim()
  const filtered = anrufe
    .filter((a) => filterTyp === 'alle' || a.typ === filterTyp)
    .filter((a) => !q || [a.kunden_name, a.kunden_telefon, a.fahrzeug, a.problem]
      .some((f) => f.toLowerCase().includes(q)))

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans">
      <DashboardNav />

      <header className="border-b border-zinc-800 bg-zinc-900/80 backdrop-blur sticky top-14 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PhoneCall size={14} className="text-orange-400" />
            <span className="text-sm font-semibold text-zinc-100">Leads & Rückrufe</span>
            {!loading && <span className="text-xs text-zinc-600">({filtered.length})</span>}
          </div>
          <button onClick={() => load()} className="p-2 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors">
            <RefreshCw size={15} />
          </button>
        </div>

        {/* Suche */}
        {!loading && anrufe.length > 0 && (
          <div className="max-w-5xl mx-auto px-4 pb-2">
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                value={suche}
                onChange={(e) => setSuche(e.target.value)}
                placeholder="Name, Telefon, Fahrzeug, Problem …"
                className="w-full bg-zinc-800/60 border border-zinc-700 rounded-lg pl-8 pr-8 py-2 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-orange-500 transition-colors"
              />
              {suche && (
                <button onClick={() => setSuche('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300">
                  <X size={13} />
                </button>
              )}
            </div>
          </div>
        )}

        {/* Filter Typ */}
        {!loading && anrufe.length > 0 && (
          <div className="max-w-5xl mx-auto px-4 pb-3 flex gap-1.5">
            {(['alle', 'termin', 'eskalation'] as const).map((t) => {
              const count = t === 'alle' ? anrufe.length : anrufe.filter((a) => a.typ === t).length
              return (
                <button
                  key={t}
                  onClick={() => setFilterTyp(t)}
                  className={[
                    'flex items-center gap-1.5 whitespace-nowrap text-xs font-medium px-3 py-1.5 rounded-full border transition-colors shrink-0',
                    filterTyp === t
                      ? 'bg-orange-500 border-orange-400 text-white'
                      : 'bg-zinc-800/60 border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200',
                  ].join(' ')}
                >
                  {t === 'alle' ? 'Alle' : t === 'termin' ? 'Terminanfragen' : 'Rückrufe'}
                  <span className="opacity-60">{count}</span>
                </button>
              )
            })}
          </div>
        )}
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        {loading ? (
          <div className="flex items-center justify-center py-20 text-zinc-600">
            <Loader size={20} className="animate-spin mr-2" />
            Lade Leads…
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 space-y-3">
            <PhoneCall size={32} className="text-zinc-800 mx-auto" />
            <p className="text-zinc-600 text-sm">
              {suche ? `Keine Leads für "${suche}" gefunden.` : 'Keine neuen Leads.'}
            </p>
            {!suche && <p className="text-zinc-700 text-xs">Wenn Samir einen Anruf entgegennimmt, erscheint er hier.</p>}
          </div>
        ) : (
          <ul className="space-y-3">
            {filtered.map((anruf) => (
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
                    {anruf.kunden_telefon && <p className="text-xs text-zinc-500 mt-0.5">{anruf.kunden_telefon}</p>}
                    {anruf.fahrzeug && <p className="text-xs text-zinc-400 mt-0.5">{anruf.fahrzeug}</p>}
                    {anruf.problem && <p className="text-xs text-zinc-600 mt-1 line-clamp-2">{anruf.problem}</p>}
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
