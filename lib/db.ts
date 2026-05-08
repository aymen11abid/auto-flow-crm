import { supabase } from './supabase'
import type { Order, NewOrderForm } from './types'

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
