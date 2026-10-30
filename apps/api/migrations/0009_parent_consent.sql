-- Zelfregistratie met ouderlijke toestemming. Bestaande accounts worden 'active' (ongewijzigd, behouden).
-- Een kind onder 16 krijgt status 'pending_parent_approval' tot een ouder per e-mail toestemming geeft;
-- tot die tijd worden er geen spelgegevens (club, elftal) en geen cijfers aangemaakt.
ALTER TABLE users ADD COLUMN status TEXT NOT NULL DEFAULT 'active';   -- active | pending_parent_approval | blocked
ALTER TABLE users ADD COLUMN is_minor INTEGER NOT NULL DEFAULT 0;     -- 1 = jonger dan 16

-- Toestemmingsdossier: minimaal, alleen wat nodig is om toestemming te kunnen aantonen en in te trekken.
CREATE TABLE parent_consents (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  parent_email TEXT NOT NULL,
  token_hash TEXT,                      -- SHA-256 van de actieve eenmalige token; NULL zodra gebruikt/verlopen
  purpose TEXT NOT NULL DEFAULT 'approval', -- approval | revoke
  status TEXT NOT NULL DEFAULT 'pending',   -- pending | granted | declined | revoked
  info_version TEXT NOT NULL,           -- versie van de toestemmingsinformatie
  email_sends INTEGER NOT NULL DEFAULT 0,
  last_sent_at INTEGER,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  decided_at INTEGER,
  decided_ip TEXT
);
CREATE INDEX idx_parent_consents_user ON parent_consents (user_id, purpose);
CREATE INDEX idx_parent_consents_token ON parent_consents (token_hash);
