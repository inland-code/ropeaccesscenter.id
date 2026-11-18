#!/usr/bin/env node
/**
 * Audit SEO statis atas hasil build (dist/). Tanpa dependensi.
 * ERROR (build gagal): judul/deskripsi hilang, H1 ≠ 1, canonical hilang, <img> tanpa alt,
 *                       link internal rusak, judul ganda antar halaman.
 *                       link keluar non-HTTPS, target=_blank tanpa rel="noopener".
 * WARN: judul > 65 karakter, deskripsi di luar 70–165 karakter, deskripsi ganda,
 *       halaman yatim (< 2 link kontekstual masuk dari isi <main> halaman lain).
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const dist = new URL('../dist/', import.meta.url).pathname;
const files = [];
(function walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      if (name !== '_astro' && name !== 'admin') walk(p);
    } else if (name === 'index.html') files.push(p);
  }
})(dist);

const decode = (s) =>
  s
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
const errors = [];
const warns = [];
const titles = new Map();
const inbound = new Map(); // path → Set halaman sumber (link di dalam <main>, bukan menu/footer)
const external = new Map(); // host → jumlah link
const descs = new Map();

function exists(urlPath) {
  const clean = decodeURI(urlPath.split('#')[0].split('?')[0]);
  if (!clean || clean === '/') return existsSync(join(dist, 'index.html'));
  const target = join(dist, clean);
  if (clean.endsWith('/')) return existsSync(join(target, 'index.html'));
  return existsSync(target) || existsSync(join(target, 'index.html'));
}
const redirects = readFileSync(join(dist, '_redirects'), 'utf8')
  .split('\n')
  .map((l) => l.trim().split(/\s+/)[0])
  .filter((s) => s && !s.startsWith('#'));

for (const file of files) {
  const page = '/' + relative(dist, file).replace(/index\.html$/, '');
  const html = readFileSync(file, 'utf8');
  const title = decode(html.match(/<title>([^<]*)<\/title>/)?.[1]?.trim() ?? '');
  const desc = decode(html.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? '');
  const h1 = (html.match(/<h1[\s>]/g) ?? []).length;
  if (!title) errors.push(`${page}: <title> kosong`);
  else if (title.length > 65) warns.push(`${page}: judul ${title.length} karakter`);
  if (!desc) errors.push(`${page}: meta description kosong`);
  else if (desc.length < 70 || desc.length > 165) warns.push(`${page}: deskripsi ${desc.length} karakter`);
  if (h1 !== 1) errors.push(`${page}: jumlah <h1> = ${h1}`);
  if (!/<link rel="canonical" href="[^"]+"/.test(html)) errors.push(`${page}: canonical hilang`);
  // alt="" hanya sah untuk gambar dekoratif yang ditandai eksplisit (data-decorative), mis. siluet merek.
  for (const img of html.match(/<img\b[^>]*>/g) ?? [])
    if (!/\balt="[^"]+"/.test(img) && !(/\balt(=""|[\s>])/.test(img) && /\bdata-decorative\b/.test(img)))
      errors.push(`${page}: <img> tanpa alt`);
  for (const [, href] of html.matchAll(/<a\b[^>]*\shref="([^"]+)"/g)) {
    if (!href.startsWith('/') || href.startsWith('//')) continue;
    if (href.startsWith('/api/')) continue;
    if (!exists(href) && !redirects.includes(href)) errors.push(`${page}: link rusak → ${href}`);
  }
  const main = html.match(/<main\b[\s\S]*?<\/main>/)?.[0] ?? '';
  for (const [, href] of main.matchAll(/<a\b[^>]*\shref="([^"#?]*)[^"]*"[^>]*>/g)) {
    if (/^https?:\/\//.test(href)) {
      external.set(new URL(href).host, (external.get(new URL(href).host) ?? 0) + 1);
      continue;
    }
    if (href.startsWith('/') && href !== page) inbound.set(href, new Set([...(inbound.get(href) ?? []), page]));
  }
  for (const [tag, href] of html.matchAll(/<a\b[^>]*\shref="([^"]+)"[^>]*>/g)) {
    if (href.startsWith('http://') && !href.startsWith('http://localhost')) errors.push(`${page}: link keluar tanpa HTTPS → ${href}`);
    if (/target="_blank"/.test(tag) && !/rel="[^"]*noopener/.test(tag)) errors.push(`${page}: target=_blank tanpa rel=noopener → ${href}`);
  }
  if (page !== '/404/') {
    if (title) titles.set(title, [...(titles.get(title) ?? []), page]);
    if (desc) descs.set(desc, [...(descs.get(desc) ?? []), page]);
  }
}
for (const [t, pages] of titles) if (pages.length > 1) errors.push(`Judul ganda "${t}": ${pages.join(', ')}`);
for (const file of files) {
  const page = '/' + relative(dist, file).replace(/index\.html$/, '');
  if (page === '/' || page === '/en/' || page === '/404/') continue;
  if (/<meta name="robots" content="[^"]*noindex/.test(readFileSync(file, 'utf8'))) continue;
  const n = inbound.get(page)?.size ?? 0;
  if (n < 2) warns.push(`${page}: hanya ${n} link kontekstual masuk (halaman yatim)`);
}
for (const [, pages] of descs) if (pages.length > 1) warns.push(`Deskripsi ganda di ${pages.join(', ')}`);

const linksIn = [...inbound.values()].reduce((a, s) => a + s.size, 0);
console.log(`\n[seo-audit] ${files.length} halaman diperiksa · ${linksIn} relasi link internal · link keluar ke ${external.size} domain`);
if (process.env.AUDIT_VERBOSE) for (const [h, n] of [...external].sort((a, b) => b[1] - a[1])) console.log(`    ↗ ${h} (${n})`);
for (const w of warns) console.warn(`  ⚠ ${w}`);
for (const e of errors) console.error(`  ✗ ${e}`);
if (errors.length) {
  console.error(`[seo-audit] ✗ ${errors.length} error`);
  process.exit(1);
}
console.log(`[seo-audit] ✓ 0 error, ${warns.length} peringatan\n`);
