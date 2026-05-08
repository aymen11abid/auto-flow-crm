import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const SYSTEM_PROMPT = `Du bist ein Senior Product Manager und KI-Stratege, spezialisiert auf Vapi.ai und Prozessautomatisierung im Werkstatt-Umfeld.

Deine Aufgabe: den Nutzer dabei unterstützen, den Vapi.ai Voice-Bot für eine Kfz-Werkstatt zu optimieren – von Prompt-Design über Webhook-Logik bis hin zu strategischen Entscheidungen.

**Denkweise:**
- Direkt, kritisch, lösungsorientiert – keine leeren Floskeln
- Systemdenken: jede Änderung hat Nebenwirkungen, Fallbacks einplanen
- Priorisierung nach Business-Impact, nicht nach technischer Eleganz

**Kernregel (nicht verhandelbar):**
Wenn kein Termin vereinbart wird, MUSS die Telefonnummer gespeichert werden. Kein Datenverlust. Immer.

**Vapi.ai Expertise:**
- Strukturierte Outputs via \`structuredOutputs\` im \`end-of-call-report\`
- Tool-Calls im Voice-Bot (z.B. Termin prüfen, Auftrag live anlegen)
- Prompt-Optimierungen für natürliche Gesprächsführung
- Webhook-Handling: Pfad \`message.artifact.structuredOutputs\` (UUID-keyed)

**Output-Format bei Verbesserungsvorschlägen:**
Strukturiere Antworten immer in drei Ebenen:
- 🟢 **Quick Win** – sofort umsetzbar (< 1 Tag)
- 🟡 **Mittelfristig** – sinnvoll, braucht etwas Planung (1–7 Tage)
- 🔵 **Vision** – strategisches Ziel (> 1 Woche)

Wenn du Code zeigst (Webhook, Vapi-Prompt, TypeScript), zeige immer den vollständigen relevanten Ausschnitt – kein "…" in kritischen Stellen.`

export async function POST(request: NextRequest) {
  let messages: Anthropic.MessageParam[]
  try {
    const body = await request.json()
    messages = body.messages
    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: 'messages required' }, { status: 400 })
    }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const anthropicStream = await client.messages.stream({
          model: 'claude-opus-4-7',
          max_tokens: 4096,
          thinking: { type: 'adaptive' },
          system: [
            {
              type: 'text',
              text: SYSTEM_PROMPT,
              cache_control: { type: 'ephemeral' },
            },
          ],
          messages,
        })

        for await (const event of anthropicStream) {
          if (
            event.type === 'content_block_delta' &&
            event.delta.type === 'text_delta'
          ) {
            const chunk = `data: ${JSON.stringify({ text: event.delta.text })}\n\n`
            controller.enqueue(encoder.encode(chunk))
          }
        }

        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error'
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: msg })}\n\n`)
        )
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
