import { supabase } from './supabase'
import type { Order, NewOrderForm, Kommentar, StatusAnfrage, Freigabe, PublicOrder, FreigabeCount, Anruf, Angebot, AngebotPosition, Rechnung } from './types'

function sortOrders(orders: Order[]): Order[] {
  return [
    ...orders.filter((o) => !o.geloescht_am && o.status === 'eskalation_rueckruf'),
    ...orders.filter((o) => !o.geloescht_am && o.status !== 'eskalation_rueckruf'),
    ...orders.filter((o) => !!o.geloescht_am),
  ]
}

export async function fetchOrders(werkstatt_id: string): Promise<{ orders: Order[]; error: string | null }> {
  const { data, error } = await supabase
    .from('auftraege')
    .select('*')
    .eq('werkstatt_id', werkstatt_id)
    .order('erstellt_am', { ascending: false })

  if (error) return { orders: [], error: error.message }
  return { orders: sortOrders(data ?? []), error: null }
}

export async function createOrder(form: NewOrderForm, werkstatt_id: string): Promise<string | null> {
  const { error } = await supabase.from('auftraege').insert([{ ...form, werkstatt_id }])
  return error?.message ?? null
}

export async function updateOrderStatus(
  id: string,
  status: import('./types').OrderStatus
): Promise<string | null> {
  const { error } = await supabase
    .from('auftraege')
    .update({ status })
    .eq('id', id)
  return error?.message ?? null
}

export async function softDeleteOrder(
  id: string,
  reason: string | null
): Promise<string | null> {
  const { error } = await supabase
    .from('auftraege')
    .update({ geloescht_am: new Date().toISOString(), loeschgrund: reason })
    .eq('id', id)
  return error?.message ?? null
}

export async function createFreigabe(
  orderId: string,
  beschreibung: string,
  foto_url: string | null,
  betrag: number | null
): Promise<{ token: string | null; error: string | null }> {
  const token = crypto.randomUUID().replace(/-/g, '').slice(0, 24)
  const { error } = await supabase
    .from('auftraege')
    .update({
      freigabe_token: token,
      freigabe_beschreibung: beschreibung,
      freigabe_foto_url: foto_url || null,
      freigabe_betrag: betrag,
      freigabe_angefragt_am: new Date().toISOString(),
      freigabe_ergebnis: null,
      status: 'warten_auf_freigabe',
    })
    .eq('id', orderId)
  if (error) return { token: null, error: error.message }
  return { token, error: null }
}

export async function fetchOrderByFreigabeToken(
  token: string
): Promise<{ order: Order | null; error: string | null }> {
  const { data, error } = await supabase
    .from('auftraege')
    .select('*')
    .eq('freigabe_token', token)
    .single()
  if (error) return { order: null, error: error.message }
  return { order: data, error: null }
}

export async function resolveFreigabe(
  token: string,
  result: 'approved' | 'rejected'
): Promise<string | null> {
  const newStatus = result === 'approved' ? 'in_bearbeitung' : 'eskalation_rueckruf'
  const { error } = await supabase
    .from('auftraege')
    .update({ freigabe_ergebnis: result, status: newStatus })
    .eq('freigabe_token', token)
  return error?.message ?? null
}

export async function updateOrderFields(
  id: string,
  data: {
    kunden_telefonnummer: string
    fahrzeug: string
    problem_beschreibung: string
    kennzeichen: string | null
    kunden_email: string | null
    fin: string | null
    km_stand: number | null
    kostenschaetzung: number | null
  }
): Promise<string | null> {
  const { error } = await supabase.from('auftraege').update(data).eq('id', id)
  return error?.message ?? null
}

export async function fetchOrderById(
  id: string
): Promise<{ order: Order | null; error: string | null }> {
  const { data, error } = await supabase
    .from('auftraege')
    .select('*')
    .eq('id', id)
    .single()
  if (error) return { order: null, error: error.message }
  return { order: data, error: null }
}

export async function fetchKommentare(auftragId: string): Promise<Kommentar[]> {
  const { data } = await supabase
    .from('kommentare')
    .select('*')
    .eq('auftrag_id', auftragId)
    .order('erstellt_am', { ascending: true })
  return data ?? []
}

export async function createKommentar(
  auftragId: string,
  text: string
): Promise<string | null> {
  const { error } = await supabase
    .from('kommentare')
    .insert([{ auftrag_id: auftragId, text }])
  return error?.message ?? null
}

export async function createFreigabeBatch(
  auftragId: string,
  positionen: { beschreibung: string; betrag: number | null; foto_url?: string | null }[],
  existingToken: string | null
): Promise<{ token: string; error: string | null }> {
  const token = existingToken ?? crypto.randomUUID().replace(/-/g, '').slice(0, 24)

  if (!existingToken) {
    const { error } = await supabase
      .from('auftraege')
      .update({ freigabe_token: token })
      .eq('id', auftragId)
    if (error) return { token: '', error: error.message }
  }

  const rows = positionen.map((p) => ({
    auftrag_id:   auftragId,
    batch_token:  token,
    beschreibung: p.beschreibung,
    betrag:       p.betrag,
    foto_url:     p.foto_url ?? null,
  }))

  const { error } = await supabase.from('freigaben').insert(rows)
  if (error) return { token: '', error: error.message }
  return { token, error: null }
}

export async function fetchFreigabenByToken(token: string): Promise<Freigabe[]> {
  const { data } = await supabase
    .from('freigaben')
    .select('*')
    .eq('batch_token', token)
    .order('erstellt_am', { ascending: true })
  return data ?? []
}

export async function resolveFreigabePosition(
  freigabeId: string,
  batchToken: string,
  result: 'approved' | 'rejected'
): Promise<string | null> {
  // SQL: ALTER TABLE auftraege DROP CONSTRAINT IF EXISTS auftraege_freigabe_ergebnis_check;
  // ALTER TABLE auftraege ADD CONSTRAINT auftraege_freigabe_ergebnis_check
  //   CHECK (freigabe_ergebnis IN ('approved', 'rejected', 'partial'));
  const { error } = await supabase
    .from('freigaben')
    .update({ ergebnis: result, entschieden_am: new Date().toISOString() })
    .eq('id', freigabeId)
    .eq('batch_token', batchToken)
  if (error) return error.message

  const { data: alle } = await supabase
    .from('freigaben')
    .select('ergebnis, auftrag_id')
    .eq('batch_token', batchToken)

  if (!alle || alle.some((f) => f.ergebnis === null)) return null

  const auftragId   = alle[0].auftrag_id
  const alleApproved = alle.every((f) => f.ergebnis === 'approved')
  const alleRejected = alle.every((f) => f.ergebnis === 'rejected')
  const orderResult  = alleApproved ? 'approved' : alleRejected ? 'rejected' : 'partial'

  const { error: orderError } = await supabase
    .from('auftraege')
    .update({ freigabe_ergebnis: orderResult })
    .eq('id', auftragId)
  return orderError?.message ?? null
}

export async function fetchFreigabenByAuftrag(auftragId: string): Promise<Freigabe[]> {
  const { data } = await supabase
    .from('freigaben')
    .select('*')
    .eq('auftrag_id', auftragId)
    .order('erstellt_am', { ascending: true })
  return data ?? []
}

export async function fetchFreigabenCounts(
  auftragIds: string[]
): Promise<Record<string, FreigabeCount>> {
  if (!auftragIds.length) return {}
  const { data } = await supabase
    .from('freigaben')
    .select('auftrag_id, ergebnis')
    .in('auftrag_id', auftragIds)
  if (!data) return {}
  const counts: Record<string, FreigabeCount> = {}
  for (const f of data) {
    if (!counts[f.auftrag_id]) counts[f.auftrag_id] = { offen: 0, gesamt: 0 }
    counts[f.auftrag_id].gesamt++
    if (f.ergebnis === null) counts[f.auftrag_id].offen++
  }
  return counts
}

export async function fetchOrderByPortalToken(
  token: string
): Promise<{ order: PublicOrder | null; error: string | null }> {
  const { data, error } = await supabase
    .from('auftraege')
    .select('id, fahrzeug, kunden_name, problem_beschreibung, status, erstellt_am, freigabe_token')
    .eq('portal_token', token)
    .single()
  if (error) return { order: null, error: error.message }
  return { order: data as PublicOrder, error: null }
}

export async function fetchStatusAnfragen(werkstatt_id: string): Promise<StatusAnfrage[]> {
  const { data } = await supabase
    .from('status_anfragen')
    .select('*')
    .eq('werkstatt_id', werkstatt_id)
    .eq('bearbeitet', false)
    .order('erstellt_am', { ascending: false })
  return data ?? []
}

export async function markStatusAnfrageErledigt(id: string): Promise<string | null> {
  const { error } = await supabase
    .from('status_anfragen')
    .update({ bearbeitet: true })
    .eq('id', id)
  return error?.message ?? null
}

export async function saveTermin(
  id: string,
  termin_datum: string | null,
  termin_dauer_minuten: number | null
): Promise<string | null> {
  const { error } = await supabase
    .from('auftraege')
    .update({ termin_datum, termin_dauer_minuten })
    .eq('id', id)
  return error?.message ?? null
}

// ── Anrufe (Leads) ────────────────────────────────────────────────────────────

export async function fetchAnrufe(werkstatt_id: string): Promise<Anruf[]> {
  const { data } = await supabase
    .from('anrufe')
    .select('*')
    .eq('werkstatt_id', werkstatt_id)
    .eq('status', 'neu')
    .order('created_at', { ascending: false })
  return (data ?? []) as Anruf[]
}

export async function markAnrufErledigt(
  id: string,
  status: 'angebot_erstellt' | 'auftrag_erstellt'
): Promise<string | null> {
  const { error } = await supabase.from('anrufe').update({ status }).eq('id', id)
  return error?.message ?? null
}

// ── Angebote ──────────────────────────────────────────────────────────────────

export async function fetchAngebote(werkstatt_id: string): Promise<Angebot[]> {
  const { data } = await supabase
    .from('angebote')
    .select('*')
    .eq('werkstatt_id', werkstatt_id)
    .order('created_at', { ascending: false })
  return (data ?? []) as Angebot[]
}

export async function fetchAngebotByToken(
  token: string
): Promise<{ angebot: Angebot | null; error: string | null }> {
  const { data, error } = await supabase
    .from('angebote')
    .select('*')
    .eq('token', token)
    .single()
  if (error) return { angebot: null, error: error.message }
  return { angebot: data as Angebot, error: null }
}

export async function createAngebot(
  werkstatt_id: string,
  data: {
    anruf_id: string | null
    kunden_name: string
    kunden_telefon: string
    fahrzeug: string
    notiz: string | null
    positionen: AngebotPosition[]
    mwst_prozent: number
  }
): Promise<{ angebot: Angebot | null; error: string | null }> {
  const token = crypto.randomUUID().replace(/-/g, '').slice(0, 24)
  const netto = data.positionen.reduce((s, p) => s + p.betrag, 0)
  const gesamt = netto * (1 + data.mwst_prozent / 100)

  const { data: row, error } = await supabase
    .from('angebote')
    .insert([{ ...data, werkstatt_id, token, gesamt: Math.round(gesamt * 100) / 100 }])
    .select()
    .single()
  if (error) return { angebot: null, error: error.message }
  return { angebot: row as Angebot, error: null }
}

export async function fetchAngebotById(
  id: string
): Promise<{ angebot: Angebot | null; error: string | null }> {
  const { data, error } = await supabase
    .from('angebote')
    .select('*')
    .eq('id', id)
    .single()
  if (error) return { angebot: null, error: error.message }
  return { angebot: data as Angebot, error: null }
}

export async function updateAngebot(
  id: string,
  data: {
    kunden_name: string
    kunden_telefon: string
    fahrzeug: string
    notiz: string | null
    positionen: AngebotPosition[]
    mwst_prozent: number
    rabatt_typ: 'prozent' | 'betrag' | null
    rabatt_wert: number
    gueltig_bis: string | null
    gesamt: number
  }
): Promise<string | null> {
  const { error } = await supabase.from('angebote').update(data).eq('id', id)
  return error?.message ?? null
}

export async function resolveAngebot(
  token: string,
  ergebnis: 'genehmigt' | 'abgelehnt'
): Promise<string | null> {
  const { error } = await supabase
    .from('angebote')
    .update({ status: ergebnis, entschieden_am: new Date().toISOString() })
    .eq('token', token)
  return error?.message ?? null
}

// ── Rechnungen ────────────────────────────────────────────────────────────────

export async function fetchRechnungen(werkstatt_id: string): Promise<Rechnung[]> {
  const { data } = await supabase
    .from('rechnungen')
    .select('*')
    .eq('werkstatt_id', werkstatt_id)
    .order('created_at', { ascending: false })
  return (data ?? []) as Rechnung[]
}

export async function fetchRechnungById(
  id: string
): Promise<{ rechnung: Rechnung | null; error: string | null }> {
  const { data, error } = await supabase
    .from('rechnungen')
    .select('*')
    .eq('id', id)
    .single()
  if (error) return { rechnung: null, error: error.message }
  return { rechnung: data as Rechnung, error: null }
}

export async function createRechnung(
  werkstatt_id: string,
  data: {
    auftrag_id: string | null
    angebot_id: string | null
    kunden_name: string
    kunden_telefon: string
    fahrzeug: string
    positionen: AngebotPosition[]
    mwst_prozent: number
    rechnungsnummer: string | null
  }
): Promise<{ rechnung: Rechnung | null; error: string | null }> {
  const netto = Math.round(data.positionen.reduce((s, p) => s + p.betrag, 0) * 100) / 100
  const mwst_betrag = Math.round(netto * (data.mwst_prozent / 100) * 100) / 100
  const gesamt = Math.round((netto + mwst_betrag) * 100) / 100

  const { data: row, error } = await supabase
    .from('rechnungen')
    .insert([{ ...data, werkstatt_id, netto, mwst_betrag, gesamt }])
    .select()
    .single()
  if (error) return { rechnung: null, error: error.message }
  return { rechnung: row as Rechnung, error: null }
}

export async function updateRechnungStatus(
  id: string,
  status: 'entwurf' | 'gesendet' | 'bezahlt'
): Promise<string | null> {
  const { error } = await supabase.from('rechnungen').update({ status }).eq('id', id)
  return error?.message ?? null
}

// ── Termine ───────────────────────────────────────────────────────────────────

export async function fetchTermine(
  werkstatt_id: string,
  von: Date,
  bis: Date
): Promise<Order[]> {
  // Puffer von 7 Tagen vor `von`, damit mehrtägige Termine die in die Woche hineinreichen auch geladen werden
  const vonMitPuffer = new Date(von.getTime() - 7 * 24 * 60 * 60 * 1000)
  const { data } = await supabase
    .from('auftraege')
    .select('id, kunden_name, fahrzeug, termin_datum, termin_dauer_minuten, status, kunden_telefonnummer')
    .eq('werkstatt_id', werkstatt_id)
    .gte('termin_datum', vonMitPuffer.toISOString())
    .lte('termin_datum', bis.toISOString())
    .is('geloescht_am', null)
    .order('termin_datum', { ascending: true })
  return (data ?? []) as Order[]
}
