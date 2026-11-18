#!/usr/bin/env node
/**
 * Memastikan SEMUA URL yang direncanakan (migration/url-inventory.csv — daftar URL di docs/PLAN.md)
 * ada di hasil build. Gagal (exit 1) jika ada yang hilang — mencegah link/SEO rusak saat slug diubah.
 * Setelah situs live: jangan hapus baris; ganti slug hanya bersama redirect 301 di public/_redirects.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const dist = new URL('../dist/', import.meta.url).pathname;
const csv = readFileSync(new URL('../migration/url-inventory.csv', import.meta.url), 'utf8')
  .trim()
  .split('\n');
const header = csv.shift().split(',');
const rows = csv.map((line) => Object.fromEntries(line.split(',').map((v, i) => [header[i], v])));
const redirects = readFileSync(join(dist, '_redirects'), 'utf8')
  .split('\n')
  .map((l) => l.trim().split(/\s+/)[0])
  .filter((s) => s && !s.startsWith('#'));

const missing = [];
for (const row of rows) {
  const p = row.path;
  const file = p.endsWith('/') ? join(dist, p, 'index.html') : join(dist, p);
  if (!existsSync(file) && !redirects.includes(p)) missing.push(p);
}

console.log(`\n[verify-urls] ${rows.length} URL rencana dicek terhadap dist/`);
if (missing.length) {
  console.error(`[verify-urls] ✗ ${missing.length} URL TIDAK ada di build (dan tidak di-redirect):`);
  for (const m of missing) console.error(`   - ${m}`);
  process.exit(1);
}
console.log('[verify-urls] ✓ Semua URL tersedia.\n');
