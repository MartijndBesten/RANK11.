-- XP-grootboek van de motivatie-engine (Prestatie, Vooruitgang, Academy). Zelfde regels als de web-app:
-- idempotente sleutel per speler, plafonds per dag/week, correcties als verschil, verwijderen als negatieve regel.
-- XP staat hier en niet meer in wallet_ledger; oude 'xp'-regels in wallet_ledger blijven leesbaar maar tellen niet mee.
CREATE TABLE xp_ledger (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('performance', 'progress', 'academy')),
  xp INTEGER NOT NULL,
  label TEXT NOT NULL,
  date TEXT NOT NULL,
  source_kind TEXT NOT NULL,
  source_id TEXT NOT NULL,
  config_version TEXT NOT NULL,
  capped_by INTEGER,
  pack_id TEXT,
  created_at INTEGER NOT NULL,
  UNIQUE (user_id, key)
);
CREATE INDEX idx_xp_ledger_user ON xp_ledger(user_id, date);
