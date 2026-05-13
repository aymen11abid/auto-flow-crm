CREATE TABLE IF NOT EXISTS kommentare (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  auftrag_id  UUID NOT NULL REFERENCES auftraege(id) ON DELETE CASCADE,
  text        TEXT NOT NULL,
  erstellt_am TIMESTAMPTZ DEFAULT now() NOT NULL
);

ALTER TABLE kommentare ENABLE ROW LEVEL SECURITY;
CREATE POLICY "all_access" ON kommentare FOR ALL USING (true) WITH CHECK (true);
