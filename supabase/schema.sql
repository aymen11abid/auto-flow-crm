-- Auto-Flow CRM: Tabelle für Werkstattaufträge
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE auftrag_status AS ENUM (
  'neu',
  'in_bearbeitung',
  'warten_auf_freigabe',
  'abgeschlossen',
  'eskalation_rueckruf'
);

CREATE TABLE auftraege (
  id                    UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  kunden_name           TEXT          NOT NULL,
  kunden_telefonnummer  TEXT          NOT NULL,
  fahrzeug              TEXT          NOT NULL,
  problem_beschreibung  TEXT          NOT NULL,
  status                auftrag_status NOT NULL DEFAULT 'neu',
  foto_url              TEXT,
  erstellt_am           TIMESTAMPTZ   NOT NULL DEFAULT now()
);

-- Index für schnelle Statusabfragen
CREATE INDEX idx_auftraege_status ON auftraege (status);

-- Row Level Security aktivieren
ALTER TABLE auftraege ENABLE ROW LEVEL SECURITY;

-- Policy: alle authentifizierten Nutzer dürfen lesen und schreiben
CREATE POLICY "Authenticated users full access"
  ON auftraege
  FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);
