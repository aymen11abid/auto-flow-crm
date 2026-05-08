'use client'

import { useEffect, useState } from 'react'
import { Plus, RefreshCw, Wrench, AlertTriangle, Loader } from 'lucide-react'
import { fetchOrders, softDeleteOrder } from '@/lib/db'
import type { Order } from '@/lib/types'
import OrderCard   from '@/components/OrderCard'
import OrderForm   from '@/components/OrderForm'
import DeleteModal from '@/components/DeleteModal'

export default function Dashboard() {
  const [orders, setOrders]       = useState<Order[]>([])
  const [loading, setLoading]     = useState(true)
  const [formOpen, setFormOpen]   = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Order | null>(null)

  async function loadOrders() {
    setLoading(true)
    const { orders, error } = await fetchOrders()
    if (error) setError(error)
    else setOrders(orders)
    setLoading(false)
  }

  useEffect(() => { loadOrders() }, [])

  async function handleDelete(reason: string) {
    if (!deleteTarget) return
    const err = await softDeleteOrder(deleteTarget.id, reason || null)
    if (err) {
      setError(err)
    } else {
      setOrders((prev) => {
        const updated = prev.map((o) =>
          o.id === deleteTarget.id
            ? { ...o, geloescht_am: new Date().toISOString(), loeschgrund: reason || null }
            : o
        )
        return [
          ...updated.filter((o) => !o.geloescht_am && o.status === 'eskalation_rueckruf'),
          ...updated.filter((o) => !o.geloescht_am && o.status !== 'eskalation_rueckruf'),
          ...updated.filter((o) => !!o.geloescht_am),
        ]
      })
    }
    setDeleteTarget(null)
  }

  const escalationCount = orders.filter(
    (o) => o.status === 'eskalation_rueckruf' && !o.geloescht_am
  ).length

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans">

      {deleteTarget && (
        <DeleteModal
          order={deleteTarget}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Wrench size={22} className="text-orange-400" />
            <span className="text-lg font-bold tracking-tight">Auto-Flow CRM</span>
            {escalationCount > 0 && (
              <span className="flex items-center gap-1 text-xs font-semibold bg-red-600 text-white px-2 py-0.5 rounded-full animate-pulse">
                <AlertTriangle size={11} />
                {escalationCount} Eskalation{escalationCount > 1 ? 'en' : ''}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button onClick={loadOrders}
              className="p-2 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
              title="Neu laden"
            >
              <RefreshCw size={16} />
            </button>
            <button onClick={() => setFormOpen((v) => !v)}
              className="flex items-center gap-2 bg-orange-500 hover:bg-orange-400 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              <Plus size={16} />
              Neuer Auftrag
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6 space-y-6">

        {error && (
          <div className="bg-red-950 border border-red-700 text-red-300 rounded-lg px-4 py-3 text-sm">
            {error}
          </div>
        )}

        {formOpen && (
          <OrderForm
            onSuccess={() => { setFormOpen(false); loadOrders() }}
            onCancel={() => setFormOpen(false)}
          />
        )}

        <section>
          <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-3">
            Aufträge {!loading && <span className="text-zinc-600">({orders.length})</span>}
          </h2>

          {loading ? (
            <div className="flex items-center justify-center py-20 text-zinc-600">
              <Loader size={20} className="animate-spin mr-2" />
              Lade Aufträge...
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-20 text-zinc-600 text-sm">
              Noch keine Aufträge vorhanden.
            </div>
          ) : (
            <ul className="space-y-3">
              {orders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onDeleteClick={setDeleteTarget}
                />
              ))}
            </ul>
          )}
        </section>

      </main>
    </div>
  )
}
