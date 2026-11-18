import { describe, expect, it } from 'vitest';
import worker from '../worker/index';
import { createSession, requireAdmin } from '../worker/auth';
import { assertAllowed } from '../worker/github';
import type { Env } from '../worker/env';

const ORIGIN = 'https://rac.example';
const baseEnv = {
  WHATSAPP_NUMBER: '6281234567890',
  GITHUB_REPO: 'inland-code/ropeaccesscenter.id',
  GITHUB_BRANCH: 'main',
  ASSETS: { fetch: async () => new Response('asset') },
} as unknown as Env;
const ctx = { waitUntil: () => {}, passThroughOnException: () => {} } as unknown as ExecutionContext;
type WorkerRequest = Parameters<typeof worker.fetch>[0];
const call = (req: Request, env: Env = baseEnv) => worker.fetch(req as unknown as WorkerRequest, env, ctx);

const post = (body: Record<string, string>, headers: Record<string, string> = {}) =>
  new Request(`${ORIGIN}/api/contact`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded', origin: ORIGIN, ...headers },
    body: new URLSearchParams(body).toString(),
  });

describe('POST /api/contact', () => {
  it('mengarahkan ke WhatsApp dengan pesan terisi', async () => {
    const res = await call(
      post({ name: 'Budi', phone: '0812', service: 'Pelatihan IRATA', message: 'Halo', locale: 'id', page: '/kontak/' }),
    );
    expect(res.status).toBe(303);
    const loc = decodeURIComponent(res.headers.get('location') ?? '');
    expect(loc).toContain('https://wa.me/6281234567890?text=');
    expect(loc).toContain('Halo RAC, saya Budi.');
    expect(loc).toContain('Kebutuhan: Pelatihan IRATA');
  });

  it('menolak kiriman tanpa nama/pesan', async () => {
    const res = await call(post({ name: '', message: '', page: '/kontak/' }));
    expect(res.headers.get('location')).toBe('/kontak/?error=required#form');
  });

  it('mengabaikan bot (honeypot) tanpa membuka WhatsApp', async () => {
    const res = await call(post({ name: 'Bot', message: 'spam', website: 'x', page: '/kontak/' }));
    expect(res.headers.get('location')).toBe('/kontak/');
  });

  it('menolak origin lain (CSRF)', async () => {
    const res = await call(post({ name: 'a', message: 'b' }, { origin: 'https://evil.example' }));
    expect(res.status).toBe(403);
  });

  it('hanya menerima POST', async () => {
    const res = await call(new Request(`${ORIGIN}/api/contact`));
    expect(res.status).toBe(405);
  });
});

describe('login dashboard (sesi)', () => {
  const env = {
    ...baseEnv,
    GITHUB_OAUTH_CLIENT_ID: 'id',
    GITHUB_OAUTH_CLIENT_SECRET: 's',
    SESSION_SECRET: 'x'.repeat(40),
    ADMIN_GITHUB_USERS: 'inland-code',
  } as Env;
  const withCookie = (v: string) => new Request(`${ORIGIN}/api/admin/me`, { headers: { cookie: `rac_admin=${v}` } });

  it('menerima cookie sesi yang valid', async () => {
    expect(await requireAdmin(withCookie(await createSession(env.SESSION_SECRET!, 'inland-code')), env)).toBe('inland-code');
  });
  it('menolak cookie yang dimanipulasi', async () => {
    const [p, sig] = (await createSession(env.SESSION_SECRET!, 'inland-code')).split('.');
    const forged = btoa(JSON.stringify({ login: 'hacker', exp: 9e9 })).replace(/=+$/, '');
    await expect(requireAdmin(withCookie(`${forged}.${sig}`), env)).rejects.toThrow('Sesi tidak valid');
    expect(p).toBeTruthy();
  });
  it('menolak sesi kedaluwarsa', async () => {
    await expect(requireAdmin(withCookie(await createSession(env.SESSION_SECRET!, 'inland-code', -1)), env)).rejects.toThrow('kedaluwarsa');
  });
  it('menolak tanpa cookie & bila belum dikonfigurasi', async () => {
    await expect(requireAdmin(new Request(`${ORIGIN}/api/admin/me`), env)).rejects.toThrow('Belum masuk');
    await expect(requireAdmin(new Request(`${ORIGIN}/api/admin/me`), baseEnv)).rejects.toThrow('belum dikonfigurasi');
  });
  it('dev bypass hanya berlaku di localhost', async () => {
    const dev = { ...baseEnv, ADMIN_DEV_BYPASS: '1' } as Env;
    expect(await requireAdmin(new Request('http://localhost:8787/api/admin/me'), dev)).toBe('dev@localhost');
    await expect(requireAdmin(new Request(`${ORIGIN}/api/admin/me`), dev)).rejects.toThrow();
  });
  it('API admin menolak permintaan tanpa sesi (401)', async () => {
    const res = await call(new Request(`${ORIGIN}/api/admin/me`), env);
    expect(res.status).toBe(401);
  });
});

describe('pembatasan path yang boleh ditulis dashboard', () => {
  it.each([
    'src/content/pages/id/home.json',
    'src/content/posts/en/a-b.md',
    'src/assets/images/uploads/foto-1.webp',
    'src/data/site.json',
    'src/content/data/schedule.json',
    'src/content/data/faqs.json',
    'public/_redirects',
  ])('mengizinkan %s', (p) => {
    expect(() => assertAllowed(p)).not.toThrow();
  });
  it.each([
    'src/pages/index.astro',
    'worker/index.ts',
    'src/content/pages/id/../../../wrangler.jsonc',
    '.github/workflows/ci.yml',
    'package.json',
    'src/content/data/rahasia.json',
    'src/content/schema.ts',
  ])('menolak %s', (p) => {
    expect(() => assertAllowed(p)).toThrow();
  });
});
