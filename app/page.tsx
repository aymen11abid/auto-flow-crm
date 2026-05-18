'use client'

import { useEffect, useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, RefreshCw, AlertTriangle, Loader, LogOut, Bell, X, PhoneCall, CalendarDays, Search } from 'lucide-react'
import VoxaroLogo from '@/components/VoxaroLogo'
import { fetchOrders, softDeleteOrder, updateOrderStatus, fetchStatusAnfragen, markStatusAnfrageErledigt, fetchFreigabenCounts } from '@/lib/db'
import { STATUS_CONFIG } from '@/lib/constants'
import { supabase } from '@/lib/supabase'
import type { Order, OrderStatus, StatusAnfrage, FreigabeCount } from '@/lib/types'
import OrderCard     from '@/components/OrderCard'
import OrderForm     from '@/components/OrderForm'
import DeleteModal   from '@/components/DeleteModal'

type FilterValue = 'alle' | 'geloescht' | OrderStatus

const FILTER_TABS: { value: FilterValue; label: string }[] = [
  { value: 'alle',                  label: 'Alle' },
  { value: 'eskalation_rueckruf',   label: 'Rückruf' },
  { value: 'neu',                   label: 'Neu' },
  { value: 'in_bearbeitung',        label: 'In Bearbeitung' },
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
  const [filter, setFilter]                   = useState<FilterValue>('alle')
  const [statusAnfragen, setStatusAnfragen]   = useState<StatusAnfrage[]>([])
  const [anfragenOpen, setAnfragenOpen]       = useState(false)
  const [freigabenCounts, setFreigabenCounts] = useState<Record<string, FreigabeCount>>({})
  const [eskalationAlert, setEskalationAlert] = useState<Order | null>(null)
  const [searchQuery, setSearchQuery]         = useState('')
  const [datumFilter, setDatumFilter]         = useState<'alle' | 'heute' | 'woche' | 'monat'>('alle')

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

  useEffect(() => {
    if (!authChecked || !werkstattId) return
    const channel = supabase
      .channel('eskalation-watch')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'auftraege' }, (payload) => {
        const o = payload.new as Order
        if (o?.status === 'eskalation_rueckruf') {
          fetchOrders(werkstattId).then(({ orders: fresh }) => setOrders(fresh))
          setEskalationAlert(o)
          setTimeout(() => setEskalationAlert((cur) => cur?.id === o.id ? null : cur), 8000)
        }
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authChecked, werkstattId])

  async function loadOrders(wid = werkstattId) {
    setLoading(true)
    const { orders, error } = await fetchOrders(wid)
    if (error) { setError(error); setLoading(false); return }
    setOrders(orders)
    const ids = orders.filter((o) => !o.geloescht_am).map((o) => o.id)
    const counts = await fetchFreigabenCounts(ids)
    setFreigabenCounts(counts)
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
    let result: Order[]
    switch (filter) {
      case 'alle':      result = orders.filter((o) => !o.geloescht_am); break
      case 'geloescht': result = orders.filter((o) => !!o.geloescht_am); break
      default:          result = orders.filter((o) => !o.geloescht_am && o.status === filter)
    }

    if (datumFilter !== 'alle') {
      const von = new Date()
      if (datumFilter === 'heute') {
        von.setHours(0, 0, 0, 0)
      } else if (datumFilter === 'woche') {
        const day = von.getDay()
        von.setDate(von.getDate() - (day === 0 ? 6 : day - 1))
        von.setHours(0, 0, 0, 0)
      } else if (datumFilter === 'monat') {
        von.setDate(1)
        von.setHours(0, 0, 0, 0)
      }
      result = result.filter((o) => new Date(o.erstellt_am) >= von)
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase()
      result = result.filter((o) =>
        o.kunden_name.toLowerCase().includes(q) ||
        o.fahrzeug.toLowerCase().includes(q) ||
        (o.problem_beschreibung ?? '').toLowerCase().includes(q) ||
        o.kunden_telefonnummer.toLowerCase().includes(q)
      )
    }

    return result
  }, [orders, filter, searchQuery, datumFilter])

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

            <button onClick={() => router.push('/kalender')}
              className="p-2 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition-colors"
              title="Kalender"
            >
              <CalendarDays size={16} />
            </button>
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

        {/* Suche + Datum-Filter */}
        {!loading && orders.length > 0 && (
          <div className="max-w-5xl mx-auto px-4 pb-3 flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Name, Fahrzeug, Kennzeichen…"
                className="w-full bg-zinc-800/60 border border-zinc-700 rounded-lg pl-8 pr-7 py-1.5 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-orange-500 transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                >
                  <X size={13} />
                </button>
              )}
            </div>
            <div className="flex gap-1 shrink-0">
              {(['alle', 'heute', 'woche', 'monat'] as const).map((d) => (
                <button
                  key={d}
                  onClick={() => setDatumFilter(d)}
                  className={[
                    'text-xs px-3 py-1.5 rounded-full border transition-colors whitespace-nowrap',
                    datumFilter === d
                      ? 'bg-orange-500 border-orange-400 text-white'
                      : 'bg-zinc-800/60 border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200',
                  ].join(' ')}
                >
                  {d === 'alle' ? 'Alle' : d === 'heute' ? 'Heute' : d === 'woche' ? 'Diese Woche' : 'Dieser Monat'}
                </button>
              ))}
            </div>
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
                  freigabeCount={freigabenCounts[order.id]}
                  onDeleteClick={setDeleteTarget}
                  onStatusChange={handleStatusChange}
                />
              ))}
            </ul>
          )}
        </section>

      </main>

      {/* Realtime Eskalations-Alert */}
      {eskalationAlert && (
        <div className="fixed bottom-5 left-4 right-4 z-50 max-w-sm mx-auto">
          <div className="bg-red-950 border border-red-600 rounded-2xl p-4 shadow-2xl flex items-start gap-3">
            <PhoneCall size={18} className="text-red-400 shrink-0 mt-0.5 animate-pulse" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-red-100">Rückruf nötig</p>
              <p className="text-xs text-red-300 mt-0.5 truncate">
                {eskalationAlert.kunden_name || 'Unbekannt'} · {eskalationAlert.fahrzeug || '–'}
              </p>
            </div>
            <button
              onClick={() => setEskalationAlert(null)}
              className="text-red-500 hover:text-red-300 shrink-0"
            >
              <X size={15} />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
