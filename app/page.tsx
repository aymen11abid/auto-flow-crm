'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, RefreshCw, AlertTriangle, Loader, LogOut, Bell } from 'lucide-react'
import VoxaroLogo from '@/components/VoxaroLogo'
import { fetchOrders, softDeleteOrder, updateOrderStatus, fetchStatusAnfragen, markStatusAnfrageErledigt } from '@/lib/db'
import { STATUS_CONFIG } from '@/lib/constants'
import { supabase } from '@/lib/supabase'
import type { Order, OrderStatus, StatusAnfrage } from '@/lib/types'
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

  const [authChecked, setAuthChecked]         = useState(false)
  const [werkstattId, setWerkstattId]         = useState<string>('')
  const [orders, setOrders]                   = useState<Order[]>([])
  const [loading, setLoading]                 = useState(true)
  const [formOpen, setFormOpen]               = useState(false)
  const [error, setError]                     = useState<string | null>(null)
  const [deleteTarget, setDeleteTarget]       = useState<Order | null>(null)
  const [freigabeTarget, setFreigabeTarget]   = useState<Order | null>(null)
  const [filter, setFilter]                   = useState<FilterValue>('alle')
  const [statusAnfragen, setStatusAnfragen]   = useState<StatusAnfrage[]>([])
  const [anfragenOpen, setAnfragenOpen]       = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.replace('/login')
      } else {
        const wid = session.user.user_metadata?.werkstatt_id as string ?? ''
        setWerkstattId(wid)
        setAuthChecked(true)
        loadOrders(wid)
        loadStatusAnfragen(wid)
      }
    })
  }, [router])

  async function loadOrders(wid = werkstattId) {
    setLoading(true)
    const { orders, error } = await fetchOrders(wid)
    if (error) setError(error)
    else setOrders(orders)
    setLoading(false)
  }

  async function loadStatusAnfragen(wid = werkstattId) {
    const data = await fetchStatusAnfragen(wid)
    setStatusAnfragen(data)
  }

  async function handleAnfrageErledigt(id: string) {
    await markStatusAnfrageErledigt(id)
    setStatusAnfragen((prev) => prev.filter((a) => a.id !== id))
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
    if (status === 'in_bearbeitung' || status === 'abgeschlossen') {
      fetch('/api/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: id, trigger: status }),
      }).catch(() => {})
    }
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
            <VoxaroLogo size="sm" />
            {escalationCount > 0 && (
              <span className="flex items-center gap-1 text-xs font-semibold bg-red-600 text-white px-2 py-0.5 rounded-full animate-pulse">
                <AlertTriangle size={11} />
                {escalationCount} Eskalation{escalationCount > 1 ? 'en' : ''}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Status-Anfragen Bell */}
            <div className="relative">
              <button
                onClick={() => setAnfragenOpen((v) => !v)}
                className="p-2 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
                title="Status-Anfragen"
              >
                <Bell size={16} />
              </button>
              {statusAnfragen.length > 0 && (
                <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center">
                  {statusAnfragen.length}
                </span>
              )}

              {/* Dropdown Panel */}
              {anfragenOpen && (
                <div className="absolute right-0 top-10 w-72 bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl z-50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-zinc-800">
                    <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Status-Anfragen</p>
                  </div>
                  {statusAnfragen.length === 0 ? (
                    <p className="text-xs text-zinc-600 px-4 py-3">Keine offenen Anfragen.</p>
                  ) : (
                    <ul className="max-h-64 overflow-y-auto divide-y divide-zinc-800">
                      {statusAnfragen.map((a) => (
                        <li key={a.id} className="px-4 py-3 flex items-center justify-between gap-2">
                          <div>
                            <p className="text-sm text-zinc-200 font-medium">{a.telefonnummer}</p>
                            <p className="text-xs text-zinc-600">
                              {new Date(a.erstellt_am).toLocaleString('de-DE', {
                                day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
                              })}
                            </p>
                          </div>
                          <button
                            onClick={() => handleAnfrageErledigt(a.id)}
                            className="shrink-0 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-300 px-2 py-1 rounded-lg transition-colors"
                          >
                            Erledigt
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            <button onClick={() => loadOrders()}
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
            werkstattId={werkstattId}
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
