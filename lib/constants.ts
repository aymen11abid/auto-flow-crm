import { Plus, Wrench, CheckCircle, AlertTriangle } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { OrderStatus, NewOrderForm } from './types'

export const STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; color: string; Icon: LucideIcon }
> = {
  neu: {
    label: 'Neu',
    Icon: Plus,
    color: 'bg-blue-900/50 text-blue-300 border-blue-700',
  },
  in_bearbeitung: {
    label: 'In Bearbeitung',
    Icon: Wrench,
    color: 'bg-yellow-900/50 text-yellow-300 border-yellow-700',
  },
  abgeschlossen: {
    label: 'Abgeschlossen',
    Icon: CheckCircle,
    color: 'bg-green-900/50 text-green-300 border-green-700',
  },
  eskalation_rueckruf: {
    label: 'Rückruf',
    Icon: AlertTriangle,
    color: 'bg-red-900/50 text-red-300 border-red-700',
  },
}

export const EMPTY_ORDER_FORM: NewOrderForm = {
  kunden_name: '',
  kunden_telefonnummer: '',
  kunden_email: null,
  kennzeichen: null,
  fahrzeug: '',
  problem_beschreibung: '',
  status: 'neu',
}
