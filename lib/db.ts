import { supabase } from './supabase'
import type { Order, NewOrderForm, Kommentar, StatusAnfrage, Freigabe, PublicOrder, FreigabeCount } from './types'

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
  data: { kunden_telefonnummer: string; fahrzeug: string; problem_beschreibung: string }
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
  positionen: { beschreibung: string; betrag: number | null }[],
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
    auftrag_id:  auftragId,
    batch_token: token,
    beschreibung: p.beschreibung,
    betrag:       p.betrag,
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
  const { error } = await supabase
    .from('freigaben')
    .update({ ergebnis: result, entschieden_am: new Date().toISOString() })
    .eq('id', freigabeId)
    .eq('batch_token', batchToken)
  return error?.message ?? null
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
