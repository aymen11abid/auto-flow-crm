'use client'

import { useRouter } from 'next/navigation'
import { Phone, AlertTriangle, XCircle, Trash2, CheckCircle2, Clock, PhoneIncoming, Sun, Sunset, PhoneCall, CalendarDays } from 'lucide-react'
import { STATUS_CONFIG } from '@/lib/constants'
import type { Order, OrderStatus, FreigabeCount } from '@/lib/types'

interface Props {
  order: Order
  freigabeCount?: FreigabeCount
  onDeleteClick: (order: Order) => void
  onStatusChange: (id: string, status: OrderStatus) => void
}

export default function OrderCard({ order, freigabeCount, onDeleteClick, onStatusChange }: Props) {
  const router        = useRouter()
  const isEskalation       = order.status === 'eskalation_rueckruf'
  const isDeleted          = !!order.geloescht_am
  const isWartenFreigabe   = (freigabeCount?.offen ?? 0) > 0 && !isDeleted
  const offenePositionen   = freigabeCount?.offen ?? 0
  const gesamtPositionen   = freigabeCount?.gesamt ?? 0
  const { label, color, Icon } = STATUS_CONFIG[order.status] ?? STATUS_CONFIG['in_bearbeitung']

  const hasFreigabe        = !!order.freigabe_token
  const freigabeApproved   = order.freigabe_ergebnis === 'approved'
  const freigabeRejected   = order.freigabe_ergebnis === 'rejected'
  const freigabePartial    = order.freigabe_ergebnis === 'partial'
  const freigabePending    = hasFreigabe && !order.freigabe_ergebnis

  return (
    <li
      onClick={() => !isDeleted && router.push(`/auftraege/${order.id}`)}
      className={[
        'rounded-xl border p-4 transition-all',
        isDeleted
          ? 'bg-zinc-900/40 border-zinc-800 opacity-50 grayscale'
          : isEskalation
            ? 'bg-red-950/30 border-red-600 shadow-[0_0_0_2px_rgba(220,38,38,0.4)] animate-pulse-border cursor-pointer'
            : isWartenFreigabe
              ? 'bg-orange-950/20 border-orange-500 shadow-[0_0_0_2px_rgba(249,115,22,0.3)] animate-pulse-border cursor-pointer'
              : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700 cursor-pointer',
      ].join(' ')}
    >
      <div className="flex flex-col sm:flex-row sm:items-start gap-3">

        {/* Info */}
        <div className="flex-1 min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            {isEskalation && !isDeleted && (
              <AlertTriangle size={15} className="text-red-400 shrink-0 animate-pulse" />
            )}
            {isDeleted && (
              <XCircle size={15} className="text-zinc-500 shrink-0" />
            )}
            <span className="font-semibold text-zinc-100 truncate">{order.kunden_name}</span>
            <span className="text-zinc-500 text-sm truncate">
              {order.fahrzeug}
              {order.kennzeichen && <span className="ml-1 text-zinc-600">· {order.kennzeichen}</span>}
            </span>
            {order.ist_wiederholung && !isDeleted && (
              <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium bg-orange-950/50 text-orange-300 border-orange-700">
                <PhoneIncoming size={11} />
                Rückrufer
              </span>
            )}
            {isDeleted ? (
              <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium ${color}`}>
                <Icon size={12} />
                {label}
              </span>
            ) : (
              <select
                value={order.status}
                onChange={(e) => onStatusChange(order.id, e.target.value as OrderStatus)}
                onClick={(e) => e.stopPropagation()}
                className={`text-xs px-2 py-0.5 rounded-full border font-medium cursor-pointer ${color}`}
              >
                {(Object.keys(STATUS_CONFIG) as OrderStatus[]).map((s) => (
                  <option key={s} value={s} className="bg-zinc-900 text-zinc-100">
                    {STATUS_CONFIG[s].label}
                  </option>
                ))}
              </select>
            )}
          </div>

          <p className="text-sm text-zinc-400 line-clamp-2">{order.problem_beschreibung}</p>

          {/* Wunschtermin */}
          {order.wunschtermin_tag && !isDeleted && (
            <span className="inline-flex items-center gap-1 text-xs text-zinc-500">
              <Sun size={11} className="text-yellow-500" />
              Wunschtermin: {order.wunschtermin_tag}
              {order.wunschtermin_zeit && ` · ${order.wunschtermin_zeit}`}
            </span>
          )}

          {/* Rückrufwunsch */}
          {order.rueckruf_wunsch && !isDeleted && (
            <span className="inline-flex items-center gap-1 text-xs text-zinc-500">
              {order.rueckruf_wunsch === 'vormittags' && <Sun size={11} className="text-yellow-500" />}
              {order.rueckruf_wunsch === 'nachmittags' && <Sunset size={11} className="text-orange-400" />}
              {order.rueckruf_wunsch === 'egal' && <Phone size={11} />}
              Rückruf {order.rueckruf_wunsch}
            </span>
          )}

          {/* Termin */}
          {order.termin_datum && !isDeleted && (
            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium bg-blue-950/50 text-blue-300 border-blue-700">
              <CalendarDays size={11} />
              {new Date(order.termin_datum).toLocaleDateString('de-DE', {
                weekday: 'short', day: '2-digit', month: '2-digit',
              })} · {new Date(order.termin_datum).toLocaleTimeString('de-DE', {
                hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Berlin',
              })} Uhr
              {order.termin_dauer_minuten && order.termin_dauer_minuten >= 1440 && (
                <span className="opacity-60 ml-0.5">
                  · {Math.round(order.termin_dauer_minuten / 1440)} Tag{Math.round(order.termin_dauer_minuten / 1440) > 1 ? 'e' : ''}
                </span>
              )}
            </span>
          )}

          {/* Status abgefragt */}
          {order.status_abgefragt_am && !isDeleted && !isEskalation && (
            <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium bg-zinc-800 text-zinc-400 border-zinc-700">
              <PhoneCall size={11} />
              Kunde informiert · {new Date(order.status_abgefragt_am).toLocaleString('de-DE', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
            </span>
          )}

          {/* Freigabe-Positionen Badge */}
          {isWartenFreigabe && gesamtPositionen > 0 && (
            <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg font-semibold bg-orange-500 text-white animate-pulse w-fit">
              <AlertTriangle size={12} />
              {offenePositionen > 0
                ? `${offenePositionen} von ${gesamtPositionen} offen`
                : `Alle ${gesamtPositionen} entschieden`}
            </span>
          )}

          {/* Freigabe status */}
          {hasFreigabe && !isDeleted && (
            <div className={[
              'flex items-center gap-2 text-xs px-2.5 py-1 rounded-lg w-fit',
              freigabeApproved ? 'bg-green-950/60 text-green-400 border border-green-800' :
              freigabeRejected ? 'bg-red-950/60 text-red-400 border border-red-800' :
              freigabePartial  ? 'bg-orange-950/60 text-orange-400 border border-orange-800' :
              'bg-yellow-950/50 text-yellow-400 border border-yellow-800',
            ].join(' ')}>
              {freigabeApproved && <CheckCircle2 size={12} />}
              {freigabeRejected && <XCircle size={12} />}
              {freigabePartial  && <AlertTriangle size={12} />}
              {freigabePending  && <Clock size={12} className="animate-pulse" />}
              {freigabeApproved && `Freigegeben${order.freigabe_betrag ? ` · ${order.freigabe_betrag.toFixed(2)} €` : ''}`}
              {freigabeRejected && 'Abgelehnt — Rückruf nötig'}
              {freigabePartial  && 'Teilweise abgelehnt — Rückruf nötig'}
              {freigabePending  && `Wartet auf Freigabe${order.freigabe_betrag ? ` · ${order.freigabe_betrag.toFixed(2)} €` : ''}`}
            </div>
          )}

          {isDeleted && order.loeschgrund && (
            <p className="text-xs text-zinc-600 italic">Gelöscht: {order.loeschgrund}</p>
          )}

          <p className="text-xs text-zinc-600">
            {new Date(order.erstellt_am).toLocaleString('de-DE', {
              day: '2-digit', month: '2-digit', year: 'numeric',
              hour: '2-digit', minute: '2-digit',
            })}
          </p>
        </div>

        {/* Actions */}
        {!isDeleted && (
          <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
            <a
              href={`tel:${order.kunden_telefonnummer}`}
              className={[
                'flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg transition-colors',
                isEskalation
                  ? 'bg-red-600 hover:bg-red-500 text-white'
                  : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200',
              ].join(' ')}
            >
              <Phone size={15} />
              Anrufen
            </a>
            <button
              onClick={() => onDeleteClick(order)}
              className="p-2 rounded-lg text-zinc-600 hover:text-red-400 hover:bg-zinc-800 transition-colors"
              title="Auftrag löschen"
            >
              <Trash2 size={16} />
            </button>
          </div>
        )}

      </div>
    </li>
  )
}
