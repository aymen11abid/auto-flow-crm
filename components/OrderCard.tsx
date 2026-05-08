'use client'

import { Phone, AlertTriangle, XCircle, Trash2 } from 'lucide-react'
import { STATUS_CONFIG } from '@/lib/constants'
import type { Order } from '@/lib/types'

interface Props {
  order: Order
  onDeleteClick: (order: Order) => void
}

export default function OrderCard({ order, onDeleteClick }: Props) {
  const isEskalation = order.status === 'eskalation_rueckruf'
  const isDeleted    = !!order.geloescht_am
  const { label, color, Icon } = STATUS_CONFIG[order.status]

  return (
    <li
      className={[
        'rounded-xl border p-4 transition-all',
        isDeleted
          ? 'bg-zinc-900/40 border-zinc-800 opacity-50 grayscale'
          : isEskalation
            ? 'bg-red-950/30 border-red-600 shadow-[0_0_0_2px_rgba(220,38,38,0.4)] animate-pulse-border'
            : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700',
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
            <span className="text-zinc-500 text-sm truncate">{order.fahrzeug}</span>
            <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium ${color}`}>
              <Icon size={12} />
              {label}
            </span>
          </div>

          <p className="text-sm text-zinc-400 line-clamp-2">{order.problem_beschreibung}</p>

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
          <div className="flex items-center gap-2 shrink-0">
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
