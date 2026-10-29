#!/usr/bin/env node
/**
 * Verify that the Cloudflare application build is online-only.
 * This gate is for the isolated Worker deployment, not the static Render demo.
 */
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

async function javascript(directory) {
  const result = [];
  for (const e of await readdir(directory, { withFileTypes: true })) {
    const p = join(directory, e.name);
    if (e.isDirectory()) result.push(...await javascript(p));
    else if (e.isFile() && p.endsWith('.js')) result.push(p);
  }
  return result;
}

export function isOnlineOnlyBuild(contents) {
  return contents.includes('RANK11. is tijdelijk niet bereikbaar')
    && contents.includes('Toegang uitsluitend voor uitgenodigde accounts');
}

export async function verifyOnlineBuild(dir) {
  const files = await javascript(dir);
  if (!files.length) throw new Error('Geen gecompileerde RANK11-JavaScriptbestanden.');
  const text = (await Promise.all(files.map((p) => readFile(p, 'utf8')))).join('\n');
  if (!isOnlineOnlyBuild(text)) {
    throw new Error('NO-GO: Cloudflare build bevat geen verplichte online-only toegang of storingsscherm.');
  }
  console.log('RANK11 ONLINE-ONLY BOUW GO: geen stille overgang naar lokale demo.');
}

if (process.argv[1]?.endsWith('assert-online-build.mjs')) {
  verifyOnlineBuild(new URL('../apps/web/dist/', import.meta.url)).catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
