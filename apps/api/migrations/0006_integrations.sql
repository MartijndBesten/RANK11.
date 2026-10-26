-- Ronde 6: koppelingen met externe cijferbronnen (provider-architectuur). Tokens versleuteld; nooit naar de client.
-- De echte Magister-synchronisatie is NIET geactiveerd: dat vraagt een officieel toegestane route (school/partner).

CREATE TABLE integration_links (
  user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider     TEXT NOT NULL,
  external_id  TEXT,                 -- bijv. persoonId uit de bron; niet hardcoded, opgeslagen bij het koppelen
  display_name TEXT,
  status       TEXT NOT NULL DEFAULT 'linked' CHECK (status IN ('linked', 'reauth', 'error')),
  token_enc    TEXT,                 -- AES-GCM versleuteld refresh/sessietoken; alleen server-side
  last_sync_at INTEGER,
  last_error   TEXT,
  created_at   INTEGER NOT NULL,
  updated_at   INTEGER NOT NULL,
  PRIMARY KEY (user_id, provider)
);
