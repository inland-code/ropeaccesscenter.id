#!/usr/bin/env node
/**
 * Pasca-build:
 * 1) Content-Security-Policy dengan hash SHA-256 untuk setiap <script> inline (tanpa 'unsafe-inline' untuk skrip).
 * 2) Link keluar (http/https ke domain lain) tanpa target → target="_blank" rel="noopener external".
 *    Tetap dofollow: tautan ke sumber resmi/kredibel adalah sinyal kualitas. Admin dilewati.
 * 3) Build non-produksi (staging/preview): tambahkan X-Robots-Tag: noindex ke semua respons.
 */
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const dist = new URL('../dist/', import.meta.url).pathname;
const headersFile = join(dist, '_headers');

const html = [];
(function walk(dir) {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) walk(p);
    else if (n.endsWith('.html')) html.push(p);
  }
})(dist);

let externalTagged = 0;
for (const file of html) {
  if (file.includes('/admin/')) continue;
  const src = readFileSync(file, 'utf8');
  const out = src.replace(/<a\b([^>]*?)\shref="(https?:\/\/[^"]+)"([^>]*)>/g, (tag, pre, href, post) => {
    if (/^https?:\/\/(www\.)?ropeaccesscenter\.id(\/|$)/.test(href) || /\starget=/.test(pre + post)) return tag;
    externalTagged++;
    return `<a${pre} href="${href}" target="_blank" rel="noopener external"${post}>`;
  });
  if (out !== src) writeFileSync(file, out);
}

const hashes = new Set();
for (const file of html) {
  const src = readFileSync(file, 'utf8');
  for (const m of src.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
    const attrs = m[1] ?? '';
    if (/\bsrc=/.test(attrs) || /type="application\/(ld\+)?json"/.test(attrs)) continue; // data block / skrip eksternal
    hashes.add(
      `'sha256-${createHash('sha256')
        .update(m[2] ?? '')
        .digest('base64')}'`,
    );
  }
}

const csp = [
  "default-src 'self'",
  `script-src 'self' 'inline-speculation-rules' ${[...hashes].sort().join(' ')} https://challenges.cloudflare.com https://static.cloudflareinsights.com`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self' https://cloudflareinsights.com",
  'frame-src https://challenges.cloudflare.com',
  "form-action 'self' https://wa.me https://api.whatsapp.com",
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  'upgrade-insecure-requests',
].join('; ');

let headers = readFileSync(headersFile, 'utf8');
headers = headers.replace(/^\/\*\n/m, `/*\n  Content-Security-Policy: ${csp}\n`);
// Sama dengan src/lib/env.ts: build Workers Builds dari main = produksi kecuali PUBLIC_SITE_ENV menyatakan lain.
const env = process.env;
const production = env.PUBLIC_SITE_ENV ? env.PUBLIC_SITE_ENV === 'production' : env.WORKERS_CI === '1' && env.WORKERS_CI_BRANCH === 'main';
if (production) {
  console.log('[postbuild] produksi: header indexable dipertahankan.');
} else {
  headers = `/*\n  X-Robots-Tag: noindex, nofollow\n\n${headers}`;
  console.log('[postbuild] staging: X-Robots-Tag noindex ditambahkan.');
}
writeFileSync(headersFile, headers);
console.log(`[postbuild] ${externalTagged} link keluar ditandai target=_blank rel="noopener external".`);
console.log(`[postbuild] CSP: ${hashes.size} hash skrip inline dari ${html.length} file HTML.`);
