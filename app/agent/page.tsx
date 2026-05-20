'use client'

import React, { useState, useRef, useEffect } from 'react'
import { Send, Loader, Bot, User, ChevronLeft } from 'lucide-react'
import Link from 'next/link'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

export default function AgentPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput]       = useState('')
  const [loading, setLoading]   = useState(false)
  const bottomRef               = useRef<HTMLDivElement>(null)
  const textareaRef             = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function sendMessage() {
    const text = input.trim()
    if (!text || loading) return

    const userMsg: Message = { role: 'user', content: text }
    const newMessages = [...messages, userMsg]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    const assistantMsg: Message = { role: 'assistant', content: '' }
    setMessages([...newMessages, assistantMsg])

    try {
      const res = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      })

      if (!res.ok || !res.body) {
        throw new Error('Request failed')
      }

      const reader  = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer    = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const data = line.slice(6)
          if (data === '[DONE]') break

          try {
            const parsed = JSON.parse(data)
            if (parsed.error) throw new Error(parsed.error)
            if (parsed.text) {
              setMessages((prev) => {
                const updated = [...prev]
                updated[updated.length - 1] = {
                  role: 'assistant',
                  content: updated[updated.length - 1].content + parsed.text,
                }
                return updated
              })
            }
          } catch {
            // skip malformed SSE lines
          }
        }
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Fehler beim Senden'
      setMessages((prev) => {
        const updated = [...prev]
        updated[updated.length - 1] = {
          role: 'assistant',
          content: `⚠️ ${msg}`,
        }
        return updated
      })
    } finally {
      setLoading(false)
      textareaRef.current?.focus()
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      {/* Header */}
      <header className="border-b border-zinc-800 px-4 py-3 flex items-center gap-3">
        <Link
          href="/"
          className="text-zinc-400 hover:text-zinc-200 transition-colors p-1 rounded-md hover:bg-zinc-800"
        >
          <ChevronLeft size={18} />
        </Link>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-orange-500/20 border border-orange-500/40 flex items-center justify-center">
            <Bot size={14} className="text-orange-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-zinc-100">Vapi-Stratege</p>
            <p className="text-xs text-zinc-500">Senior PM · KI-Automatisierung</p>
          </div>
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6 max-w-3xl mx-auto w-full">
        {messages.length === 0 && (
          <div className="text-center py-16">
            <div className="w-12 h-12 rounded-full bg-orange-500/10 border border-orange-500/20 flex items-center justify-center mx-auto mb-4">
              <Bot size={22} className="text-orange-400" />
            </div>
            <p className="text-zinc-300 font-medium mb-1">Vapi-Stratege bereit</p>
            <p className="text-zinc-500 text-sm max-w-sm mx-auto">
              Frag mich zu Webhook-Logik, Vapi-Prompts, Voice-Bot-Optimierung oder
              CRM-Strategie für deine Werkstatt.
            </p>
            <div className="mt-6 flex flex-wrap gap-2 justify-center">
              {[
                'Wie verbessere ich den Vapi-Prompt?',
                'Warum gehen Felder leer ein?',
                'Welche Quick Wins gibt es heute?',
              ].map((suggestion) => (
                <button
                  key={suggestion}
                  onClick={() => setInput(suggestion)}
                  className="text-xs text-zinc-400 border border-zinc-700 rounded-full px-3 py-1.5 hover:border-orange-500/50 hover:text-zinc-200 transition-colors"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
          >
            <div
              className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center mt-0.5 ${
                msg.role === 'user'
                  ? 'bg-zinc-700 border border-zinc-600'
                  : 'bg-orange-500/20 border border-orange-500/40'
              }`}
            >
              {msg.role === 'user' ? (
                <User size={13} className="text-zinc-300" />
              ) : (
                <Bot size={13} className="text-orange-400" />
              )}
            </div>
            <div
              className={`max-w-[80%] rounded-xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-zinc-800 text-zinc-100 border border-zinc-700'
                  : 'bg-zinc-900 text-zinc-200 border border-zinc-800'
              }`}
            >
              {msg.content}
              {msg.role === 'assistant' &&
                loading &&
                i === messages.length - 1 &&
                msg.content === '' && (
                  <span className="inline-flex gap-1 items-center text-zinc-500">
                    <Loader size={12} className="animate-spin" />
                    <span className="text-xs">Denkt nach…</span>
                  </span>
                )}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-zinc-800 px-4 py-4">
        <div className="max-w-3xl mx-auto flex gap-3 items-end">
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Frage stellen… (Enter zum Senden, Shift+Enter für neue Zeile)"
            className="flex-1 bg-zinc-900 border border-zinc-700 rounded-xl px-4 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-orange-500 resize-none min-h-[44px] max-h-[160px] overflow-y-auto"
            style={{ height: 'auto' }}
            onInput={(e) => {
              const el = e.currentTarget
              el.style.height = 'auto'
              el.style.height = `${Math.min(el.scrollHeight, 160)}px`
            }}
            disabled={loading}
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="flex-shrink-0 w-10 h-10 rounded-xl bg-orange-500 hover:bg-orange-400 disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
          >
            {loading ? (
              <Loader size={16} className="animate-spin text-white" />
            ) : (
              <Send size={16} className="text-white" />
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
