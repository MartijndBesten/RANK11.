-- Eén toestemmingssysteem voor drie routes (e-mail, ouder/beheerder met koppelcode, QR).
-- Statusvocabulaire gelijkgetrokken en de gebruikte verificatiemethode + de ouder/voogd vastgelegd.
ALTER TABLE parent_consents ADD COLUMN method TEXT;            -- email | admin | qr
ALTER TABLE parent_consents ADD COLUMN claim_code_hash TEXT;   -- SHA-256 van de koppelcode (voor beheerder/QR)
ALTER TABLE parent_consents ADD COLUMN guardian_user_id TEXT;  -- ingelogde ouder/voogd die goedkeurde (indien van toepassing)

-- Statussen gelijktrekken: granted -> approved, declined -> rejected (pending/revoked blijven).
UPDATE parent_consents SET status = 'approved' WHERE status = 'granted';
UPDATE parent_consents SET status = 'rejected' WHERE status = 'declined';

CREATE INDEX idx_parent_consents_claim ON parent_consents (claim_code_hash);
