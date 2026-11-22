/**
 * IndexNow otomatis (Bing, Yandex, Seznam, Naver, dll.).
 * - Saat build, scripts/indexnow-manifest.mjs menulis /indexnow-manifest.json: sidik jari (hash) isi <main> tiap URL di sitemap.
 * - Cron Worker (wrangler.jsonc → triggers.crons) membandingkan manifest dengan hash yang terakhir dikirim (D1),
 *   lalu mengirim hanya URL baru/berubah ke api.indexnow.org dalam satu permintaan.
 * - Hanya berjalan bila manifest berasal dari build produksi.
 */
import type { Env } from './env';

export interface IndexNowManifest {
  production: boolean;
  host: string;
  key: string;
  urls: Record<string, string>;
}

const ENDPOINT = 'https://api.indexnow.org/indexnow';
const MAX_URLS = 10_000;

/** URL yang baru atau hash-nya berbeda dari kiriman terakhir. */
export function changedUrls(current: Record<string, string>, previous: Map<string, string>): string[] {
  return Object.entries(current)
    .filter(([url, hash]) => previous.get(url) !== hash)
    .map(([url]) => url)
    .slice(0, MAX_URLS);
}

export async function runIndexNow(env: Env, fetcher: typeof fetch = fetch): Promise<{ submitted: number; status?: number }> {
  if (!env.DB) return { submitted: 0 };
  const res = await env.ASSETS.fetch('https://assets.local/indexnow-manifest.json');
  if (!res.ok) return { submitted: 0 };
  const manifest = (await res.json()) as IndexNowManifest;
  if (!manifest.production || !manifest.key || !manifest.host) return { submitted: 0 };

  await env.DB.prepare(
    'CREATE TABLE IF NOT EXISTS indexnow_urls (url TEXT PRIMARY KEY, hash TEXT NOT NULL, submitted_at TEXT NOT NULL)',
  ).run();
  const { results } = await env.DB.prepare('SELECT url, hash FROM indexnow_urls').all<{ url: string; hash: string }>();
  const previous = new Map(results.map((r) => [r.url, r.hash]));
  const urlList = changedUrls(manifest.urls, previous);
  if (urlList.length === 0) return { submitted: 0 };

  const response = await fetcher(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({
      host: manifest.host,
      key: manifest.key,
      keyLocation: `https://${manifest.host}/${manifest.key}.txt`,
      urlList,
    }),
  });
  // 200 = diterima, 202 = diterima (kunci sedang diverifikasi). Selain itu: coba lagi di jadwal berikutnya.
  if (response.status !== 200 && response.status !== 202) {
    console.warn(`[indexnow] gagal ${response.status}: ${await response.text().catch(() => '')}`);
    return { submitted: 0, status: response.status };
  }
  const now = new Date().toISOString();
  const upsert = env.DB.prepare(
    'INSERT INTO indexnow_urls (url, hash, submitted_at) VALUES (?1, ?2, ?3) ON CONFLICT(url) DO UPDATE SET hash = excluded.hash, submitted_at = excluded.submitted_at',
  );
  await env.DB.batch(urlList.map((url) => upsert.bind(url, manifest.urls[url]!, now)));
  console.log(`[indexnow] ${urlList.length} URL dikirim (status ${response.status}).`);
  return { submitted: urlList.length, status: response.status };
}
