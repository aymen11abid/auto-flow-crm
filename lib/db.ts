import { supabase } from './supabase'
import type { Order, NewOrderForm, Kommentar } from './types'

function sortOrders(orders: Order[]): Order[] {
  return [
    ...orders.filter((o) => !o.geloescht_am && o.status === 'eskalation_rueckruf'),
    ...orders.filter((o) => !o.geloescht_am && o.status !== 'eskalation_rueckruf'),
    ...orders.filter((o) => !!o.geloescht_am),
  ]
}

export async function fetchOrders(): Promise<{ orders: Order[]; error: string | null }> {
  const { data, error } = await supabase
    .from('auftraege')
    .select('*')
    .order('erstellt_am', { ascending: false })

  if (error) return { orders: [], error: error.message }
  return { orders: sortOrders(data ?? []), error: null }
}

export async function createOrder(form: NewOrderForm): Promise<string | null> {
  const { error } = await supabase.from('auftraege').insert([form])
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
