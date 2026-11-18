import type { Env } from './env';
import { AuthError, requireAdmin } from './auth';
import { GitHub, GitHubError, bytesToBase64 } from './github';

/**
 * API dashboard /api/admin/* — semua rute wajib lolos requireAdmin().
 * Perubahan konten = commit ke GitHub → CI build & deploy otomatis (±1–3 menit).
 */

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });

const MAX_UPLOAD = 8 * 1024 * 1024;
const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'gambar';

export async function handleAdmin(request: Request, env: Env, url: URL): Promise<Response> {
  // Cegah CSRF: permintaan yang mengubah data harus dari origin yang sama.
  if (request.method !== 'GET') {
    const origin = request.headers.get('origin');
    if (!origin || new URL(origin).host !== url.host) return json({ error: 'Origin tidak valid' }, 403);
  }

  let email: string;
  try {
    email = await requireAdmin(request, env);
  } catch (e) {
    return json({ error: e instanceof AuthError ? e.message : 'Tidak diizinkan' }, 401);
  }

  const gh = new GitHub(env);
  const route = url.pathname.replace(/^\/api\/admin/, '').replace(/\/$/, '') || '/';

  try {
    // ---- Profil & status ----
    if (route === '/me' && request.method === 'GET') {
      return json({ email, repo: env.GITHUB_REPO, branch: env.GITHUB_BRANCH, github: Boolean(env.GITHUB_TOKEN), db: Boolean(env.DB) });
    }
    if (route === '/deploys' && request.method === 'GET') return json(await gh.runs());

    // ---- File konten ----
    if (route === '/files' && request.method === 'GET') {
      const dir = url.searchParams.get('dir') ?? '';
      if (!/^(src\/content\/(pages|posts|data)|src\/assets\/images)(\/|$)/.test(dir)) return json({ error: 'Folder tidak diizinkan' }, 400);
      return json(await gh.list(dir));
    }
    if (route === '/file') {
      const path = url.searchParams.get('path') ?? '';
      if (request.method === 'GET') {
        const file = await gh.read(path);
        return file ? json(file) : json({ error: 'File tidak ditemukan' }, 404);
      }
      if (request.method === 'PUT') {
        const body = (await request.json()) as { content: string; sha?: string; message?: string };
        if (typeof body.content !== 'string' || body.content.length > 500_000) return json({ error: 'Konten tidak valid' }, 400);
        if (path.endsWith('.json')) {
          try {
            JSON.parse(body.content);
          } catch {
            return json({ error: 'JSON tidak valid' }, 400);
          }
        }
        const res = await gh.write(path, {
          text: body.content,
          sha: body.sha,
          message: body.message || `Dashboard: perbarui ${path}`,
          author: email,
        });
        return json(res);
      }
      if (request.method === 'DELETE') {
        if (!path.startsWith('src/content/posts/')) return json({ error: 'Hanya artikel yang bisa dihapus' }, 400);
        const sha = url.searchParams.get('sha');
        if (!sha) return json({ error: 'sha wajib' }, 400);
        await gh.remove(path, sha, `Dashboard: hapus ${path}`);
        return json({ ok: true });
      }
    }

    // ---- Media ----
    if (route === '/media' && request.method === 'POST') {
      const form = await request.formData();
      const file = form.get('file');
      const folder = slugify(String(form.get('folder') ?? 'uploads'));
      if (!(file instanceof File)) return json({ error: 'File wajib' }, 400);
      if (file.size > MAX_UPLOAD) return json({ error: 'Maksimal 8 MB per gambar' }, 413);
      const ext = ({ 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/avif': 'avif' } as Record<string, string>)[
        file.type
      ];
      if (!ext) return json({ error: 'Format harus JPG, PNG, WebP, atau AVIF' }, 415);
      const base = slugify(String(form.get('name') ?? file.name.replace(/\.[^.]+$/, '')));
      let path = `src/assets/images/${folder}/${base}.${ext}`;
      if (await gh.read(path).catch(() => null)) path = `src/assets/images/${folder}/${base}-${Date.now().toString(36)}.${ext}`;
      const bytes = new Uint8Array(await file.arrayBuffer());
      await gh.write(path, { base64: bytesToBase64(bytes), message: `Dashboard: unggah ${path}`, author: email });
      return json({ path, image: path.replace('src/assets/images/', '') });
    }
    if (route === '/media/raw' && request.method === 'GET') {
      const path = url.searchParams.get('path') ?? '';
      const res = await gh.raw(path);
      if (res.status === 404) return new Response('Not found', { status: 404 });
      const ext = path.split('.').pop() ?? 'jpg';
      return new Response(res.body, {
        headers: { 'Content-Type': `image/${ext === 'jpg' ? 'jpeg' : ext}`, 'Cache-Control': 'private, max-age=3600' },
      });
    }

    // ---- Pesan masuk (D1) ----
    if (route === '/messages' && request.method === 'GET') {
      if (!env.DB) return json({ items: [], counts: {}, db: false });
      const status = url.searchParams.get('status');
      const stmt = status
        ? env.DB.prepare('SELECT * FROM contact_messages WHERE status = ?1 ORDER BY created_at DESC LIMIT 200').bind(status)
        : env.DB.prepare('SELECT * FROM contact_messages ORDER BY created_at DESC LIMIT 200');
      const [{ results }, counts] = await Promise.all([
        stmt.all(),
        env.DB.prepare('SELECT status, COUNT(*) AS n FROM contact_messages GROUP BY status').all<{ status: string; n: number }>(),
      ]);
      return json({ items: results, counts: Object.fromEntries(counts.results.map((r) => [r.status, r.n])), db: true });
    }
    const msg = route.match(/^\/messages\/(\d+)$/);
    if (msg && request.method === 'PATCH') {
      if (!env.DB) return json({ error: 'Database belum dikonfigurasi' }, 503);
      const { status } = (await request.json()) as { status: string };
      if (!['baru', 'dihubungi', 'selesai', 'spam'].includes(status)) return json({ error: 'Status tidak valid' }, 400);
      await env.DB.prepare('UPDATE contact_messages SET status = ?1 WHERE id = ?2').bind(status, Number(msg[1])).run();
      return json({ ok: true });
    }

    return json({ error: 'Tidak ditemukan' }, 404);
  } catch (e) {
    if (e instanceof GitHubError) return json({ error: e.message }, e.status);
    console.error(e);
    return json({ error: 'Kesalahan server' }, 500);
  }
}
