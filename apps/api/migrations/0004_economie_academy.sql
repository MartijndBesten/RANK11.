-- Ronde 4b: eerlijkere economie (voortgangsbeloningen, V-011) en de RANK Academy-oefenmodule op de server (V-016).

-- Voortgangsbeloningen (doel, verbetering, herstel, topcijfer, Academy-mijlpaal): idempotent per sleutel.
CREATE TABLE progress_grants (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('goal', 'improvement', 'recovery', 'personalBest', 'academy')),
  label TEXT NOT NULL,
  pack_id TEXT,
  vouchers INTEGER NOT NULL,
  coins INTEGER NOT NULL,
  capped_vouchers INTEGER NOT NULL DEFAULT 0,
  date TEXT NOT NULL,
  subject_id TEXT,
  config_version TEXT NOT NULL,
  /** Waar de beloning uit voortkwam (cijfer of oefensessie), voor de kluis. */
  source_kind TEXT NOT NULL CHECK (source_kind IN ('grade', 'practice')),
  source_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  UNIQUE (user_id, key)
);
CREATE INDEX idx_progress_user ON progress_grants(user_id, created_at);

-- pack_grants: extra bron 'progress'. Tabel opnieuw opbouwen (CHECK); pack_opens verwijst ernaar, dus
-- foreign keys tijdelijk via een kopie zonder de verwijzing te breken (zelfde id's).
PRAGMA defer_foreign_keys = true;
CREATE TABLE pack_grants_new (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pack_id TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('reward', 'shop', 'progress')),
  source_ref TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  UNIQUE (user_id, source, source_ref)
);
INSERT INTO pack_grants_new (id, user_id, pack_id, source, source_ref, created_at) SELECT id, user_id, pack_id, source, source_ref, created_at FROM pack_grants;
DROP TABLE pack_grants;
ALTER TABLE pack_grants_new RENAME TO pack_grants;

-- Oefensessies: de server bewaart de vragen mét antwoorden en kijkt zelf na. Eén keer inleveren.
CREATE TABLE practice_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject_id TEXT NOT NULL,
  topic TEXT,
  session_json TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('open', 'submitted', 'abandoned')),
  created_at INTEGER NOT NULL,
  submitted_at INTEGER
);
CREATE INDEX idx_practice_user ON practice_sessions(user_id, created_at);

-- Leerstatus per vraag (herhaling met groeiende tussenpozen).
CREATE TABLE practice_items (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL,
  state_json TEXT NOT NULL,
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, item_id)
);

-- Leerevents (intern of later van een gekoppelde leeromgeving) met de beloningsbeslissing.
CREATE TABLE academy_events (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider_id TEXT NOT NULL,
  event_id TEXT NOT NULL,
  event_json TEXT NOT NULL,
  decision TEXT NOT NULL,
  xp INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  UNIQUE (provider_id, event_id)
);
CREATE INDEX idx_academy_user ON academy_events(user_id, created_at);
