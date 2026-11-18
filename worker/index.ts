/**
 * Worker Rope Access Center.
 * - Halaman & aset statis dilayani langsung oleh Cloudflare (Workers Static Assets);
 *   Worker ini hanya dijalankan untuk /api/* (lihat run_worker_first di wrangler.jsonc).
 * - POST /api/contact : simpan formulir ke D1 lalu redirect 303 ke WhatsApp dengan pesan terisi.
 *   Bekerja tanpa JavaScript di browser (form HTML biasa).
 * - /api/auth/*  : login dashboard dengan GitHub (lihat worker/auth.ts).
 * - /api/admin/* : API dashboard (lihat worker/admin.ts).
 */

import type { Env } from './env';
import { handleAdmin } from './admin';
import { handleAuth } from './auth';

const LIMITS = { name: 80, phone: 20, service: 60, message: 1000, page: 200 } as const;

type FormValue = string | File | null;

function clean(value: FormValue, max: number): string {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim().slice(0, max) : '';
}

function cleanMultiline(value: FormValue, max: number): string {
  return typeof value === 'string'
    ? value
        .replace(/\r\n?/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim()
        .slice(0, max)
    : '';
}

function redirect(location: string): Response {
  return new Response(null, { status: 303, headers: { Location: location, 'Cache-Control': 'no-store' } });
}

async function handleContact(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  const url = new URL(request.url);
  const contentType = request.headers.get('content-type') ?? '';
  if (!contentType.includes('application/x-www-form-urlencoded') && !contentType.includes('multipart/form-data')) {
    return new Response('Unsupported Media Type', { status: 415 });
  }
  // Hanya terima kiriman dari situs sendiri.
  const origin = request.headers.get('origin');
  if (origin && new URL(origin).host !== url.host) return new Response('Forbidden', { status: 403 });

  const form = await request.formData();
  const locale = clean(form.get('locale'), 2) === 'en' ? 'en' : 'id';
  const page = clean(form.get('page'), LIMITS.page);
  const back = page.startsWith('/') ? page : locale === 'en' ? '/en/contact/' : '/kontak/';

  // Honeypot: bot mengisi field tersembunyi -> abaikan diam-diam.
  if (clean(form.get('website'), 100)) return redirect(back);

  const name = clean(form.get('name'), LIMITS.name);
  const phone = clean(form.get('phone'), LIMITS.phone).replace(/[^\d+\s-]/g, '');
  const service = clean(form.get('service'), LIMITS.service);
  const message = cleanMultiline(form.get('message'), LIMITS.message);
  if (!name || !message) return redirect(`${back}?error=required#form`);

  // Anti-spam Cloudflare Turnstile (hanya bila secret diatur).
  if (env.TURNSTILE_SECRET) {
    const body = new FormData();
    body.set('secret', env.TURNSTILE_SECRET);
    body.set('response', clean(form.get('cf-turnstile-response'), 2048));
    const ip = request.headers.get('CF-Connecting-IP');
    if (ip) body.set('remoteip', ip);
    const verify = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body })
      .then((r) => r.json() as Promise<{ success: boolean }>)
      .catch(() => ({ success: false }));
    if (!verify.success) return redirect(`${back}?error=captcha#form`);
  }

  if (env.DB) {
    const cf = (request as Request & { cf?: { country?: string; city?: string } }).cf;
    const insert = env.DB.prepare(
      `INSERT INTO contact_messages (locale, page, name, phone, service, message, country, city, user_agent)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)`,
    )
      .bind(
        locale,
        page,
        name,
        phone || null,
        service || null,
        message,
        cf?.country ?? null,
        cf?.city ?? null,
        (request.headers.get('user-agent') ?? '').slice(0, 300),
      )
      .run()
      .catch((err: unknown) => console.error('D1 insert gagal', err));
    // Jangan tahan pengunjung menunggu database; WhatsApp tetap terbuka.
    ctx.waitUntil(insert);
  } else {
    console.warn('Binding D1 "DB" belum dikonfigurasi; pesan tidak tercatat.');
  }

  const en = locale === 'en';
  const header = [
    en ? `Hello RAC, my name is ${name}.` : `Halo RAC, saya ${name}.`,
    ...(service ? [en ? `Interest: ${service}` : `Kebutuhan: ${service}`] : []),
    ...(phone ? [en ? `WhatsApp: ${phone}` : `No. WA: ${phone}`] : []),
  ];
  const text = `${header.join('\n')}\n\n${message}`;
  return redirect(`https://wa.me/${env.WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`);
}

export default {
  async fetch(request, env, ctx): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/api/contact' || url.pathname === '/api/contact/') {
      if (request.method !== 'POST') return new Response('Method Not Allowed', { status: 405, headers: { Allow: 'POST' } });
      return handleContact(request, env, ctx);
    }
    if (url.pathname.startsWith('/api/auth/')) return handleAuth(request, env, url);
    if (url.pathname.startsWith('/api/admin/')) return handleAdmin(request, env, url);
    if (url.pathname.startsWith('/api/')) return new Response('Not Found', { status: 404 });
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
