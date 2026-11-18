import type { Env } from './env';

/** Klien GitHub minimal (REST) untuk membaca & meng-commit konten repo. */

export class GitHubError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

/** Hanya path ini yang boleh dibaca/ditulis dari dashboard. */
const ALLOWED = [
  /^src\/content\/(pages|posts)\/(id|en)\/[a-z0-9-]+\.(json|md)$/,
  /^src\/content\/data\/(schedule|accreditations|team|testimonials|faqs)\.json$/,
  /^src\/assets\/images\/[a-z0-9-]+\/[a-z0-9-]+\.(jpg|jpeg|png|webp|avif)$/,
  /^src\/data\/site\.json$/,
  /^public\/_redirects$/,
];
export function assertAllowed(path: string): void {
  if (path.includes('..') || !ALLOWED.some((re) => re.test(path))) throw new GitHubError(`Path tidak diizinkan: ${path}`, 400);
}

export function bytesToBase64(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}
const utf8ToBase64 = (s: string) => bytesToBase64(new TextEncoder().encode(s));
const base64ToUtf8 = (b64: string) => new TextDecoder().decode(Uint8Array.from(atob(b64.replace(/\n/g, '')), (c) => c.charCodeAt(0)));

export class GitHub {
  private base: string;
  constructor(private env: Env) {
    this.base = env.GITHUB_API ?? 'https://api.github.com';
  }

  private async call(path: string, init: RequestInit = {}, accept = 'application/vnd.github+json'): Promise<Response> {
    if (!this.env.GITHUB_TOKEN) throw new GitHubError('GITHUB_TOKEN belum diatur di Cloudflare', 500);
    const res = await fetch(`${this.base}/repos/${this.env.GITHUB_REPO}${path}`, {
      ...init,
      headers: {
        Accept: accept,
        Authorization: `Bearer ${this.env.GITHUB_TOKEN}`,
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'rac-dashboard',
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      },
    });
    if (!res.ok && res.status !== 404) {
      const text = await res.text();
      throw new GitHubError(`GitHub ${res.status}: ${text.slice(0, 300)}`, res.status === 409 || res.status === 422 ? 409 : 502);
    }
    return res;
  }

  /** Daftar file (rekursif) di bawah prefix pada branch konten. */
  async list(prefix: string): Promise<{ path: string; sha: string; size: number }[]> {
    const res = await this.call(`/git/trees/${encodeURIComponent(this.env.GITHUB_BRANCH)}?recursive=1`);
    if (res.status === 404) return [];
    const data = (await res.json()) as { tree: { path: string; type: string; sha: string; size?: number }[] };
    return data.tree
      .filter((t) => t.type === 'blob' && t.path.startsWith(prefix))
      .map((t) => ({ path: t.path, sha: t.sha, size: t.size ?? 0 }));
  }

  async read(path: string): Promise<{ path: string; sha: string; content: string } | null> {
    assertAllowed(path);
    const res = await this.call(`/contents/${path}?ref=${encodeURIComponent(this.env.GITHUB_BRANCH)}`);
    if (res.status === 404) return null;
    const data = (await res.json()) as { sha: string; content: string };
    return { path, sha: data.sha, content: base64ToUtf8(data.content) };
  }

  async raw(path: string): Promise<Response> {
    assertAllowed(path);
    return this.call(`/contents/${path}?ref=${encodeURIComponent(this.env.GITHUB_BRANCH)}`, {}, 'application/vnd.github.raw');
  }

  /** Commit satu file. `sha` wajib untuk update (mencegah menimpa perubahan orang lain). */
  async write(
    path: string,
    opts: { text?: string; base64?: string; sha?: string; message: string; author: string },
  ): Promise<{ sha: string; commit: string }> {
    assertAllowed(path);
    const res = await this.call(`/contents/${path}`, {
      method: 'PUT',
      body: JSON.stringify({
        message: opts.message,
        content: opts.base64 ?? utf8ToBase64(opts.text ?? ''),
        branch: this.env.GITHUB_BRANCH,
        ...(opts.sha ? { sha: opts.sha } : {}),
        committer: { name: 'RAC Dashboard', email: 'dashboard@ropeaccesscenter.id' },
        author: { name: 'RAC Dashboard', email: opts.author.includes('@') ? opts.author : 'dashboard@ropeaccesscenter.id' },
      }),
    });
    const data = (await res.json()) as { content: { sha: string }; commit: { sha: string } };
    return { sha: data.content.sha, commit: data.commit.sha };
  }

  async remove(path: string, sha: string, message: string): Promise<void> {
    assertAllowed(path);
    await this.call(`/contents/${path}`, {
      method: 'DELETE',
      body: JSON.stringify({
        message,
        sha,
        branch: this.env.GITHUB_BRANCH,
        committer: { name: 'RAC Dashboard', email: 'dashboard@ropeaccesscenter.id' },
      }),
    });
  }

  async runs(): Promise<
    { id: number; status: string; conclusion: string | null; created_at: string; html_url: string; head_commit: string }[]
  > {
    const res = await this.call(`/actions/runs?branch=${encodeURIComponent(this.env.GITHUB_BRANCH)}&per_page=8`);
    if (res.status === 404) return [];
    const data = (await res.json()) as {
      workflow_runs: {
        id: number;
        status: string;
        conclusion: string | null;
        created_at: string;
        html_url: string;
        head_commit?: { message?: string };
      }[];
    };
    return data.workflow_runs.map((r) => ({
      id: r.id,
      status: r.status,
      conclusion: r.conclusion,
      created_at: r.created_at,
      html_url: r.html_url,
      head_commit: (r.head_commit?.message ?? '').split('\n')[0] ?? '',
    }));
  }
}
