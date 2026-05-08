export type OrderStatus =
  | 'neu'
  | 'in_bearbeitung'
  | 'warten_auf_freigabe'
  | 'abgeschlossen'
  | 'eskalation_rueckruf'

export interface Order {
  id: string
  kunden_name: string
  kunden_telefonnummer: string
  fahrzeug: string
  problem_beschreibung: string
  status: OrderStatus
  foto_url: string | null
  erstellt_am: string
  geloescht_am: string | null
  loeschgrund: string | null
}

export type NewOrderForm = Pick<
  Order,
  'kunden_name' | 'kunden_telefonnummer' | 'fahrzeug' | 'problem_beschreibung' | 'status'
>
