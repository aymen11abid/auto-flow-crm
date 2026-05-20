'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Receipt, Loader, RefreshCw, CheckCircle, Send, FileText, Search, X } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { fetchRechnungen, updateRechnungStatus } from '@/lib/db'
import DashboardNav from '@/components/DashboardNav'
import type { Rechnung } from '@/lib/types'

const STATUS_CFG = {
  entwurf:  { label: 'Entwurf',  color: 'bg-zinc-700/40 border-zinc-600 text-zinc-400',      icon: FileText },
  gesendet: { label: 'Gesendet', color: 'bg-blue-500/10 border-blue-500/30 text-blue-400',   icon: Send },
  bezahlt:  { label: 'Bezahlt',  color: 'bg-green-500/10 border-green-500/30 text-green-400', icon: CheckCircle },
}

export default function RechnungenPage() {
  const router = useRouter()
  const [rechnungen, setRechnungen]   = useState<Rechnung[]>([])
  const [loading, setLoading]         = useState(true)
  const [werkstattId, setWerkstattId] = useState('')
  const [filter, setFilter]           = useState<'alle' | Rechnung['status']>('alle')
  const [suche, setSuche]             = useState('')

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
    const data = await fetchRechnungen(wid)
    setRechnungen(data)
    setLoading(false)
  }

  async function handleStatusChange(id: string, status: Rechnung['status']) {
    await updateRechnungStatus(id, status)
    setRechnungen((prev) => prev.map((r) => r.id === id ? { ...r, status } : r))
  }

  const q = suche.toLowerCase().trim()
  const filtered = rechnungen
    .filter((r) => filter === 'alle' || r.status === filter)
    .filter((r) => !q || [r.kunden_name, r.fahrzeug, r.kunden_telefon, r.rechnungsnummer ?? '']
      .some((f) => f.toLowerCase().includes(q)))

  const totalOffen = rechnungen
    .filter((r) => r.status !== 'bezahlt')
    .reduce((s, r) => s + r.gesamt, 0)

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans">
      <DashboardNav />

      <header className="border-b border-zinc-800 bg-zinc-900/80 backdrop-blur sticky top-14 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt size={14} className="text-zinc-400" />
            <span className="text-sm font-semibold text-zinc-100">Rechnungen</span>
            {!loading && <span className="text-xs text-zinc-600">({filtered.length})</span>}
          </div>
          <div className="flex items-center gap-2">
            {!loading && totalOffen > 0 && (
              <span className="text-xs text-orange-400 font-medium">{totalOffen.toFixed(2)} € offen</span>
            )}
            <button onClick={() => load(werkstattId)} className="p-2 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors">
              <RefreshCw size={15} />
            </button>
          </div>
        </div>

        {/* Suche */}
        {!loading && rechnungen.length > 0 && (
          <div className="max-w-5xl mx-auto px-4 pb-2">
            <div className="relative">
              <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
              <input
                value={suche}
                onChange={(e) => setSuche(e.target.value)}
                placeholder="Name, Fahrzeug, Telefon, Rechnungsnr. …"
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

        {/* Filter tabs */}
        {!loading && rechnungen.length > 0 && (
          <div className="max-w-5xl mx-auto px-4 pb-3 flex gap-1.5 overflow-x-auto scrollbar-none">
            {(['alle', 'entwurf', 'gesendet', 'bezahlt'] as const).map((s) => {
              const count = s === 'alle' ? rechnungen.length : rechnungen.filter((r) => r.status === s).length
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
            Lade Rechnungen…
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 space-y-3">
            <Receipt size={32} className="text-zinc-800 mx-auto" />
            <p className="text-zinc-600 text-sm">
              {suche ? `Keine Rechnungen für "${suche}" gefunden.` : 'Keine Rechnungen vorhanden.'}
            </p>
            {!suche && <p className="text-zinc-700 text-xs">Rechnungen werden aus Aufträgen erstellt.</p>}
          </div>
        ) : (
          <ul className="space-y-3">
            {filtered.map((rechnung) => {
              const cfg = STATUS_CFG[rechnung.status]
              return (
                <li
                  key={rechnung.id}
                  className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 hover:border-zinc-700 transition-colors cursor-pointer"
                  onClick={() => router.push(`/rechnung/${rechnung.id}`)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-zinc-100">{rechnung.kunden_name || '—'}</span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border flex items-center gap-1 ${cfg.color}`}>
                          <cfg.icon size={9} />
                          {cfg.label}
                        </span>
                        {rechnung.rechnungsnummer && (
                          <span className="text-[10px] text-zinc-600 font-mono">{rechnung.rechnungsnummer}</span>
                        )}
                      </div>
                      <p className="text-xs text-zinc-400 mt-0.5">{rechnung.fahrzeug}</p>
                      <p className="text-xs text-zinc-700 mt-1">
                        {new Date(rechnung.created_at).toLocaleDateString('de-DE', {
                          day: '2-digit', month: '2-digit', year: 'numeric',
                        })}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-orange-400">{rechnung.gesamt.toFixed(2)} €</p>
                      <p className="text-xs text-zinc-600">{rechnung.positionen.length} Position{rechnung.positionen.length !== 1 ? 'en' : ''}</p>
                    </div>
                  </div>

                  {rechnung.status !== 'bezahlt' && (
                    <div className="mt-3 pt-3 border-t border-zinc-800 flex gap-2" onClick={(e) => e.stopPropagation()}>
                      {rechnung.status === 'entwurf' && (
                        <button
                          onClick={() => handleStatusChange(rechnung.id, 'gesendet')}
                          className="flex-1 text-xs font-medium bg-blue-600 hover:bg-blue-500 text-white py-2 rounded-lg transition-colors"
                        >
                          Als gesendet markieren
                        </button>
                      )}
                      <button
                        onClick={() => handleStatusChange(rechnung.id, 'bezahlt')}
                        className="flex-1 text-xs font-medium bg-green-600 hover:bg-green-500 text-white py-2 rounded-lg transition-colors"
                      >
                        Als bezahlt markieren ✓
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
