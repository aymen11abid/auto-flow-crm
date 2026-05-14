CREATE TABLE IF NOT EXISTS status_anfragen (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  werkstatt_id UUID NOT NULL,
  telefonnummer TEXT NOT NULL,
  erstellt_am  TIMESTAMPTZ DEFAULT now() NOT NULL,
  bearbeitet   BOOLEAN DEFAULT false NOT NULL
);

ALTER TABLE status_anfragen ENABLE ROW LEVEL SECURITY;
CREATE POLICY "all_access" ON status_anfragen FOR ALL USING (true) WITH CHECK (true);
