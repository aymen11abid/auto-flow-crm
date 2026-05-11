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
  freigabe_token: string | null
  freigabe_beschreibung: string | null
  freigabe_foto_url: string | null
  freigabe_betrag: number | null
  freigabe_angefragt_am: string | null
  freigabe_ergebnis: 'approved' | 'rejected' | null
}

export type NewOrderForm = Pick<
  Order,
  'kunden_name' | 'kunden_telefonnummer' | 'fahrzeug' | 'problem_beschreibung' | 'status'
>

export interface FreigabeForm {
  beschreibung: string
  foto_url: string
  betrag: string
}

export type NachrichtVon = 'werkstatt' | 'kunde'

export interface Nachricht {
  id: string
  auftrag_id: string
  inhalt: string
  von: NachrichtVon
  erstellt_am: string
}
