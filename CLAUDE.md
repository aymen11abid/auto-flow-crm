@AGENTS.md
# Voxaro — Claude Code Projektgedächtnis

## Projekt
Voxaro (ehemals Auto-Flow CRM) ist ein B2B SaaS für Kfz-Werkstätten.
KI-Telefon-Agent "Samir" nimmt Anrufe entgegen → Aufträge landen automatisch im Dashboard.
Pilotekunde: Auto Malik, Darmstadt.

Live: https://voxaro.vercel.app
GitHub: github.com/aymen11abid/auto-flow-crm

## Stack
- Frontend: Next.js 14 + TypeScript + Tailwind CSS
- Datenbank: Supabase (Frankfurt) + RLS
- Telefon-KI: Vapi.ai (Assistent "Samir")
- SMS/Telefon: Twilio
- Deployment: Vercel

## Wichtige IDs
- Aymen werkstatt_id: 090c89e7-3476-4a1f-940e-904268e12d57
- Malik werkstatt_id: e558c2d1-e841-41f1-8b13-fe84bba5c608
- Maliks Twilio Nummer: +18065157248
- Supabase Projekt: monhkdaekgertmusacyv

## Offene Tickets
- ⏳ #2 SMS Freigabe-Seite
- ⏳ #3 Foto-Upload
- ⏳ #4 Eskalations-Logik verbessern

## Agent-Routing — PFLICHT
Analysiere bei JEDER Nachricht den Kontext und rufe automatisch den passenden Agent auf.
Kein Agent wird ohne konkreten Grund gewechselt.
Die Reihenfolge der Agenten spielt keine Rolle — wichtig ist dass einer aufgerufen wird.
Wenn kein passender Agent existiert → Aymen fragen damit ein neuer Agent angelegt wird.
NIE Code schreiben oder Konfiguration ändern ohne vorher den passenden Agent aufgerufen zu haben.

### Wann welcher Agent:

**project-manager** → aufrufen wenn:
- Gefragt wird was diese Woche zu tun ist
- Ticket-Status oder Prioritäten besprochen werden
- Planung, Deadlines oder nächste Schritte gefragt werden
- Beispiel: "Was machen wir als nächstes?" / "Was ist noch offen?"

**product-manager** → aufrufen wenn:
- Ein neues Feature diskutiert wird
- Gefragt wird ob etwas gebaut werden soll oder nicht
- Pricing, Pakete oder Kundenwert besprochen werden
- Beispiel: "Sollen wir X bauen?" / "Welches Paket bekommt dieses Feature?"

**architect** → aufrufen wenn:
- Eine neue Funktion technisch geplant wird
- Datenbankschema geändert werden soll
- API-Struktur oder Datenfluss besprochen wird
- Beispiel: "Wie bauen wir X?" / "Was muss in der DB geändert werden?"
- IMMER vor dem dev Agent aufrufen wenn etwas Neues gebaut wird

**dev** → aufrufen wenn:
- Code geschrieben, geändert oder gefixt werden soll
- Ein Ticket explizit gebaut werden soll ("Baue Ticket #X")
- Ein Bug gemeldet wird
- Beispiel: "Baue Ticket #2" / "Fix den Webhook" / "Warum funktioniert X nicht?"

**sales** → aufrufen wenn:
- Ein Gespräch mit einem neuen Kunden vorbereitet wird
- Einwände behandelt werden sollen
- Kaltakquise oder Demo vorbereitet wird
- Beispiel: "Ich treffe morgen eine neue Werkstatt" / "Was sage ich wenn der Preis zu hoch ist?"

**onboarding** → aufrufen wenn:
- Eine neue Werkstatt eingerichtet werden soll
- Twilio, Vapi, Supabase für einen neuen Kunden konfiguriert wird
- Beispiel: "Neuer Kunde kommt" / "Werkstatt X soll live gehen"

**vapi** → aufrufen wenn:
- Webhook nicht funktioniert oder keine Daten ankommen
- Structured Outputs fehlen oder falsch sind
- Samir konfiguriert oder System Prompt geändert wird
- Neue Telefonnummer eingerichtet wird
- Vapi SDK im Code verwendet wird
- Beispiel: "Samir antwortet nicht richtig" / "Webhook bekommt keine Daten"

**ceo** → aufrufen wenn:
- Nicht klar ist was jetzt Priorität hat
- Strategische Entscheidung ansteht
- Gefühl dass zu viel gebaut und zu wenig verkauft wird
- Beispiel: "Was soll ich diese Woche fokussieren?" / "Ist das jetzt wichtig?"

### Kombinationen die oft vorkommen:
- "Baue Ticket #X" → architect zuerst → dann dev
- "Neuer Kunde" → onboarding + sales zusammen
- "Was bauen wir diese Woche?" → project-manager + product-manager

## Coding-Regeln
- TypeScript immer — kein any
- Supabase-Queries immer mit Error-Handling
- Console.logs mit [voxaro] Prefix
- Keine Breaking Changes ohne Migration-Plan
- Neue API-Routes unter app/api/
- Neue Pages unter app/[route]/page.tsx
- Bei Schema-Änderungen: SQL Migration als Kommentar in der Datei

## Wichtigste Regel — Tickets
Kein Ticket wird gebaut bis Aymen explizit sagt: "Baue Ticket #X"
Vorher nur planen, erklären und warten.

