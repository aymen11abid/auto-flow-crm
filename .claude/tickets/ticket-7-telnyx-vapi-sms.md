# Ticket #7 — Telnyx: Vapi-Konfiguration + SMS-Migration von Twilio

**Status:** ⏳ Offen  
**Priorität:** Hoch (blockiert Malik-Onboarding)  
**Zeitschätzung:** ~2h

---

## Ziel

Deutsche Telnyx-Nummer (Darmstadt, 06151) in Vapi einbinden (Voice) und SMS-Versand von Twilio auf Telnyx umstellen.

---

## Nummernkauf — Strategie (aktualisiert)

### Skalierungs-Entscheidung: Nationale Nummern statt Lokal

**Problem mit lokalen Nummern:** Adresse muss zur Vorwahl passen (06151 = Darmstadt, 089 = München etc.)  
→ Für jeden neuen Kunden in einer anderen Stadt wäre ein separater Adressnachweis nötig. Nicht skalierbar.

**Lösung: Nationale Nummern (032-Vorwahl)**
- Adresse muss nur irgendwo in Deutschland sein — KEIN Ortsgebundenheits-Pflicht
- Einmalig Requirement Group mit Gewerbeschein (Einzelunternehmen) anlegen
- Dann für jeden neuen Kunden sofort Nummer kaufen, egal in welcher Stadt

### Requirement Group (einmalig)
- Dokumente: Gewerbeschein (Einzelunternehmen) + Personalausweis/Reisepass
- Adresse: eigene Geschäftsadresse (beliebige deutsche Adresse)
- Gilt danach für alle weiteren nationalen Nummern → kein erneuter Aufwand

### Kauf-Einstellungen in Telnyx
- Country: Germany +49
- **Type: National** (nicht Local)
- Requirement Group: eigene (mit Gewerbeschein)
- Quickship: nicht verfügbar für deutsche Nummern (nur US Toll-Free)
- Aktivierung: ~72h nach Dokumentenprüfung.

---

## Teil 1 — Telnyx Nummer in Vapi importieren (Voice)

**Voraussetzung:** Telnyx-Nummer wurde gekauft und ist aktiv (~72h nach Adressnachweis)

### Schritt 1: Telnyx API Key holen
1. Telnyx Dashboard → oben rechts → **API Keys**
2. Neuen Key erstellen: Name "Vapi Import"
3. Key kopieren (wird nur einmal angezeigt)

### Schritt 2: Nummer in Vapi importieren
1. Vapi Dashboard → **Phone Numbers** → "**Import**"
2. Provider: **Telnyx** auswählen
3. Telnyx API Key einfügen → **Connect**
4. Nummer aus der Liste auswählen (die neue +49-Nummer)
5. **Import** klicken

### Schritt 3: Nummer dem Assistenten zuweisen
1. Importierte Nummer anklicken
2. "**Assign Assistant**" → "**Samir [Malik]**" wählen
3. Speichern

### Schritt 4: Test-Anruf
1. Mit eigenem Handy die +49-Nummer anrufen
2. Samir antwortet → Auftrag landet in Supabase?
3. ✅ Fertig

---

## Teil 2 — SMS-Migration: Twilio → Telnyx

### Aktueller Stand
`app/api/send-sms/route.ts` nutzt Twilio SDK mit diesen Env-Vars:
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_FROM_NUMBER` (Twilio-Nummer)

### Wichtige Einschränkung: Deutsche Nummern können kein SMS
Die gekaufte Telnyx-Nummer (+49 Festnetz) kann **kein SMS senden**.  
Lösung: **Alphanumeric Sender ID** → SMS kommen an mit Absender `Voxaro` statt einer Nummer.

**Vorteil für Kunden:** Sie sehen niemals die +49-Nummer (weder alt noch neu).  
Absender erscheint als: `Voxaro` — klar, professionell, keine Verwirrung durch unbekannte Nummern.  
In Deutschland keine Registrierung nötig.

### Schritt 1: Telnyx Messaging Profile anlegen
1. Telnyx Dashboard → **Messaging** → "**Messaging Profiles**"
2. "Create Profile" → Name: "Voxaro SMS"
3. Unter **Alphanumeric Sender** → aktivieren → Sender Name: `Voxaro`
4. Profile ID kopieren

### Schritt 2: send-sms/route.ts umschreiben

**Aktuell (Twilio):**
```typescript
import twilio from 'twilio'
const client = twilio(process.env.TWILIO_ACCOUNT_SID!, process.env.TWILIO_AUTH_TOKEN!)
await client.messages.create({ body: text, from: process.env.TWILIO_FROM_NUMBER!, to: telefonnummer })
```

**Neu (Telnyx):**
```typescript
const response = await fetch('https://api.telnyx.com/v2/messages', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.TELNYX_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    from: process.env.TELNYX_FROM,   // "Voxaro" (Alphanumeric)
    to: telefonnummer,
    text: text,
    messaging_profile_id: process.env.TELNYX_MESSAGING_PROFILE_ID,
  }),
})
const data = await response.json()
if (!response.ok) throw new Error(data?.errors?.[0]?.detail ?? 'Telnyx SMS Fehler')
return NextResponse.json({ success: true, id: data.data?.id })
```

### Schritt 3: Env-Vars in Vercel aktualisieren

**Neue Vars hinzufügen:**
| Variable | Wert |
|----------|------|
| `TELNYX_API_KEY` | API Key aus Telnyx Dashboard |
| `TELNYX_FROM` | `Voxaro` |
| `TELNYX_MESSAGING_PROFILE_ID` | ID aus Schritt 1 |

**Alte Vars können danach entfernt werden:**
- `TWILIO_ACCOUNT_SID`
- `TWILIO_AUTH_TOKEN`
- `TWILIO_FROM_NUMBER`

### Schritt 4: twilio Package entfernen
```bash
npm uninstall twilio
```

### Schritt 5: Test
1. Auftrag öffnen → Zusatzarbeit anfragen → SMS schicken
2. SMS kommt an mit Absender "Voxaro"
3. Freigabe-Link öffnet korrekt → ✅ Fertig

---

## Code-Änderungen im Überblick

| Datei | Änderung |
|-------|----------|
| `app/api/send-sms/route.ts` | Twilio durch Telnyx fetch ersetzen |
| `package.json` | `twilio` dependency entfernen |
| Vercel → Env Vars | 3 Telnyx-Vars hinzufügen, 3 Twilio-Vars entfernen |

---

## Abhängigkeiten

- Telnyx-Nummer muss aktiv sein (Teil 1)
- Messaging Profile in Telnyx muss angelegt sein (Teil 2 Schritt 1)
- Vercel Env Vars müssen gesetzt sein vor Deploy

---

## Referenzen
- [Telnyx Messaging API Docs](https://developers.telnyx.com/docs/messaging)
- [Germany SMS Guidelines](https://support.telnyx.com/en/articles/6670869-germany-sms-guidelines)
- Onboarding Agent: `.claude/agents/onboarding.md` (Schritt 2.3 + 2.6)
