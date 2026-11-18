#!/usr/bin/env node
/**
 * Astro hanya mendeteksi perubahan pada content.config.ts, bukan file skema yang di-import
 * (src/content/schema.ts). Bila skema berubah tetapi data-store lama ter-cache (CI, Workers Builds),
 * field baru bernilai undefined. Skrip ini membuang data-store setiap kali hash skema berubah.
 * Cache gambar (node_modules/.astro/assets) tetap dipertahankan.
 */
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';

const root = new URL('../', import.meta.url).pathname;
const cacheDir = `${root}node_modules/.astro`;
const stamp = `${cacheDir}/schema-hash`;
const hash = createHash('sha256');
for (const f of ['src/content.config.ts', 'src/content/schema.ts', 'package-lock.json']) hash.update(readFileSync(root + f));
const digest = hash.digest('hex');

if (!existsSync(stamp) || readFileSync(stamp, 'utf8') !== digest) {
  rmSync(`${cacheDir}/data-store.json`, { force: true });
  mkdirSync(cacheDir, { recursive: true });
  writeFileSync(stamp, digest);
  console.log('[content-cache] skema berubah → data-store konten dibangun ulang.');
}
