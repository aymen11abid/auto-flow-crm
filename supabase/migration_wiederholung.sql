-- Rückrufer-Erkennung: markiert ob der Kunde bereits früher angerufen hat
ALTER TABLE auftraege
  ADD COLUMN IF NOT EXISTS ist_wiederholung BOOLEAN NOT NULL DEFAULT FALSE;
