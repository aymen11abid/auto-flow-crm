'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, Loader } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { fetchTermine } from '@/lib/db'
import VoxaroLogo from '@/components/VoxaroLogo'
import type { Order } from '@/lib/types'

const TAGE = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']

function getMondayOf(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = (day === 0 ? -6 : 1 - day)
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

function formatDauer(min: number): string {
  if (min < 60) return `${min} Min`
  if (min % 480 === 0) return `${min / 480} Tag${min > 480 ? 'e' : ''}`
  return `${min / 60} Std`
}

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
}

export default function KalenderPage() {
  const router = useRouter()
  const [werkstattId, setWerkstattId] = useState('')
  const [loading, setLoading]         = useState(true)
  const [wochenstart, setWochenstart] = useState<Date>(() => getMondayOf(new Date()))
  const [termine, setTermine]         = useState<Order[]>([])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.replace('/login'); return }
      const wid = session.user.user_metadata?.werkstatt_id as string ?? ''
      setWerkstattId(wid)
    })
  }, [router])

  useEffect(() => {
    if (!werkstattId) return
    setLoading(true)
    const von = wochenstart
    const bis = addDays(wochenstart, 6)
    bis.setHours(23, 59, 59, 999)
    fetchTermine(werkstattId, von, bis).then((data) => {
      setTermine(data)
      setLoading(false)
    })
  }, [werkstattId, wochenstart])

  const wochende = addDays(wochenstart, 6)

  const termineAmTag = (tag: Date): Order[] =>
    termine.filter((o) => o.termin_datum && sameDay(new Date(o.termin_datum), tag))

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans">
      <header className="sticky top-0 z-10 bg-zinc-900/90 backdrop-blur border-b border-zinc-800 px-4 py-3 flex items-center gap-3">
        <button
          onClick={() => router.push('/')}
          className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
        >
          <ChevronLeft size={20} />
        </button>
        <VoxaroLogo size="sm" />
        <span className="text-sm font-medium text-zinc-300 ml-1">Kalender</span>

        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setWochenstart((w) => addDays(w, -7))}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-xs text-zinc-400 min-w-[130px] text-center">
            {wochenstart.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}
            {' – '}
            {wochende.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}
          </span>
          <button
            onClick={() => setWochenstart((w) => addDays(w, 7))}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
          >
            <ChevronRight size={16} />
          </button>
          <button
            onClick={() => setWochenstart(getMondayOf(new Date()))}
            className="text-xs px-3 py-1.5 rounded-lg bg-zinc-800 text-zinc-400 hover:bg-zinc-700 transition-colors ml-1"
          >
            Heute
          </button>
        </div>
      </header>

      {loading ? (
        <div className="flex items-center justify-center py-24 text-zinc-600">
          <Loader size={20} className="animate-spin mr-2" />
          Lade Termine…
        </div>
      ) : (
        <div className="max-w-6xl mx-auto px-2 py-4 overflow-x-auto">
          <div className="grid grid-cols-7 gap-2 min-w-[600px]">
            {TAGE.map((tag, i) => {
              const tagDatum  = addDays(wochenstart, i)
              const isToday   = sameDay(tagDatum, new Date())
              const eintraege = termineAmTag(tagDatum)

              return (
                <div key={tag} className="flex flex-col gap-1.5">
                  {/* Spaltenheader */}
                  <div className={[
                    'text-center py-2 rounded-xl text-xs font-semibold',
                    isToday
                      ? 'bg-orange-500/20 text-orange-300 border border-orange-700'
                      : 'bg-zinc-900 border border-zinc-800 text-zinc-400',
                  ].join(' ')}>
                    <div>{tag}</div>
                    <div className="text-[10px] opacity-70">
                      {tagDatum.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}
                    </div>
                  </div>

                  {/* Termin-Karten */}
                  {eintraege.length === 0 ? (
                    <div className="border border-dashed border-zinc-800 rounded-xl h-20 flex items-center justify-center text-zinc-700 text-[10px]">
                      frei
                    </div>
                  ) : (
                    eintraege.map((o) => (
                      <button
                        key={o.id}
                        onClick={() => router.push(`/auftraege/${o.id}`)}
                        className="w-full text-left bg-zinc-900 border border-zinc-700 hover:border-orange-500 rounded-xl px-2.5 py-2 transition-colors space-y-0.5"
                      >
                        <p className="text-xs font-medium text-zinc-100 truncate">
                          {o.kunden_name || '—'}
                        </p>
                        <p className="text-[10px] text-zinc-400 truncate">{o.fahrzeug || '—'}</p>
                        <p className="text-[10px] text-orange-400">
                          {new Date(o.termin_datum!).toLocaleTimeString('de-DE', {
                            hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin',
                          })} Uhr
                          {o.termin_dauer_minuten ? ` · ${formatDauer(o.termin_dauer_minuten)}` : ''}
                        </p>
                      </button>
                    ))
                  )}
                </div>
              )
            })}
          </div>

          {/* Legende */}
          <div className="mt-6 flex items-center gap-4 text-[10px] text-zinc-600 px-1">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 border border-dashed border-zinc-700 rounded" />
              Freier Tag
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 bg-zinc-900 border border-zinc-700 rounded" />
              Termin vorhanden
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 bg-orange-500/20 border border-orange-700 rounded" />
              Heute
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
