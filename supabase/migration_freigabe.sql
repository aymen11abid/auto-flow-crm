-- Phase 3: Freigabe-Flow Spalten
ALTER TABLE auftraege
  ADD COLUMN IF NOT EXISTS freigabe_token       TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS freigabe_beschreibung TEXT,
  ADD COLUMN IF NOT EXISTS freigabe_foto_url     TEXT,
  ADD COLUMN IF NOT EXISTS freigabe_betrag       NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS freigabe_angefragt_am TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS freigabe_ergebnis     TEXT
    CHECK (freigabe_ergebnis IN ('approved', 'rejected'));

-- Falls RLS aktiv: anonyme Leseberechtigung fuer den Freigabe-Link
-- (nur Zeilen die einen freigabe_token haben)
-- CREATE POLICY "freigabe_public_read" ON auftraege
--   FOR SELECT TO anon
--   USING (freigabe_token IS NOT NULL);
