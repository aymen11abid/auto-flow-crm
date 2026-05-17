'use client'

import { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight, X, Check, Loader } from 'lucide-react'
import { fetchTermine } from '@/lib/db'
import { getGermanHolidays, holidayKey, addWorkingDays } from '@/lib/feiertage'
import type { Order } from '@/lib/types'

const WOCHENTAGE = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So']

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

function formatDauer(min: number): string {
  if (min < 60) return `${min} Min`
  if (min >= 1440 && min % 1440 === 0) return `${min / 1440} Tag${min > 1440 ? 'e' : ''}`
  return `${min / 60} Std`
}

function sameDay(a: Date, b: Date): boolean {
  return a.toDateString() === b.toDateString()
}

function effectiveEnd(o: Order, holidays: Map<string, string>): Date {
  const start = new Date(o.termin_datum!)
  const dauer = o.termin_dauer_minuten ?? 60
  if (dauer >= 1440) {
    return addWorkingDays(start, Math.round(dauer / 1440), holidays)
  }
  return new Date(start.getTime() + dauer * 60000)
}

function termineAmTag(termine: Order[], tag: Date, holidays: Map<string, string>): Order[] {
  return termine.filter((o) => {
    if (!o.termin_datum) return false
    const start    = new Date(o.termin_datum)
    const end      = effectiveEnd(o, holidays)
    const tagStart = new Date(tag); tagStart.setHours(0, 0, 0, 0)
    const tagEnd   = addDays(tagStart, 1)
    return start < tagEnd && end > tagStart
  })
}

interface Props {
  werkstattId: string
  currentOrderId: string
  initialDatum: string
  initialDauer: number
  onSelect: (datum: string, dauer: number) => void
  onClose: () => void
}

export default function TerminPickerModal({
  werkstattId, currentOrderId, initialDatum, initialDauer, onSelect, onClose,
}: Props) {
  const base = initialDatum ? new Date(initialDatum) : new Date()

  const [wochenstart, setWochenstart] = useState<Date>(() => getMondayOf(base))
  const [termine, setTermine]         = useState<Order[]>([])
  const [loading, setLoading]         = useState(true)
  const [selectedDay, setSelectedDay] = useState<Date | null>(initialDatum ? new Date(initialDatum) : null)
  const [selectedTime, setSelectedTime] = useState<string>(() => {
    if (initialDatum) {
      const d = new Date(initialDatum)
      return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
    }
    return '09:00'
  })
  const [selectedDauer, setSelectedDauer] = useState<number>(initialDauer)

  useEffect(() => {
    setLoading(true)
    const bis = addDays(wochenstart, 7)
    bis.setHours(23, 59, 59, 999)
    fetchTermine(werkstattId, wochenstart, bis).then((data) => {
      setTermine(data.filter((t) => t.id !== currentOrderId))
      setLoading(false)
    })
  }, [werkstattId, wochenstart, currentOrderId])

  function handleConfirm() {
    if (!selectedDay) return
    const [h, m] = selectedTime.split(':').map(Number)
    const result = new Date(selectedDay)
    result.setHours(h, m, 0, 0)
    const local = new Date(result.getTime() - result.getTimezoneOffset() * 60000)
    onSelect(local.toISOString().slice(0, 16), selectedDauer)
  }

  const today = new Date()
  const holidays = new Map([
    ...getGermanHolidays(wochenstart.getFullYear()),
    ...getGermanHolidays(wochenstart.getFullYear() + 1),
  ])
  const selectedDayTermine = selectedDay ? termineAmTag(termine, selectedDay, holidays) : []

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/75 px-2 pb-2 sm:pb-0">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl overflow-hidden">

        {/* Header – Wochennavigation */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
          <button
            onClick={() => setWochenstart((w) => addDays(w, -7))}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="text-sm font-semibold text-zinc-100">
            {wochenstart.toLocaleDateString('de-DE', { day: '2-digit', month: 'long' })}
            {' – '}
            {addDays(wochenstart, 6).toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setWochenstart((w) => addDays(w, 7))}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
            >
              <ChevronRight size={18} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors ml-1"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Wochen-Grid */}
        <div className="grid grid-cols-7 border-b border-zinc-800">
          {WOCHENTAGE.map((tag, i) => {
            const day         = addDays(wochenstart, i)
            const isToday     = sameDay(day, today)
            const isSelected  = !!selectedDay && sameDay(day, selectedDay)
            const dayTermine  = termineAmTag(termine, day, holidays)
            const isBusy      = dayTermine.length > 0
            const isWeekend   = i >= 5
            const holidayName = holidays.get(holidayKey(day))

            return (
              <button
                key={i}
                onClick={() => setSelectedDay(day)}
                className={[
                  'flex flex-col items-center pt-2 pb-3 px-1 border-r border-zinc-800 last:border-r-0 transition-colors',
                  isSelected ? 'bg-orange-500/15' : isWeekend ? 'bg-zinc-900/60 hover:bg-zinc-800/50' : 'hover:bg-zinc-800/50',
                ].join(' ')}
              >
                <span className={[
                  'text-[10px] font-semibold uppercase tracking-wide',
                  isWeekend ? 'text-zinc-600' : 'text-zinc-500',
                ].join(' ')}>{tag}</span>
                <span className={[
                  'mt-1 text-sm font-bold w-8 h-8 flex items-center justify-center rounded-full transition-colors',
                  isSelected
                    ? 'bg-orange-500 text-white'
                    : isToday
                      ? 'ring-1 ring-orange-500 text-orange-400'
                      : isWeekend
                        ? 'text-zinc-600'
                        : 'text-zinc-200',
                ].join(' ')}>
                  {day.getDate()}
                </span>
                {holidayName && (
                  <span className="text-[8px] text-blue-400 leading-tight text-center truncate w-full px-0.5 mt-0.5">{holidayName}</span>
                )}

                {/* Belegungs-Indikator */}
                <div className="mt-1.5 w-full px-0.5 min-h-[20px]">
                  {loading ? (
                    <div className="h-3.5 bg-zinc-800 rounded animate-pulse" />
                  ) : isBusy ? (
                    <div className="space-y-0.5">
                      {dayTermine.slice(0, 2).map((t) => (
                        <div
                          key={t.id}
                          className="text-[9px] bg-orange-500/25 border border-orange-700/60 text-orange-300 rounded px-0.5 py-0.5 text-center truncate leading-none"
                        >
                          {new Date(t.termin_datum!).toLocaleTimeString('de-DE', {
                            hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin',
                          })}
                        </div>
                      ))}
                      {dayTermine.length > 2 && (
                        <div className="text-[9px] text-zinc-600 text-center">+{dayTermine.length - 2}</div>
                      )}
                    </div>
                  ) : (
                    <div className="text-[9px] text-zinc-700 text-center">frei</div>
                  )}
                </div>
              </button>
            )
          })}
        </div>

        {/* Gewählter Tag – Detail + Uhrzeit */}
        <div className="px-4 py-4 space-y-3 min-h-[120px]">
          {!selectedDay ? (
            <p className="text-xs text-zinc-600 text-center pt-4">Tag antippen um Termin zu wählen</p>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-zinc-100">
                  {selectedDay.toLocaleDateString('de-DE', {
                    weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric',
                  })}
                </p>
                {selectedDayTermine.length > 0 && (
                  <span className="text-xs text-orange-400 font-medium">
                    {selectedDayTermine.length} belegt
                  </span>
                )}
              </div>

              {/* Vorhandene Termine am gewählten Tag */}
              {selectedDayTermine.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center gap-2 text-xs bg-orange-950/30 border border-orange-800/40 rounded-xl px-3 py-2"
                >
                  <span className="text-orange-400 font-medium tabular-nums shrink-0">
                    {new Date(t.termin_datum!).toLocaleTimeString('de-DE', {
                      hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin',
                    })}
                    {t.termin_dauer_minuten ? ` · ${formatDauer(t.termin_dauer_minuten)}` : ''}
                  </span>
                  <span className="text-zinc-400 truncate">{t.kunden_name} · {t.fahrzeug}</span>
                </div>
              ))}

              {/* Uhrzeit-Picker */}
              <div className="flex items-center gap-3 pt-1">
                <label className="text-xs text-zinc-500 shrink-0 w-14">Uhrzeit</label>
                <input
                  type="time"
                  value={selectedTime}
                  onChange={(e) => setSelectedTime(e.target.value)}
                  className="flex-1 bg-zinc-800 border border-zinc-700 focus:border-orange-500 rounded-xl px-3 py-2 text-sm text-zinc-100 outline-none"
                />
              </div>

              {/* Dauer-Picker */}
              <div className="flex items-center gap-3">
                <label className="text-xs text-zinc-500 shrink-0 w-14">Dauer</label>
                <select
                  value={selectedDauer}
                  onChange={(e) => setSelectedDauer(Number(e.target.value))}
                  className="flex-1 bg-zinc-800 border border-zinc-700 focus:border-orange-500 rounded-xl px-3 py-2 text-sm text-zinc-100 outline-none"
                >
                  <option value={30}>30 Minuten</option>
                  <option value={60}>1 Stunde</option>
                  <option value={120}>2 Stunden</option>
                  <option value={180}>3 Stunden</option>
                  <option value={240}>4 Stunden</option>
                  <option value={1440}>1 Tag</option>
                  <option value={2880}>2 Tage</option>
                  <option value={4320}>3 Tage</option>
                  <option value={5760}>4 Tage</option>
                  <option value={7200}>5 Tage</option>
                </select>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 pb-4 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 text-sm py-2.5 rounded-xl bg-zinc-800 text-zinc-400 hover:bg-zinc-700 transition-colors"
          >
            Abbrechen
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedDay}
            className="flex-1 flex items-center justify-center gap-1.5 text-sm py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 disabled:opacity-40 text-white font-medium transition-colors"
          >
            {loading ? <Loader size={14} className="animate-spin" /> : <Check size={15} />}
            Übernehmen
          </button>
        </div>
      </div>
    </div>
  )
}
