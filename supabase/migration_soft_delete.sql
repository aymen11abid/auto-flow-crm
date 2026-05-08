-- Migration: Soft-Delete Felder für Aufträge
ALTER TABLE auftraege
  ADD COLUMN IF NOT EXISTS geloescht_am  TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS loeschgrund   TEXT;
