'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, RefreshCw, Wrench, AlertTriangle, Loader, LogOut } from 'lucide-react'
import { fetchOrders, softDeleteOrder, updateOrderStatus } from '@/lib/db'
import { STATUS_CONFIG } from '@/lib/constants'
import { supabase } from '@/lib/supabase'
import type { Order, OrderStatus } from '@/lib/types'
import OrderCard     from '@/components/OrderCard'
import OrderForm     from '@/components/OrderForm'
import DeleteModal   from '@/components/DeleteModal'
import FreigabeModal from '@/components/FreigabeModal'

type FilterValue = 'alle' | 'geloescht' | OrderStatus

const FILTER_TABS: { value: FilterValue; label: string }[] = [
  { value: 'alle',                  label: 'Alle' },
  { value: 'eskalation_rueckruf',   label: 'Rückruf' },
  { value: 'neu',                   label: 'Neu' },
  { value: 'in_bearbeitung',        label: 'In Bearbeitung' },
  { value: 'warten_auf_freigabe',   label: 'Freigabe' },
  { value: 'abgeschlossen',         label: 'Abgeschlossen' },
  { value: 'geloescht',             label: 'Gelöscht' },
]

export default function Dashboard() {
  const router = useRouter()

  const [authChecked, setAuthChecked]       = useState(false)
  const [orders, setOrders]                 = useState<Order[]>([])
  const [loading, setLoading]               = useState(true)
  const [formOpen, setFormOpen]             = useState(false)
  const [error, setError]                   = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget]     = useState<Order | null>(null)
  const [freigabeTarget, setFreigabeTarget] = useState<Order | null>(null)
  const [filter, setFilter]                 = useState<FilterValue>('alle')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.replace('/login')
      } else {
        setAuthChecked(true)
        loadOrders()
      }
    })
  }, [router])

  async function loadOrders() {
    setLoading(true)
    const { orders, error } = await fetchOrders()
    if (error) setError(error)
    else setOrders(orders)
    setLoading(false)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.replace('/login')
  }

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

  function handleFreigabeSuccess(token: string) {
    if (!freigabeTarget) return
    setOrders((prev) =>
      prev.map((o) =>
        o.id === freigabeTarget.id
          ? { ...o, freigabe_token: token, status: 'warten_auf_freigabe', freigabe_ergebnis: null }
          : o
      )
    )
  }

  async function handleStatusChange(id: string, status: OrderStatus) {
    await updateOrderStatus(id, status)
    setOrders((prev) => prev.map((o) => o.id === id ? { ...o, status } : o))
  }

  const escalationCount = orders.filter(
    (o) => o.status === 'eskalation_rueckruf' && !o.geloescht_am
  ).length

  const filtered = useMemo(() => {
    switch (filter) {
      case 'alle':      return orders.filter((o) => !o.geloescht_am)
      case 'geloescht': return orders.filter((o) => !!o.geloescht_am)
      default:          return orders.filter((o) => !o.geloescht_am && o.status === filter)
    }
  }, [orders, filter])

  function countFor(f: FilterValue): number {
    switch (f) {
      case 'alle':      return orders.filter((o) => !o.geloescht_am).length
      case 'geloescht': return orders.filter((o) => !!o.geloescht_am).length
      default:          return orders.filter((o) => !o.geloescht_am && o.status === f).length
    }
  }

  // Blank screen while checking auth — prevents flash of dashboard content
  if (!authChecked) {
    return <div className="min-h-screen bg-zinc-950" />
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans">

      {deleteTarget && (
        <DeleteModal
          order={deleteTarget}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}

      {freigabeTarget && (
        <FreigabeModal
          order={freigabeTarget}
          onClose={() => setFreigabeTarget(null)}
          onSuccess={handleFreigabeSuccess}
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
            <button onClick={handleLogout}
              className="p-2 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-zinc-800 transition-colors"
              title="Abmelden"
            >
              <LogOut size={16} />
            </button>
            <button onClick={() => setFormOpen((v) => !v)}
              className="flex items-center gap-2 bg-orange-500 hover:bg-orange-400 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              <Plus size={16} />
              Neuer Auftrag
            </button>
          </div>
        </div>

        {/* Filter tabs */}
        {!loading && orders.length > 0 && (
          <div className="max-w-5xl mx-auto px-4 pb-3 flex gap-1.5 overflow-x-auto scrollbar-none">
            {FILTER_TABS.map(({ value, label }) => {
              const count  = countFor(value)
              const active = filter === value
              const isEsk  = value === 'eskalation_rueckruf'
              return (
                <button
                  key={value}
                  onClick={() => setFilter(value)}
                  className={[
                    'flex items-center gap-1.5 whitespace-nowrap text-xs font-medium px-3 py-1.5 rounded-full border transition-colors shrink-0',
                    active
                      ? isEsk
                        ? 'bg-red-600 border-red-500 text-white'
                        : 'bg-orange-500 border-orange-400 text-white'
                      : isEsk && count > 0
                        ? 'bg-red-950/40 border-red-800 text-red-400 hover:border-red-600'
                        : 'bg-zinc-800/60 border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200',
                  ].join(' ')}
                >
                  {value !== 'alle' && value !== 'geloescht' && (
                    (() => {
                      const cfg = STATUS_CONFIG[value as OrderStatus]
                      return <cfg.Icon size={11} />
                    })()
                  )}
                  {label}
                  <span className={active ? 'opacity-70' : 'text-zinc-600'}>
                    {count}
                  </span>
                </button>
              )
            })}
          </div>
        )}
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
            {FILTER_TABS.find((t) => t.value === filter)?.label ?? 'Aufträge'}
            {!loading && (
              <span className="text-zinc-600 ml-1.5">({filtered.length})</span>
            )}
          </h2>

          {loading ? (
            <div className="flex items-center justify-center py-20 text-zinc-600">
              <Loader size={20} className="animate-spin mr-2" />
              Lade Aufträge...
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 text-zinc-600 text-sm">
              Keine Aufträge in dieser Kategorie.
            </div>
          ) : (
            <ul className="space-y-3">
              {filtered.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onDeleteClick={setDeleteTarget}
                  onFreigabeClick={setFreigabeTarget}
                  onStatusChange={handleStatusChange}
                />
              ))}
            </ul>
          )}
        </section>

      </main>
    </div>
  )
}
