-- Ronde 4: kluis (gezien), spelerskeuze als beloning, doelen en geplande toetsen, draft op de server,
-- configureerbare deadline voor asynchrone wedstrijden (standaard 48 uur).

-- Kaartinstanties: extra herkomst 'reward' (spelerskeuze uit de kluis). SQLite kan een CHECK niet wijzigen,
-- dus de tabel wordt opnieuw opgebouwd (er verwijst geen foreign key naar deze tabel).
CREATE TABLE card_instances_new (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  card_def_id TEXT NOT NULL,
  catalog_version TEXT NOT NULL,
  acquired_via TEXT NOT NULL CHECK (acquired_via IN ('starter', 'pack', 'reward')),
  source_ref TEXT NOT NULL,
  acquired_at INTEGER NOT NULL
);
INSERT INTO card_instances_new (id, user_id, card_def_id, catalog_version, acquired_via, source_ref, acquired_at)
  SELECT id, user_id, card_def_id, catalog_version, acquired_via, source_ref, acquired_at FROM card_instances;
DROP TABLE card_instances;
ALTER TABLE card_instances_new RENAME TO card_instances;
CREATE INDEX idx_cards_user ON card_instances(user_id);
-- Een spelerskeuze uit een beloning wordt precies één keer uitgereikt.
CREATE UNIQUE INDEX idx_cards_reward_once ON card_instances(source_ref) WHERE acquired_via = 'reward';

-- Kluis: een beloning is "nieuw" tot de leerling hem heeft geopend.
ALTER TABLE reward_grants ADD COLUMN seen_at INTEGER;

CREATE TABLE goals (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  scope TEXT NOT NULL CHECK (scope IN ('subject', 'overall')),
  subject_id TEXT,
  target REAL NOT NULL CHECK (target >= 1 AND target <= 10),
  created_at INTEGER NOT NULL,
  deleted_at INTEGER
);
CREATE INDEX idx_goals_user ON goals(user_id, deleted_at);

CREATE TABLE upcoming_tests (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject_id TEXT NOT NULL,
  name TEXT NOT NULL,
  date TEXT NOT NULL,
  weight REAL NOT NULL CHECK (weight > 0 AND weight <= 10),
  created_at INTEGER NOT NULL,
  deleted_at INTEGER
);
CREATE INDEX idx_upcoming_user ON upcoming_tests(user_id, deleted_at);

-- Draft: de server trekt de aanbiedingen (seed in de audit); één actieve draft per speler.
CREATE TABLE draft_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_id TEXT NOT NULL,
  seed TEXT NOT NULL,
  session_json TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('active', 'finished')),
  created_at INTEGER NOT NULL,
  finished_at INTEGER
);
CREATE UNIQUE INDEX idx_draft_one_active ON draft_sessions(user_id) WHERE status = 'active';

CREATE TABLE draft_pity (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  event_id TEXT NOT NULL,
  pity_json TEXT NOT NULL,
  PRIMARY KEY (user_id, event_id)
);

-- Asynchrone wedstrijden: deadline per zet én voor het accepteren (uren). Live blijft 30 seconden per zet.
ALTER TABLE matches ADD COLUMN deadline_hours INTEGER NOT NULL DEFAULT 48;

-- Elftal: formatie en reservebank bewaren (de 11 basisspelers staan in card_ids_json in formatievolgorde).
ALTER TABLE lineups ADD COLUMN formation_id TEXT NOT NULL DEFAULT '4-3-3';
ALTER TABLE lineups ADD COLUMN bench_json TEXT NOT NULL DEFAULT '[]';
