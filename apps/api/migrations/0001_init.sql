-- RANK11. API: eerste schema (D1 / SQLite).
-- Principes: saldi = som van grootboekregels; status afleiden uit gegevens; tokens en
-- uitnodigingscodes alleen als SHA-256-hash; geen e-mail of geboortedatum.

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  username_norm TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'player' CHECK (role IN ('player', 'platform_admin')),
  created_at INTEGER NOT NULL
);

CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX idx_sessions_user ON sessions(user_id);

-- Rate limiting op inloggen: emmers per gehashte gebruikersnaam en per gehasht IP.
CREATE TABLE login_attempts (
  bucket TEXT PRIMARY KEY,
  window_start INTEGER NOT NULL,
  failures INTEGER NOT NULL
);

CREATE TABLE platform_invites (
  id TEXT PRIMARY KEY,
  code_hash TEXT NOT NULL UNIQUE,
  expires_at INTEGER NOT NULL,
  max_uses INTEGER NOT NULL CHECK (max_uses > 0),
  uses INTEGER NOT NULL DEFAULT 0 CHECK (uses <= max_uses),
  note TEXT,
  created_at INTEGER NOT NULL
);

CREATE TABLE clubs (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  short TEXT NOT NULL,
  crest_json TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE pools (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  max_members INTEGER NOT NULL DEFAULT 20 CHECK (max_members >= 2),
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at INTEGER NOT NULL
);

CREATE TABLE pool_members (
  pool_id TEXT NOT NULL REFERENCES pools(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'member')),
  joined_at INTEGER NOT NULL,
  PRIMARY KEY (pool_id, user_id)
);
CREATE INDEX idx_pool_members_user ON pool_members(user_id);

-- Ledenlimiet per pool, ook bij gelijktijdige aanmeldingen.
CREATE TRIGGER pool_members_limit
BEFORE INSERT ON pool_members
WHEN (SELECT COUNT(*) FROM pool_members WHERE pool_id = NEW.pool_id) >= (SELECT max_members FROM pools WHERE id = NEW.pool_id)
BEGIN
  SELECT RAISE(ABORT, 'pool_full');
END;

CREATE TABLE pool_invites (
  id TEXT PRIMARY KEY,
  pool_id TEXT NOT NULL REFERENCES pools(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL UNIQUE,
  expires_at INTEGER NOT NULL,
  max_uses INTEGER NOT NULL CHECK (max_uses > 0),
  -- CHECK: een gelijktijdige extra inwisseling breekt de hele batch af.
  uses INTEGER NOT NULL DEFAULT 0 CHECK (uses <= max_uses),
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at INTEGER NOT NULL,
  revoked_at INTEGER
);
CREATE INDEX idx_pool_invites_pool ON pool_invites(pool_id);

CREATE TABLE competitions (
  id TEXT PRIMARY KEY,
  pool_id TEXT NOT NULL REFERENCES pools(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  format TEXT NOT NULL CHECK (format IN ('round_robin')),
  double_round INTEGER NOT NULL DEFAULT 0,
  unplayed_rule TEXT NOT NULL CHECK (unplayed_rule IN ('double-forfeit', 'void')),
  participants_json TEXT NOT NULL,
  league_config_json TEXT NOT NULL,
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_competitions_pool ON competitions(pool_id);

CREATE TABLE competition_fixtures (
  id TEXT PRIMARY KEY,
  competition_id TEXT NOT NULL REFERENCES competitions(id) ON DELETE CASCADE,
  round INTEGER NOT NULL,
  home_user_id TEXT NOT NULL REFERENCES users(id),
  away_user_id TEXT NOT NULL REFERENCES users(id),
  opens_at INTEGER NOT NULL,
  deadline INTEGER NOT NULL
);
CREATE INDEX idx_fixtures_competition ON competition_fixtures(competition_id);

-- Wedstrijden: metadata en uitslag. De eventlog zelf staat in de Durable Object (MatchDO).
CREATE TABLE matches (
  id TEXT PRIMARY KEY,
  pool_id TEXT NOT NULL REFERENCES pools(id) ON DELETE CASCADE,
  fixture_id TEXT REFERENCES competition_fixtures(id),
  home_user_id TEXT NOT NULL REFERENCES users(id),
  away_user_id TEXT NOT NULL REFERENCES users(id),
  challenger_id TEXT NOT NULL REFERENCES users(id),
  status TEXT NOT NULL CHECK (status IN ('pending', 'active', 'finished', 'declined')),
  timing TEXT NOT NULL CHECK (timing IN ('live', 'async')),
  config_version TEXT NOT NULL,
  home_lineup_json TEXT,
  away_lineup_json TEXT,
  home_goals INTEGER,
  away_goals INTEGER,
  winner_user_id TEXT,
  forfeit_by TEXT,
  decided_early INTEGER,
  created_at INTEGER NOT NULL,
  accepted_at INTEGER,
  finished_at INTEGER
);
CREATE INDEX idx_matches_pool ON matches(pool_id, status);
CREATE UNIQUE INDEX idx_matches_fixture_once ON matches(fixture_id)
  WHERE fixture_id IS NOT NULL AND status IN ('pending', 'active', 'finished');

-- Cijfers: alleen zichtbaar voor de leerling zelf. Status 'self' = zelf ingevoerd.
CREATE TABLE grades (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject_id TEXT NOT NULL,
  test_name TEXT NOT NULL,
  value REAL NOT NULL,
  weight REAL NOT NULL,
  date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'self' CHECK (status IN ('self', 'confirmed')),
  source TEXT NOT NULL DEFAULT 'manual',
  external_ref TEXT,
  dedupe_key TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  deleted_at INTEGER
);
CREATE UNIQUE INDEX idx_grades_dedupe_active ON grades(user_id, dedupe_key) WHERE deleted_at IS NULL;
CREATE INDEX idx_grades_user ON grades(user_id, deleted_at);

CREATE TABLE grade_history (
  id TEXT PRIMARY KEY,
  grade_id TEXT NOT NULL REFERENCES grades(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('create', 'correct', 'delete')),
  before_json TEXT,
  after_json TEXT,
  at INTEGER NOT NULL
);
CREATE INDEX idx_grade_history_grade ON grade_history(grade_id);

-- Toegekende beloningen: per toets-sleutel één eerste toekenning; correcties als aparte regels.
CREATE TABLE reward_grants (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  dedupe_key TEXT NOT NULL,
  grade_id TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('initial', 'correction')),
  status TEXT NOT NULL,
  tier_id TEXT,
  xp INTEGER NOT NULL,
  coins INTEGER NOT NULL,
  vouchers INTEGER NOT NULL,
  pack_id TEXT,
  result_json TEXT NOT NULL,
  config_version TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE UNIQUE INDEX idx_reward_initial_once ON reward_grants(user_id, dedupe_key) WHERE kind = 'initial';
CREATE INDEX idx_reward_user_time ON reward_grants(user_id, created_at);

-- Grootboek: saldo = som van delta's. Nooit een los saldo opslaan.
CREATE TABLE wallet_ledger (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  currency TEXT NOT NULL CHECK (currency IN ('coins', 'xp', 'vouchers')),
  delta INTEGER NOT NULL,
  reason TEXT NOT NULL,
  ref TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  UNIQUE (user_id, currency, ref)
);
CREATE INDEX idx_ledger_user ON wallet_ledger(user_id, currency);

-- Geen negatief saldo: een afschrijving die het saldo onder 0 brengt, breekt de hele batch af.
CREATE TRIGGER wallet_no_negative
BEFORE INSERT ON wallet_ledger
WHEN NEW.delta < 0 AND (
  SELECT COALESCE(SUM(delta), 0) FROM wallet_ledger WHERE user_id = NEW.user_id AND currency = NEW.currency
) + NEW.delta < 0
BEGIN
  SELECT RAISE(ABORT, 'insufficient_funds');
END;

CREATE TABLE card_instances (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  card_def_id TEXT NOT NULL,
  catalog_version TEXT NOT NULL,
  acquired_via TEXT NOT NULL CHECK (acquired_via IN ('starter', 'pack')),
  source_ref TEXT NOT NULL,
  acquired_at INTEGER NOT NULL
);
CREATE INDEX idx_cards_user ON card_instances(user_id);

CREATE TABLE lineups (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  card_ids_json TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

-- Eenmalig startelftal per account (seed in de audit).
CREATE TABLE starter_grants (
  user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  seed TEXT NOT NULL,
  catalog_version TEXT NOT NULL,
  created_at INTEGER NOT NULL
);

-- Ongeopende packs (uit beloningen of de winkel).
CREATE TABLE pack_grants (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pack_id TEXT NOT NULL,
  source TEXT NOT NULL CHECK (source IN ('reward', 'shop')),
  source_ref TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  UNIQUE (user_id, source, source_ref)
);

-- Pack-openingen met seed (reproduceerbaar). UNIQUE(grant_id): een pack opent precies één keer.
CREATE TABLE pack_opens (
  id TEXT PRIMARY KEY,
  grant_id TEXT NOT NULL UNIQUE REFERENCES pack_grants(id),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pack_id TEXT NOT NULL,
  seed TEXT NOT NULL,
  catalog_version TEXT NOT NULL,
  results_json TEXT NOT NULL,
  opened_at INTEGER NOT NULL
);

-- Idempotentiesleutels op muterende endpoints: zelfde sleutel = zelfde antwoord.
CREATE TABLE idempotency_keys (
  user_id TEXT NOT NULL,
  key TEXT NOT NULL,
  request_hash TEXT NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('pending', 'done')),
  response_status INTEGER,
  response_body TEXT,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, key)
);

CREATE TABLE audit_log (
  id TEXT PRIMARY KEY,
  actor_id TEXT,
  action TEXT NOT NULL,
  object TEXT,
  detail_json TEXT,
  at INTEGER NOT NULL
);
CREATE INDEX idx_audit_time ON audit_log(at);
