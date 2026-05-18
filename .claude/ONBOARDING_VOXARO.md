# Voxaro — Onboarding Neue Werkstatt
**Version:** Mai 2026 · Ziel: Neue Werkstatt in 30 Minuten live

---

## VORHER ERFASSEN — Kundendaten (vor dem Termin)

| Feld | Wert |
|------|------|
| Werkstatt-Name | |
| Name des Meisters | |
| E-Mail (für Dashboard) | |
| Handynummer Meister | |
| Öffnungszeiten | |
| Leistungen (z.B. Inspektion, Ölwechsel…) | |
| Assistenten-Name (z.B. "Samir") | |
| Gewünschte Stadt für Telnyx-Nummer | |

---

## SCHRITT 1 — Telnyx-Nummer kaufen *(vor dem Termin!)*

> ⚠️ Die Nummer muss genehmigt sein BEVOR der Termin stattfindet. Pending = Blocker.

1. Telnyx Dashboard → **Numbers → Search & Buy**
2. Land: Deutschland (+49), Stadt nach Kundenwunsch
3. Nummer kaufen ($1 einmalig + $1/Monat)
4. Requirement Group befüllen: Gewerbeschein + Personalausweis hochladen
5. Auf Genehmigung warten (1–5 Werktage)

**Nummer notieren:** `+49 ___________________`

---

## SCHRITT 2 — Supabase Setup *(10 Min)*

### 2.1 Werkstatt anlegen

Supabase Dashboard → **Table Editor → `werkstaetten`** → Insert Row:

```
name:          "[Werkstatt-Name]"
twilio_nummer: "+49XXXXXXXXXX"   ← Telnyx-Nummer aus Schritt 1
```

- [ ] Zeile gespeichert
- [ ] **UUID kopieren** → wird in Schritt 2.2 gebraucht

**UUID:** `________________________________________`

---

### 2.2 Dashboard-User anlegen

Supabase → **Authentication → Users → Add User**:

```
Email:    [Kunden-Email]
Password: [sicheres Passwort, min. 12 Zeichen]
```

Danach: User anklicken → **Edit User → Raw User Meta Data**:

```json
{
  "werkstatt_id": "[UUID aus Schritt 2.1]"
}
```

- [ ] User angelegt
- [ ] werkstatt_id in Metadata gesetzt

---

### 2.3 Realtime aktivieren

Supabase → **Database → Publications → supabase_realtime**:

- [ ] Tabelle `auftraege` aktiviert ✓

> Ohne diesen Schritt erscheint kein Live-Alert im Dashboard bei Eskalationen.

---

## SCHRITT 3 — Vapi Setup *(10 Min)*

### 3.1 Assistenten duplizieren

1. Vapi Dashboard → **Assistants → "Samir [Malik]"**
2. Oben rechts → **"Duplicate"**
3. Umbenennen: `"Samir [Werkstatt-Name]"`

- [ ] Assistent dupliziert

---

### 3.2 System-Prompt anpassen

Im neuen Assistenten folgende Stellen anpassen:

| Was | Wert |
|-----|------|
| `werkstatt_name` | z.B. "Autohaus Müller" |
| `angerufene_nummer` | Telnyx-Nummer aus Schritt 1 |
| Öffnungszeiten | Kundendaten eintragen |
| Leistungen | Kundendaten eintragen |
| Assistenten-Name | z.B. "Samir" oder Kundenwunsch |

- [ ] Prompt angepasst und gespeichert

---

### 3.3 Telnyx-Nummer in Vapi importieren

1. Vapi → **Phone Numbers → Import**
2. Provider: **Telnyx**
3. Telnyx API Key eingeben (einmalig, schon vorhanden wenn schon gemacht)
4. Neue Nummer auswählen → Importieren
5. Nummer → **"Assign to Assistant"** → neuen Samir-Assistenten wählen

- [ ] Nummer importiert
- [ ] Nummer dem richtigen Assistenten zugewiesen

---

## SCHRITT 4 — Rufumleitung beim Kunden *(vor Ort, 5 Min)*

> ⚠️ Das ist der häufigste Punkt wo Onboardings scheitern. Nicht delegieren — vor Ort einrichten!

**Handy (Telekom / Vodafone / O2):**
```
**61*+49XXXXXXXXXX#   → Anruf drücken
```
*(ersetzt +49XXXXXXXXXX durch die Telnyx-Nummer)*

**Festnetz / Fritz!Box:**
- Heimnetz → Telefon → Rufumleitung
- Bedingung: "Bei Besetzt" + "Bei Nichtmeldung"
- Ziel: Telnyx-Nummer eintragen

**Profi-Telefonanlage:**
- IT des Kunden oder Voxaro richtet es ein

- [ ] Rufumleitung aktiv
- [ ] Test: Eigenes Handy → Werkstatt-Nummer anrufen → Samir meldet sich ✓

---

## SCHRITT 5 — Test & Übergabe *(10 Min)*

### 5.1 Test-Anruf

1. Eigenes Handy → Telnyx-Nummer direkt anrufen
2. Samir antwortet → Testauftrag im Dashboard vorhanden?
3. Status auf "Warten auf Freigabe" → SMS-Link an eigenes Handy schicken
4. Foto hochladen → Lightbox testen
5. Eskalation auslösen → roter Alert im Dashboard erscheint?

- [ ] Anruf klappt, Samir antwortet korrekt
- [ ] Auftrag erscheint im Dashboard
- [ ] SMS-Link funktioniert (kein Vercel-Login nötig)
- [ ] Freigabe mit Foto funktioniert
- [ ] Eskalations-Alert im Dashboard sichtbar

---

### 5.2 Dashboard-Walkthrough mit dem Meister *(5 Min)*

Zeigen und erklären:

- [ ] **Auftrag anlegen** — wie funktioniert das manuell
- [ ] **Status ändern** — Neu → In Bearbeitung → Abgeschlossen
- [ ] **Zusatzarbeit anfragen** — Foto machen, Preis eingeben, per SMS senden
- [ ] **Eskalations-Alert** — "Wenn dieser rote Banner erscheint, bitte sofort zurückrufen"
- [ ] **Kunden-Portal** — zeigen was der Kunde per SMS-Link sieht

---

## SCHRITT 6 — Nach dem Onboarding

- [ ] Login-Daten sicher an Kunden übergeben (kein WhatsApp — Email)
- [ ] Kosten notieren: Telnyx $1/Monat + Vapi-Minuten (~$0.05/min)
- [ ] In einer Woche: kurzes Follow-up Gespräch (läuft alles?)
- [ ] Feedback einholen: Was fehlt? Was ist unklar?

---

## SCHNELL-REFERENZ

| Was | Wo | Was eintragen |
|-----|----|---------------|
| Werkstatt-Eintrag | Supabase → `werkstaetten` | name, twilio_nummer |
| User-Account | Supabase → Authentication | email, werkstatt_id in metadata |
| Realtime | Supabase → Publications | auftraege aktivieren |
| Deutsche Nummer | Telnyx Dashboard | kaufen + Requirement Group |
| KI-Assistent | Vapi → Assistants | duplizieren, Prompt anpassen |
| Nummer → Assistent | Vapi → Phone Numbers | importieren + zuweisen |
| Rufumleitung | Kunden-Handy/Festnetz | \*\*61\*+49XXXXXXXXXX# |

---

## KOSTEN PRO KUNDE (Voxaro-intern)

| Position | Kosten |
|----------|--------|
| Telnyx Nummer | $1 einmalig + $1/Monat |
| Vapi Minuten | ~$0.05/min |
| Supabase | kostenlos bis ~500 Werkstätten |
| **Gesamt ca.** | **~$3–8/Monat je nach Anrufvolumen** |

---

## FÜR DEN KUNDEN — Was ist Voxaro? *(A5-Blatt zum Mitnehmen)*

---

**Voxaro — Ihr KI-Assistent für die Werkstatt**

Voxaro übernimmt Anrufe wenn Sie beschäftigt sind.

✓ Samir nimmt Anrufe entgegen und notiert alles automatisch  
✓ Kunden bekommen einen SMS-Link mit dem Status ihres Fahrzeugs  
✓ Zusatzarbeiten genehmigen Kunden per Klick — ohne Anruf  
✓ Sie sehen alles live im Dashboard auf Ihrem Handy oder PC  

**Ihr Dashboard:** https://voxaro.vercel.app  
**Ihre Nummer:** +49 ___________________  
**Support:** aymen11abid@gmail.com  

---

*Erstellt: Mai 2026 — Für interne Nutzung*
