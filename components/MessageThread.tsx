'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Send, Loader, MessageSquare, ChevronDown, ChevronUp } from 'lucide-react'
import type { Nachricht } from '@/lib/types'

interface Props {
  auftragId: string
  kundenName: string
}

export default function MessageThread({ auftragId, kundenName }: Props) {
  const [open, setOpen]               = useState(false)
  const [nachrichten, setNachrichten] = useState<Nachricht[]>([])
  const [input, setInput]             = useState('')
  const [loading, setLoading]         = useState(false)
  const [sending, setSending]         = useState(false)
  const bottomRef                     = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    fetch(`/api/nachrichten?auftragId=${auftragId}`)
      .then((r) => r.json())
      .then((d) => setNachrichten(d.nachrichten ?? []))
      .finally(() => setLoading(false))
  }, [open, auftragId])

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [nachrichten, open])

  async function handleSend() {
    const text = input.trim()
    if (!text || sending) return
    setSending(true)
    const res = await fetch('/api/nachrichten', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ auftragId, inhalt: text, von: 'werkstatt' }),
    })
    const data = await res.json()
    if (data.nachricht) {
      setNachrichten((prev) => [...prev, data.nachricht])
      setInput('')
    }
    setSending(false)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') { e.preventDefault(); handleSend() }
  }

  const unread = nachrichten.filter((n) => n.von === 'kunde').length

  return (
    <div className="border-t border-zinc-800">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-2.5 text-xs text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 transition-colors"
      >
        <span className="flex items-center gap-1.5">
          <MessageSquare size={13} />
          Nachrichten
          {unread > 0 && !open && (
            <span className="bg-orange-500 text-white rounded-full text-[10px] px-1.5 py-0.5 leading-none">
              {unread}
            </span>
          )}
        </span>
        {open ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
      </button>

      {open && (
        <div className="px-4 pb-3 space-y-3">
          {/* Message list */}
          <div className="max-h-48 overflow-y-auto space-y-2 pt-1">
            {loading && (
              <div className="flex justify-center py-4">
                <Loader size={14} className="animate-spin text-zinc-500" />
              </div>
            )}
            {!loading && nachrichten.length === 0 && (
              <p className="text-zinc-600 text-xs text-center py-3">Noch keine Nachrichten</p>
            )}
            {nachrichten.map((n) => (
              <div
                key={n.id}
                className={`flex ${n.von === 'werkstatt' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] rounded-xl px-3 py-2 text-xs ${
                    n.von === 'werkstatt'
                      ? 'bg-orange-500/20 text-orange-100 border border-orange-500/30'
                      : 'bg-zinc-800 text-zinc-200 border border-zinc-700'
                  }`}
                >
                  <p className="leading-relaxed">{n.inhalt}</p>
                  <p className={`text-[10px] mt-1 ${n.von === 'werkstatt' ? 'text-orange-400/60' : 'text-zinc-500'}`}>
                    {n.von === 'werkstatt' ? 'Werkstatt' : kundenName} ·{' '}
                    {new Date(n.erstellt_am).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="flex gap-2">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Nachricht schreiben…"
              className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-orange-500"
              disabled={sending}
            />
            <button
              onClick={handleSend}
              disabled={sending || !input.trim()}
              className="w-8 h-8 flex items-center justify-center rounded-lg bg-orange-500 hover:bg-orange-400 disabled:opacity-40 transition-colors flex-shrink-0"
            >
              {sending ? <Loader size={12} className="animate-spin text-white" /> : <Send size={12} className="text-white" />}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
