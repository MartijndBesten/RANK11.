/**
 * Ronde 15: catalogus-sync zonder dataverlies. Een account met kaarten uit de vorige catalogus (inclusief
 * spelers die nu niet meer actief zijn, edities, Legends en de uitgelichte kaart) houdt al die kaarten,
 * met dezelfde speler (QID) als voorheen. Ze verschijnen niet als 'missing' en blijven bruikbaar in het elftal.
 */
import { describe, expect, it } from 'vitest';
import { CARD_LOCK } from '../src/engine.ts';
import { cardDef, CATALOG_VERSION } from '../src/game.ts';
import { createApp, platformCode, register } from './helpers.ts';

describe('catalogus-migratie', () => {
  it('alle 245 oude kaart-id’s zijn nog geldig en wijzen naar dezelfde QID', () => {
    for (const [id, lock] of Object.entries(CARD_LOCK)) {
      const def = cardDef(id);
      expect(def, id).toBeTruthy();
      expect(def!.qid, id).toBe(lock.qid);
    }
  });

  it('een bestaande collectie met oude, nu inactieve en editiekaarten blijft volledig', async () => {
    const app = createApp();
    const u = await register(app, 'Verzamelaar', await platformCode(app));
    const inactive = Object.keys(CARD_LOCK).find((id) => id === CARD_LOCK[id]!.slot && cardDef(id)!.inPacks === false)!;
    const legacy = [inactive, 'p0001', 'p0001-special', 'p0002-exam', 'p0003-season', 'L01', 'L08', 'S01'];
    const ins = app.db.db.prepare(`INSERT INTO card_instances (id, user_id, card_def_id, catalog_version, acquired_via, source_ref, acquired_at) VALUES (?, ?, ?, 'rank11-catalog-v1:real-2026-11', 'pack', 'oud', ?)`);
    legacy.forEach((def, i) => ins.run(`card_oud_${i}`, u.id, def, app.now()));
    const before = (app.db.db.prepare('SELECT COUNT(*) AS n FROM card_instances WHERE user_id = ?').get(u.id) as { n: number }).n;

    const res = await app.api('GET', '/api/collection', { token: u.token });
    expect(res.status).toBe(200);
    expect(res.body.catalogVersion).toBe(CATALOG_VERSION);
    expect(res.body.cards.length).toBe(before);
    expect(res.body.cards.filter((c: any) => c.missing)).toEqual([]);
    for (const [i, def] of legacy.entries()) {
      const c = res.body.cards.find((x: any) => x.id === `card_oud_${i}`);
      expect(c.cardDefId).toBe(def);
      expect(c.name).toBe(cardDef(def)!.cardName);
    }
    // De database is niet aangeraakt: zelfde aantal instanties, oude catalogusversie blijft als herkomst staan.
    const after = app.db.db.prepare("SELECT COUNT(*) AS n FROM card_instances WHERE user_id = ? AND catalog_version = 'rank11-catalog-v1:real-2026-11'").get(u.id) as { n: number };
    expect(after.n).toBe(legacy.length);
  });
});
