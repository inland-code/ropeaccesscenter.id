import type { Env } from './env';

/**
 * Login dashboard dengan akun GitHub (OAuth App) — gratis, tanpa Cloudflare Zero Trust.
 *  GET /api/auth/login    -> redirect ke GitHub
 *  GET /api/auth/callback -> tukar code, cek akun diizinkan, set cookie sesi bertanda tangan
 *  GET /api/auth/logout   -> hapus sesi
 * Sesi: cookie HttpOnly + Secure + SameSite=Lax berisi {login, exp} yang ditandatangani HMAC-SHA256.
 */

const COOKIE = 'rac_admin';
const STATE_COOKIE = 'rac_oauth_state';
const SESSION_DAYS = 7;

export class AuthError extends Error {}

const enc = new TextEncoder();
const b64url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
const fromB64url = (s: string) =>
  Uint8Array.from(
    atob(
      s
        .replace(/-/g, '+')
        .replace(/_/g, '/')
        .padEnd(Math.ceil(s.length / 4) * 4, '='),
    ),
    (c) => c.charCodeAt(0),
  );

async function hmac(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  return b64url(new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(data))));
}

/** Perbandingan waktu-konstan untuk tanda tangan. */
function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function cookies(request: Request): Record<string, string> {
  return Object.fromEntries(
    (request.headers.get('cookie') ?? '')
      .split(';')
      .map((c) => c.trim().split('='))
      .filter(([k, v]) => k && v)
      .map(([k, ...v]) => [k!, v.join('=')]),
  );
}

const cookie = (name: string, value: string, maxAge: number, secure: boolean) =>
  `${name}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure ? '; Secure' : ''}`;

const list = (s?: string) =>
  (s ?? '')
    .split(',')
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean);

function configured(env: Env): boolean {
  return Boolean(
    env.GITHUB_OAUTH_CLIENT_ID && env.GITHUB_OAUTH_CLIENT_SECRET && env.SESSION_SECRET && (env.ADMIN_GITHUB_USERS || env.ADMIN_EMAIL),
  );
}

/** Buat nilai cookie sesi bertanda tangan: base64url(payload).hmac */
export async function createSession(secret: string, login: string, days = SESSION_DAYS): Promise<string> {
  const payload = b64url(enc.encode(JSON.stringify({ login, exp: Math.floor(Date.now() / 1000) + days * 86400 })));
  return `${payload}.${await hmac(secret, payload)}`;
}

/** Kembalikan identitas admin (username GitHub) atau lempar AuthError. */
export async function requireAdmin(request: Request, env: Env): Promise<string> {
  const url = new URL(request.url);
  if (env.ADMIN_DEV_BYPASS === '1' && (url.hostname === 'localhost' || url.hostname === '127.0.0.1')) return 'dev@localhost';
  if (!configured(env)) throw new AuthError('Login GitHub belum dikonfigurasi (lihat panduan)');
  const raw = cookies(request)[COOKIE];
  if (!raw) throw new AuthError('Belum masuk');
  const [payload, sig] = raw.split('.');
  if (!payload || !sig || !safeEqual(sig, await hmac(env.SESSION_SECRET!, payload))) throw new AuthError('Sesi tidak valid');
  const data = JSON.parse(new TextDecoder().decode(fromB64url(payload))) as { login: string; exp: number };
  if (data.exp * 1000 < Date.now()) throw new AuthError('Sesi kedaluwarsa, silakan masuk lagi');
  return data.login;
}

export async function handleAuth(request: Request, env: Env, url: URL): Promise<Response> {
  const secure = url.protocol === 'https:';
  const web = env.GITHUB_WEB ?? 'https://github.com';
  const apiBase = env.GITHUB_API ?? 'https://api.github.com';
  const redirectUri = `${url.origin}/api/auth/callback`;
  const back = (q = '') => new Response(null, { status: 302, headers: { Location: `/admin/${q}` } });

  if (url.pathname === '/api/auth/logout') {
    return new Response(null, { status: 302, headers: { Location: '/admin/', 'Set-Cookie': cookie(COOKIE, '', 0, secure) } });
  }
  if (!configured(env)) return new Response('Login GitHub belum dikonfigurasi', { status: 503 });

  if (url.pathname === '/api/auth/login') {
    const state = b64url(crypto.getRandomValues(new Uint8Array(24)));
    const auth = new URL(`${web}/login/oauth/authorize`);
    auth.searchParams.set('client_id', env.GITHUB_OAUTH_CLIENT_ID!);
    auth.searchParams.set('redirect_uri', redirectUri);
    auth.searchParams.set('scope', 'read:user user:email');
    auth.searchParams.set('state', state);
    auth.searchParams.set('allow_signup', 'false');
    return new Response(null, {
      status: 302,
      headers: { Location: auth.toString(), 'Set-Cookie': cookie(STATE_COOKIE, state, 600, secure) },
    });
  }

  if (url.pathname === '/api/auth/callback') {
    const state = url.searchParams.get('state');
    const code = url.searchParams.get('code');
    const saved = cookies(request)[STATE_COOKIE];
    if (!code || !state || !saved || !safeEqual(state, saved)) return back('?login=state');

    const tokenRes = await fetch(`${web}/login/oauth/access_token`, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'User-Agent': 'rac-dashboard' },
      body: JSON.stringify({
        client_id: env.GITHUB_OAUTH_CLIENT_ID,
        client_secret: env.GITHUB_OAUTH_CLIENT_SECRET,
        code,
        redirect_uri: redirectUri,
      }),
    });
    const token = ((await tokenRes.json()) as { access_token?: string }).access_token;
    if (!token) return back('?login=token');
    const gh = (path: string) =>
      fetch(`${apiBase}${path}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json', 'User-Agent': 'rac-dashboard' },
      });

    const user = (await (await gh('/user')).json()) as { login?: string };
    const login = (user.login ?? '').toLowerCase();
    let allowed = login !== '' && list(env.ADMIN_GITHUB_USERS).includes(login);
    if (!allowed && env.ADMIN_EMAIL) {
      const emails = (await (await gh('/user/emails')).json()) as { email: string; verified: boolean }[];
      const wanted = list(env.ADMIN_EMAIL);
      allowed = Array.isArray(emails) && emails.some((e) => e.verified && wanted.includes(e.email.toLowerCase()));
    }
    if (!allowed) return back('?login=denied');

    const session = await createSession(env.SESSION_SECRET!, user.login!, SESSION_DAYS);
    const headers = new Headers({ Location: '/admin/' });
    headers.append('Set-Cookie', cookie(COOKIE, session, SESSION_DAYS * 86400, secure));
    headers.append('Set-Cookie', cookie(STATE_COOKIE, '', 0, secure));
    return new Response(null, { status: 302, headers });
  }
  return new Response('Not Found', { status: 404 });
}
