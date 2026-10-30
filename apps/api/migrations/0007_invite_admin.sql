-- Beheer van platformuitnodigingen vanuit de app: een uitnodiging kan worden ingetrokken
-- zonder verwijderen, zodat de geschiedenis zichtbaar blijft. Een ingetrokken of verlopen
-- code is niet meer bruikbaar om te registreren.
ALTER TABLE platform_invites ADD COLUMN revoked_at INTEGER;
