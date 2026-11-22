import { describe, expect, it } from 'vitest';
import { changedUrls, runIndexNow, type IndexNowManifest } from '../worker/indexnow';
import type { Env } from '../worker/env';

/** D1 tiruan secukupnya untuk indexnow_urls. */
function fakeDb(initial: Record<string, string> = {}) {
  const rows = new Map(Object.entries(initial));
  const stmt = (sql: string, args: unknown[] = []) => ({
    bind: (...a: unknown[]) => stmt(sql, a),
    run: async () => ({}),
    all: async () => ({ results: [...rows].map(([url, hash]) => ({ url, hash })) }),
    exec: () => {
      if (sql.startsWith('INSERT')) rows.set(args[0] as string, args[1] as string);
    },
  });
  return {
    rows,
    db: {
      prepare: (sql: string) => stmt(sql),
      batch: async (list: { exec: () => void }[]) => list.forEach((s) => s.exec()),
    } as unknown as D1Database,
  };
}

const manifest = (over: Partial<IndexNowManifest> = {}): IndexNowManifest => ({
  production: true,
  host: 'ropeaccesscenter.id',
  key: 'a'.repeat(32),
  urls: { 'https://ropeaccesscenter.id/': 'h1', 'https://ropeaccesscenter.id/artikel/': 'h2' },
  ...over,
});

const envWith = (m: IndexNowManifest, db?: D1Database) => ({ DB: db, ASSETS: { fetch: async () => Response.json(m) } }) as unknown as Env;

describe('IndexNow', () => {
  it('memilih hanya URL baru atau berubah', () => {
    const prev = new Map([
      ['a', '1'],
      ['b', '2'],
    ]);
    expect(changedUrls({ a: '1', b: 'x', c: '3' }, prev)).toEqual(['b', 'c']);
  });

  it('mengirim URL berubah lalu menyimpan hash; kiriman berikutnya kosong', async () => {
    const { db, rows } = fakeDb({ 'https://ropeaccesscenter.id/': 'h1' });
    const calls: { url: string; body: { urlList: string[]; keyLocation: string } }[] = [];
    const fetcher = (async (url: string, init: RequestInit) => {
      calls.push({ url, body: JSON.parse(init.body as string) });
      return new Response(null, { status: 202 });
    }) as unknown as typeof fetch;
    const env = envWith(manifest(), db);

    expect(await runIndexNow(env, fetcher)).toEqual({ submitted: 1, status: 202 });
    expect(calls[0]!.url).toBe('https://api.indexnow.org/indexnow');
    expect(calls[0]!.body.urlList).toEqual(['https://ropeaccesscenter.id/artikel/']);
    expect(calls[0]!.body.keyLocation).toBe(`https://ropeaccesscenter.id/${'a'.repeat(32)}.txt`);
    expect(rows.get('https://ropeaccesscenter.id/artikel/')).toBe('h2');

    expect(await runIndexNow(env, fetcher)).toEqual({ submitted: 0 });
    expect(calls).toHaveLength(1);
  });

  it('tidak mengirim dari build non-produksi', async () => {
    const { db } = fakeDb();
    let called = false;
    const fetcher = (async () => ((called = true), new Response(null, { status: 200 }))) as unknown as typeof fetch;
    expect(await runIndexNow(envWith(manifest({ production: false }), db), fetcher)).toEqual({ submitted: 0 });
    expect(called).toBe(false);
  });

  it('tidak menyimpan hash bila IndexNow menolak, agar dicoba lagi', async () => {
    const { db, rows } = fakeDb();
    const fetcher = (async () => new Response('bad', { status: 403 })) as unknown as typeof fetch;
    expect((await runIndexNow(envWith(manifest(), db), fetcher)).submitted).toBe(0);
    expect(rows.size).toBe(0);
  });
});
