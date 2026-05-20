export type OrderStatus =
  | 'neu'
  | 'in_bearbeitung'
  | 'abgeschlossen'
  | 'eskalation_rueckruf'

export interface Order {
  id: string
  werkstatt_id: string
  kunden_name: string
  kunden_telefonnummer: string
  kunden_email: string | null
  kennzeichen: string | null
  fahrzeug: string
  problem_beschreibung: string
  status: OrderStatus
  foto_url: string | null
  erstellt_am: string
  geloescht_am: string | null
  loeschgrund: string | null
  ist_wiederholung: boolean
  rueckruf_wunsch: 'vormittags' | 'nachmittags' | 'egal' | null
  wunschtermin_tag: string | null
  wunschtermin_zeit: 'vormittags' | 'nachmittags' | 'egal' | null
  freigabe_token: string | null
  freigabe_beschreibung: string | null
  freigabe_foto_url: string | null
  freigabe_betrag: number | null
  freigabe_angefragt_am: string | null
  freigabe_ergebnis: 'approved' | 'rejected' | 'partial' | null
  status_abgefragt_am: string | null
  portal_token: string | null
  portal_sms_gesendet_am: string | null
  portal_fertig_sms_gesendet_am: string | null
  termin_datum: string | null
  termin_dauer_minuten: number | null
}

export interface PublicOrder {
  id: string
  fahrzeug: string
  kunden_name: string
  problem_beschreibung: string
  status: OrderStatus
  erstellt_am: string
  freigabe_token: string | null
}

export type NewOrderForm = Pick<
  Order,
  'kunden_name' | 'kunden_telefonnummer' | 'kunden_email' | 'kennzeichen' | 'fahrzeug' | 'problem_beschreibung' | 'status'
>

export interface Kommentar {
  id: string
  auftrag_id: string
  text: string
  erstellt_am: string
}

export interface FreigabeForm {
  beschreibung: string
  foto_url: string
  betrag: string
}

export interface Freigabe {
  id: string
  auftrag_id: string
  batch_token: string
  beschreibung: string
  betrag: number | null
  foto_url: string | null
  ergebnis: 'approved' | 'rejected' | null
  erstellt_am: string
  entschieden_am: string | null
}

export interface FreigabeCount {
  offen: number
  gesamt: number
}

export interface StatusAnfrage {
  id: string
  werkstatt_id: string
  telefonnummer: string
  erstellt_am: string
  bearbeitet: boolean
}

// ── Anrufe (Leads von Samir) ──────────────────────────────────────────────────
export interface Anruf {
  id: string
  werkstatt_id: string | null
  created_at: string
  kunden_name: string
  kunden_telefon: string
  fahrzeug: string
  problem: string
  typ: 'termin' | 'eskalation' | 'status'
  status: 'neu' | 'angebot_erstellt' | 'auftrag_erstellt'
}

// ── Angebote ──────────────────────────────────────────────────────────────────
export interface AngebotPosition {
  beschreibung: string
  betrag: number
  typ: 'teil' | 'arbeit' | 'sonstiges'
}

export interface Angebot {
  id: string
  werkstatt_id: string
  anruf_id: string | null
  token: string
  angebotsnummer: string | null
  kunden_name: string
  kunden_telefon: string
  fahrzeug: string
  notiz: string | null
  positionen: AngebotPosition[]
  gesamt: number
  mwst_prozent: number
  rabatt_typ: 'prozent' | 'betrag' | null
  rabatt_wert: number
  gueltig_bis: string | null
  status: 'entwurf' | 'gesendet' | 'genehmigt' | 'abgelehnt'
  created_at: string
  entschieden_am: string | null
}

// ── Rechnungen ────────────────────────────────────────────────────────────────
export interface Rechnung {
  id: string
  werkstatt_id: string
  auftrag_id: string | null
  angebot_id: string | null
  rechnungsnummer: string | null
  kunden_name: string
  kunden_telefon: string
  fahrzeug: string
  positionen: AngebotPosition[]
  netto: number
  mwst_betrag: number
  gesamt: number
  mwst_prozent: number
  status: 'entwurf' | 'gesendet' | 'bezahlt'
  created_at: string
}
