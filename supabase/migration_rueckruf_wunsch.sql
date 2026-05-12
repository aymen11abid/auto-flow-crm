ALTER TABLE auftraege
  ADD COLUMN IF NOT EXISTS rueckruf_wunsch TEXT
    CHECK (rueckruf_wunsch IN ('vormittags', 'nachmittags', 'egal'));
