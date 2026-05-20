'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { FileText, Plus, Loader, RefreshCw, CheckCircle, XCircle, Clock, Send } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { fetchAngebote } from '@/lib/db'
import DashboardNav from '@/components/DashboardNav'
import type { Angebot } from '@/lib/types'

const STATUS_CFG = {
  entwurf:   { label: 'Entwurf',    color: 'bg-zinc-700/40 border-zinc-600 text-zinc-400',  icon: FileText },
  gesendet:  { label: 'Gesendet',   color: 'bg-blue-500/10 border-blue-500/30 text-blue-400', icon: Send },
  genehmigt: { label: 'Genehmigt', color: 'bg-green-500/10 border-green-500/30 text-green-400', icon: CheckCircle },
  abgelehnt: { label: 'Abgelehnt', color: 'bg-red-500/10 border-red-500/30 text-red-400',   icon: XCircle },
}

export default function AngebotePage() {
  const router = useRouter()
  const [angebote, setAngebote]       = useState<Angebot[]>([])
  const [loading, setLoading]         = useState(true)
  const [werkstattId, setWerkstattId] = useState('')
  const [filter, setFilter]           = useState<'alle' | Angebot['status']>('alle')

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
    const data = await fetchAngebote(wid)
    setAngebote(data)
    setLoading(false)
  }

  const filtered = filter === 'alle' ? angebote : angebote.filter((a) => a.status === filter)

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans">
      <DashboardNav />

      <header className="border-b border-zinc-800 bg-zinc-900/80 backdrop-blur sticky top-14 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText size={14} className="text-zinc-400" />
            <span className="text-sm font-semibold text-zinc-100">Angebote</span>
            {!loading && <span className="text-xs text-zinc-600">({filtered.length})</span>}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => load(werkstattId)} className="p-2 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors">
              <RefreshCw size={15} />
            </button>
            <button
              onClick={() => router.push('/angebote/neu')}
              className="flex items-center gap-1.5 bg-orange-500 hover:bg-orange-400 text-white text-xs font-medium px-3 py-2 rounded-lg transition-colors"
            >
              <Plus size={13} />
              Neues Angebot
            </button>
          </div>
        </div>

        {/* Filter tabs */}
        {!loading && angebote.length > 0 && (
          <div className="max-w-5xl mx-auto px-4 pb-3 flex gap-1.5 overflow-x-auto scrollbar-none">
            {(['alle', 'entwurf', 'gesendet', 'genehmigt', 'abgelehnt'] as const).map((s) => {
              const count = s === 'alle' ? angebote.length : angebote.filter((a) => a.status === s).length
              const cfg   = s !== 'alle' ? STATUS_CFG[s] : null
              return (
                <button
                  key={s}
                  onClick={() => setFilter(s)}
                  className={[
                    'flex items-center gap-1.5 whitespace-nowrap text-xs font-medium px-3 py-1.5 rounded-full border transition-colors shrink-0',
                    filter === s
                      ? 'bg-orange-500 border-orange-400 text-white'
                      : 'bg-zinc-800/60 border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200',
                  ].join(' ')}
                >
                  {cfg && <cfg.icon size={10} />}
                  {s === 'alle' ? 'Alle' : cfg!.label}
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
            Lade Angebote…
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 space-y-3">
            <FileText size={32} className="text-zinc-800 mx-auto" />
            <p className="text-zinc-600 text-sm">Keine Angebote vorhanden.</p>
            <button
              onClick={() => router.push('/angebote/neu')}
              className="inline-flex items-center gap-1.5 text-xs bg-orange-500 hover:bg-orange-400 text-white px-4 py-2 rounded-lg transition-colors"
            >
              <Plus size={12} />
              Erstes Angebot erstellen
            </button>
          </div>
        ) : (
          <ul className="space-y-3">
            {filtered.map((angebot) => {
              const cfg = STATUS_CFG[angebot.status]
              return (
                <li key={angebot.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 hover:border-zinc-700 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-zinc-100">{angebot.kunden_name || '—'}</span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border flex items-center gap-1 ${cfg.color}`}>
                          <cfg.icon size={9} />
                          {cfg.label}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 mt-0.5">{angebot.fahrzeug}</p>
                      {angebot.notiz && (
                        <p className="text-xs text-zinc-600 mt-0.5 line-clamp-1">{angebot.notiz}</p>
                      )}
                      <p className="text-xs text-zinc-700 mt-1">
                        {new Date(angebot.created_at).toLocaleDateString('de-DE', {
                          day: '2-digit', month: '2-digit', year: 'numeric',
                        })}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-orange-400">{angebot.gesamt.toFixed(2)} €</p>
                      <p className="text-xs text-zinc-600">{angebot.positionen.length} Position{angebot.positionen.length !== 1 ? 'en' : ''}</p>
                    </div>
                  </div>

                  {/* Genehmigt → Zu Auftrag machen */}
                  {angebot.status === 'genehmigt' && (
                    <div className="mt-3 pt-3 border-t border-zinc-800">
                      <button
                        onClick={() => {
                          const p = new URLSearchParams({
                            name:     angebot.kunden_name,
                            telefon:  angebot.kunden_telefon,
                            fahrzeug: angebot.fahrzeug,
                            problem:  angebot.notiz ?? '',
                          })
                          router.push(`/?neuer_auftrag=1&${p.toString()}`)
                        }}
                        className="w-full text-xs font-medium bg-green-600 hover:bg-green-500 text-white py-2 rounded-lg transition-colors"
                      >
                        Zu Auftrag machen →
                      </button>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </main>
    </div>
  )
}
