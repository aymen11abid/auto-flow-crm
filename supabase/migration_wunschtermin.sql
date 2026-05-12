ALTER TABLE auftraege
  ADD COLUMN IF NOT EXISTS wunschtermin_tag  TEXT,
  ADD COLUMN IF NOT EXISTS wunschtermin_zeit TEXT
    CHECK (wunschtermin_zeit IN ('vormittags', 'nachmittags', 'egal'));
