'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, Loader } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { fetchTermine } from '@/lib/db'
import { getGermanHolidays, holidayKey } from '@/lib/feiertage'
import VoxaroLogo from '@/components/VoxaroLogo'
import type { Order } from '@/lib/types'

const WOCHENTAGE = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']
const MONATE = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
]

function getMondayOf(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day))
  d.setHours(0, 0, 0, 0)
  return d
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + n)
  return d
}

function getWeeksOfMonth(year: number, month: number): Date[][] {
  const firstDay  = new Date(year, month, 1)
  const lastDay   = new Date(year, month + 1, 0)
  let   current   = getMondayOf(firstDay)
  const weeks: Date[][] = []
  while (current <= lastDay) {
    const week: Date[] = []
    for (let i = 0; i < 7; i++) { week.push(new Date(current)); current = addDays(current, 1) }
    weeks.push(week)
  }
  return weeks
}

interface WeekEvent { order: Order; colStart: number; colSpan: number }

function effectiveEnd(order: Order): Date {
  const start     = new Date(order.termin_datum!)
  const dauer     = order.termin_dauer_minuten ?? 60
  // Mehrtägige Termine: Kalendertag-Grenze (Mitternacht nach letztem Tag)
  if (dauer >= 1440) {
    const startDay = new Date(start); startDay.setHours(0, 0, 0, 0)
    return addDays(startDay, Math.round(dauer / 1440))
  }
  return new Date(start.getTime() + dauer * 60000)
}

function getEventsForWeek(termine: Order[], weekStart: Date): WeekEvent[] {
  const weekEnd = addDays(weekStart, 7)
  const result: WeekEvent[] = []
  for (const order of termine) {
    if (!order.termin_datum) continue
    const start = new Date(order.termin_datum)
    const end   = effectiveEnd(order)
    if (end <= weekStart || start >= weekEnd) continue
    const clampedStart = start < weekStart ? weekStart : start
    const clampedEnd   = end   > weekEnd   ? weekEnd   : end
    const dayStart = Math.floor((clampedStart.getTime() - weekStart.getTime()) / 86400000)
    const dayEnd   = Math.floor((clampedEnd.getTime()   - weekStart.getTime()) / 86400000)
    result.push({ order, colStart: dayStart + 1, colSpan: Math.max(1, dayEnd - dayStart) })
  }
  return result
}

export default function KalenderPage() {
  const router = useRouter()
  const [werkstattId, setWerkstattId] = useState('')
  const [loading, setLoading]         = useState(true)
  const [year,  setYear]              = useState(new Date().getFullYear())
  const [month, setMonth]             = useState(new Date().getMonth())
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
    const von = getMondayOf(new Date(year, month, 1))
    const bis = addDays(von, 42)
    bis.setHours(23, 59, 59, 999)
    fetchTermine(werkstattId, von, bis).then((data) => {
      setTermine(data)
      setLoading(false)
    })
  }, [werkstattId, year, month])

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11) } else setMonth(m => m - 1)
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0) } else setMonth(m => m + 1)
  }

  const weeks = getWeeksOfMonth(year, month)
  const today = new Date()
  const holidays = new Map([
    ...getGermanHolidays(year - 1),
    ...getGermanHolidays(year),
    ...getGermanHolidays(year + 1),
  ])

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
        <span className="text-base font-semibold ml-1">
          {MONATE[month]} {year}
        </span>
        <div className="ml-auto flex items-center gap-1">
          <button onClick={prevMonth} className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors">
            <ChevronLeft size={16} />
          </button>
          <button onClick={nextMonth} className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors">
            <ChevronRight size={16} />
          </button>
          <button
            onClick={() => { setYear(today.getFullYear()); setMonth(today.getMonth()) }}
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
        <div className="max-w-6xl mx-auto">
          {/* Wochentag-Header */}
          <div className="grid grid-cols-7 border-b border-zinc-800">
            {WOCHENTAGE.map((tag, i) => (
              <div
                key={tag}
                className={[
                  'py-2 text-center text-[11px] font-semibold uppercase tracking-wider border-r border-zinc-800 last:border-r-0',
                  i >= 5 ? 'text-zinc-600 bg-zinc-900/60' : 'text-zinc-500',
                ].join(' ')}
              >
                {tag}
              </div>
            ))}
          </div>

          {/* Wochen-Reihen */}
          {weeks.map((week, wi) => {
            const events = getEventsForWeek(termine, week[0])
            return (
              <div
                key={wi}
                className="grid grid-cols-7 border-b border-zinc-800"
                style={{ minHeight: `${90 + events.length * 52}px` }}
              >
                {/* Tageszahlen — füllen automatisch Zeile 1 */}
                {week.map((day, di) => {
                  const isToday        = day.toDateString() === today.toDateString()
                  const isCurrentMonth = day.getMonth() === month
                  const isWeekend      = di >= 5
                  const holidayName    = holidays.get(holidayKey(day))
                  return (
                    <div
                      key={di}
                      className={[
                        'p-1.5 border-r border-zinc-800 last:border-r-0',
                        isWeekend ? 'bg-zinc-900/60' : '',
                      ].join(' ')}
                    >
                      <span className={[
                        'text-sm font-medium inline-flex w-7 h-7 items-center justify-center rounded-full',
                        isToday
                          ? 'bg-orange-500 text-white'
                          : isCurrentMonth
                            ? isWeekend ? 'text-zinc-500' : 'text-zinc-300'
                            : 'text-zinc-700',
                      ].join(' ')}>
                        {day.getDate()}
                      </span>
                      {holidayName && (
                        <p className="text-[9px] text-blue-400 leading-tight mt-0.5 truncate">{holidayName}</p>
                      )}
                    </div>
                  )
                })}

                {/* Termin-Balken — ab Zeile 2, spannen über Spalten */}
                {events.map(({ order, colStart, colSpan }) => {
                  const uhrzeit = new Date(order.termin_datum!).toLocaleTimeString('de-DE', {
                    hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin',
                  })
                  const dauerMin = order.termin_dauer_minuten
                  const dauerLabel = dauerMin
                    ? dauerMin < 60
                      ? `${dauerMin} Min`
                      : dauerMin >= 1440 && dauerMin % 1440 === 0
                        ? `${dauerMin / 1440} Tag${dauerMin > 1440 ? 'e' : ''}`
                        : `${dauerMin / 60} Std`
                    : null
                  return (
                    <button
                      key={order.id}
                      onClick={() => router.push(`/auftraege/${order.id}`)}
                      style={{ gridColumn: `${colStart} / span ${colSpan}` }}
                      className="mx-0.5 mb-1 px-2 py-1 rounded-md text-white bg-orange-500 hover:bg-orange-400 text-left transition-colors flex flex-col gap-0 min-h-[44px] justify-center"
                    >
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold truncate">
                        <span className="opacity-80 shrink-0">{uhrzeit}</span>
                        {dauerLabel && <span className="opacity-60 shrink-0">· {dauerLabel}</span>}
                      </div>
                      <div className="text-xs font-medium truncate leading-tight">
                        {order.kunden_name || '—'}
                      </div>
                      {order.fahrzeug && (
                        <div className="text-[10px] opacity-70 truncate leading-tight">
                          {order.fahrzeug}
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
