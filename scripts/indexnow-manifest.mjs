#!/usr/bin/env node
/**
 * Menulis dist/indexnow-manifest.json untuk IndexNow otomatis (lihat worker/indexnow.ts).
 * Hash dihitung dari isi <main> halaman, jadi perubahan header/footer/CSS saja tidak memicu pengiriman ulang.
 * Kunci IndexNow = nama file public/<kunci>.txt (kunci ini memang publik).
 */
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('../', import.meta.url).pathname;
const dist = join(root, 'dist');
const key = readdirSync(join(root, 'public'))
  .find((n) => /^[a-f0-9]{32}\.txt$/.test(n))
  ?.replace('.txt', '');
if (!key) throw new Error('[indexnow] file kunci public/<32 hex>.txt tidak ditemukan');

const env = process.env;
const production = env.PUBLIC_SITE_ENV ? env.PUBLIC_SITE_ENV === 'production' : env.WORKERS_CI === '1' && env.WORKERS_CI_BRANCH === 'main';

const locs = [];
for (const name of readdirSync(dist).filter((n) => /-sitemap\.xml$/.test(n))) {
  for (const m of readFileSync(join(dist, name), 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)) locs.push(m[1]);
}
if (locs.length === 0) throw new Error('[indexnow] sitemap kosong');
const host = new URL(locs[0]).host;

const urls = {};
for (const loc of locs) {
  const file = join(dist, decodeURI(new URL(loc).pathname), 'index.html');
  if (!existsSync(file)) continue;
  const html = readFileSync(file, 'utf8');
  const main = html.match(/<main\b[\s\S]*<\/main>/)?.[0] ?? html;
  urls[loc] = createHash('sha256').update(main).digest('hex').slice(0, 16);
}

writeFileSync(join(dist, 'indexnow-manifest.json'), JSON.stringify({ production, host, key, urls }));
console.log(`[indexnow] manifest: ${Object.keys(urls).length} URL · produksi: ${production ? 'ya' : 'tidak'}`);
