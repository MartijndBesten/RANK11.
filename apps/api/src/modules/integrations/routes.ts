/**
 * Endpoints voor externe cijferkoppelingen. Tokens blijven server-side (versleuteld) en gaan nooit naar de client.
 * De echte Magister-synchronisatie is niet geactiveerd: koppelen van een niet-beschikbare provider geeft 409.
 */
import { requireUser } from '../../auth.ts';
import { newId } from '../../crypto.ts';
import { many, run } from '../../db.ts';
import { badRequest, conflict, json, notFound, type Ctx } from '../../http.ts';
import { encryptToken } from './crypto.ts';
import { getProvider, PROVIDERS, type LinkRow } from './providers.ts';
import { loadLink, syncProvider } from './sync.ts';

/** Publieke weergave van een koppeling: nooit het token. */
function linkView(link: LinkRow | null) {
  if (!link) return { linked: false as const };
  return {
    linked: true as const,
    status: link.status,
    displayName: link.display_name,
    lastSyncAt: link.last_sync_at,
    lastError: link.last_error,
  };
}

function providerList(ctx: Ctx, links: Map<string, LinkRow>) {
  return Object.values(PROVIDERS).map((p) => ({
    id: p.id, name: p.name, school: p.school ?? null, available: p.available, note: p.note ?? null,
    link: linkView(links.get(p.id) ?? null),
  }));
}

export async function listIntegrations(ctx: Ctx): Promise<Response> {
  const user = requireUser(ctx);
  const rows = await many<LinkRow>(ctx.env.DB,
    'SELECT user_id, provider, external_id, display_name, status, token_enc, last_sync_at, last_error FROM integration_links WHERE user_id = ?', user.id);
  const links = new Map(rows.map((r) => [r.provider, r]));
  return json({ providers: providerList(ctx, links) });
}

export async function getIntegration(ctx: Ctx): Promise<Response> {
  const user = requireUser(ctx);
  const provider = getProvider(ctx.params.provider ?? '');
  if (!provider) throw notFound();
  return json({ provider: provider.id, available: provider.available, link: linkView(await loadLink(ctx, user.id, provider.id)) });
}

/**
 * Koppelen. Beschikbare providers (voorbeeldbron) maken een koppeling aan. Magister is niet beschikbaar: 409 met
 * uitleg. Er wordt hier nooit om een wachtwoord gevraagd of een ongeautoriseerde API benaderd.
 */
export async function connectIntegration(ctx: Ctx): Promise<Response> {
  const user = requireUser(ctx);
  const provider = getProvider(ctx.params.provider ?? '');
  if (!provider) throw notFound();
  if (!provider.available) throw conflict('requires_authorization', provider.note ?? 'Deze koppeling is nog niet beschikbaar.');

  // De voorbeeldbron heeft geen echte login; we bewaren een niet-geheim placeholdertoken versleuteld,
  // zodat de opslag- en ontsleutelketen echt wordt getest. Een echte bron slaat hier een refresh_token op.
  const key = ctx.env.INTEGRATION_KEY;
  if (!key) throw new Error('INTEGRATION_KEY ontbreekt in de omgeving.');
  const tokenEnc = await encryptToken(key, `sample-token-${newId('tok')}`);
  await run(ctx.env.DB,
    `INSERT INTO integration_links (user_id, provider, external_id, display_name, status, token_enc, created_at, updated_at)
     VALUES (?, ?, ?, ?, 'linked', ?, ?, ?)
     ON CONFLICT(user_id, provider) DO UPDATE SET status = 'linked', token_enc = excluded.token_enc, last_error = NULL, updated_at = excluded.updated_at`,
    user.id, provider.id, `${provider.id}-demo`, provider.name, tokenEnc, ctx.now, ctx.now);
  // Eén keer koppelen, daarna automatisch bijwerken: haal de cijfers meteen op.
  const result = await syncProvider(ctx, user.id, provider.id);
  return json({ result, link: linkView(await loadLink(ctx, user.id, provider.id)) }, 201);
}

export async function syncIntegration(ctx: Ctx): Promise<Response> {
  const user = requireUser(ctx);
  const provider = getProvider(ctx.params.provider ?? '');
  if (!provider) throw notFound();
  if (!provider.available) throw conflict('requires_authorization', provider.note ?? 'Deze koppeling is nog niet beschikbaar.');
  if (!(await loadLink(ctx, user.id, provider.id))) throw badRequest('Nog niet gekoppeld.');
  const result = await syncProvider(ctx, user.id, provider.id);
  return json({ result, link: linkView(await loadLink(ctx, user.id, provider.id)) });
}

export async function disconnectIntegration(ctx: Ctx): Promise<Response> {
  const user = requireUser(ctx);
  const provider = getProvider(ctx.params.provider ?? '');
  if (!provider) throw notFound();
  // Volledig ontkoppelen: koppeling en token weg. De al geïmporteerde cijfers blijven van de leerling.
  await run(ctx.env.DB, 'DELETE FROM integration_links WHERE user_id = ? AND provider = ?', user.id, provider.id);
  return json({ ok: true, link: linkView(null) });
}
