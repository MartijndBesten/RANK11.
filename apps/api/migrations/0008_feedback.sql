-- Feedback van testgebruikers: "werkt niet", "onduidelijk" of "idee". Bewust minimaal: geen extra
-- persoonsgegevens; alleen de koppeling naar het account (voor opvolging) en een vrij tekstveld.
-- Bij verwijderen van een account vervalt de koppeling (de melding blijft anoniem bewaard).
CREATE TABLE feedback (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  kind TEXT NOT NULL CHECK (kind IN ('werkt-niet', 'onduidelijk', 'idee')),
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'nieuw' CHECK (status IN ('nieuw', 'bekeken', 'afgehandeld')),
  context TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX idx_feedback_status ON feedback (status, created_at);
