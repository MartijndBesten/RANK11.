-- Ronde 5: clubniveau als bron van voortgangsbeloningen (economie v3, 'level') en speluitleg per gebruiker.

-- progress_grants: extra soort 'level'. Tabel opnieuw opbouwen vanwege de CHECK; er verwijst geen andere tabel naar.
CREATE TABLE progress_grants_new (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('goal', 'improvement', 'recovery', 'personalBest', 'academy', 'level')),
  label TEXT NOT NULL,
  pack_id TEXT,
  vouchers INTEGER NOT NULL,
  coins INTEGER NOT NULL,
  capped_vouchers INTEGER NOT NULL DEFAULT 0,
  date TEXT NOT NULL,
  subject_id TEXT,
  config_version TEXT NOT NULL,
  source_kind TEXT NOT NULL CHECK (source_kind IN ('grade', 'practice')),
  source_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  UNIQUE (user_id, key)
);
INSERT INTO progress_grants_new SELECT id, user_id, key, kind, label, pack_id, vouchers, coins, capped_vouchers, date, subject_id, config_version, source_kind, source_id, created_at FROM progress_grants;
DROP TABLE progress_grants;
ALTER TABLE progress_grants_new RENAME TO progress_grants;
CREATE INDEX idx_progress_user ON progress_grants(user_id, created_at);

-- Speluitleg: aan/uit en welke uitleg al gezien is, per gebruiker (ook op een ander toestel).
CREATE TABLE user_settings (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  tips INTEGER NOT NULL DEFAULT 1 CHECK (tips IN (0, 1)),
  tips_seen TEXT NOT NULL DEFAULT '[]',
  updated_at INTEGER NOT NULL
);
