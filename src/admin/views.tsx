import { useEffect, useMemo, useState } from 'preact/hooks';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';
import { marked } from 'marked';
import { z } from 'astro/zod';
import { dataCollections, pageSchema, postSchema, siteSchema, type DataCollection } from '@/content/schema';
import { api, type FileEntry, type Me, type Message, type Run } from './api';
import { ObjectFields, TechnicalFields } from './form';
import { MediaGrid } from './media';
import { navigate, useStatic, useToast } from './state';

/* ---------------- util ---------------- */
const PAGE_TECH = ['translationKey', 'slug', 'template', 'contentStatus'];
const POST_TECH = ['translationKey', 'slug'];
const btn = 'inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition disabled:opacity-50';
const btnDark = `${btn} bg-navy-900 text-white hover:bg-navy-700`;
const btnLight = `${btn} bg-white text-navy-900 ring-1 ring-black/15 hover:bg-brand-50`;
const card = 'min-w-0 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-black/5 sm:p-6';
const today = () => new Date().toISOString().slice(0, 10);
const publicPath = (locale: string, slug: string) => `${locale === 'en' ? '/en' : ''}/${slug ? `${slug}/` : ''}`;
const fileLocale = (path: string) => path.split('/')[3] ?? 'id';

function useAsync<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const [state, set] = useState<{ data?: T; error?: string; loading: boolean }>({ loading: true });
  const run = () => {
    set((s) => ({ ...s, loading: true }));
    fn()
      .then((data) => set({ data, loading: false }))
      .catch((e: Error) => set({ error: e.message, loading: false }));
  };
  useEffect(run, deps);
  return { ...state, reload: run };
}

export function Loading({ text = 'Memuat…' }: { text?: string }) {
  return <p class="py-10 text-center text-sm text-muted">{text}</p>;
}
export function ErrorBox({ text }: { text: string }) {
  return <p class="rounded-xl bg-red-50 p-4 text-sm text-red-700 ring-1 ring-red-200">{text}</p>;
}
function Issues({ issues }: { issues: { path: PropertyKey[]; message: string }[] }) {
  if (!issues.length) return null;
  return (
    <div class="rounded-xl bg-red-50 p-4 text-sm text-red-800 ring-1 ring-red-200">
      <p class="font-semibold">Perbaiki dulu sebelum menyimpan:</p>
      <ul class="mt-2 list-disc space-y-1 pl-5">
        {issues.slice(0, 12).map((i) => (
          <li>
            <code class="text-xs">{i.path.join(' › ') || '(root)'}</code>: {i.message}
          </li>
        ))}
      </ul>
    </div>
  );
}
function Header({ title, children }: { title: string; children?: preact.ComponentChildren }) {
  return (
    <div class="mb-6 flex flex-wrap items-center justify-between gap-3">
      <h1 class="text-2xl font-bold text-navy-900">{title}</h1>
      <div class="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}
function RunBadge({ r }: { r: Run }) {
  const map: Record<string, string> = {
    success: 'bg-green-100 text-green-800',
    failure: 'bg-red-100 text-red-800',
    cancelled: 'bg-gray-100 text-gray-700',
  };
  const label =
    r.status !== 'completed'
      ? 'berjalan'
      : r.conclusion === 'success'
        ? 'berhasil'
        : r.conclusion === 'failure'
          ? 'gagal'
          : (r.conclusion ?? r.status);
  return (
    <span
      class={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${r.status !== 'completed' ? 'bg-amber-100 text-amber-800' : (map[r.conclusion ?? ''] ?? 'bg-gray-100 text-gray-700')}`}
    >
      {label}
    </span>
  );
}

/* ---------------- Ringkasan ---------------- */
export function Overview({ me }: { me: Me }) {
  const runs = useAsync(() => api.deploys());
  const msgs = useAsync(() => api.messages());
  return (
    <>
      <Header title="Ringkasan" />
      {(!me.github || !me.db) && (
        <div class="mb-6 rounded-xl bg-amber-50 p-4 text-sm text-amber-900 ring-1 ring-amber-200">
          {!me.github && <p>⚠ GITHUB_TOKEN belum diatur — dashboard belum bisa menyimpan perubahan.</p>}
          {!me.db && <p>⚠ Database D1 belum terhubung — pesan formulir belum tercatat.</p>}
        </div>
      )}
      <div class="grid gap-6 lg:grid-cols-3">
        <div class={card}>
          <p class="text-sm text-muted">Pesan baru</p>
          <p class="mt-1 text-4xl font-bold text-brand-700">{msgs.data?.counts?.baru ?? 0}</p>
          <a href="#/messages" class="mt-3 inline-block text-sm font-semibold text-brand-800 hover:underline">
            Buka pesan masuk →
          </a>
        </div>
        <div class={`${card} lg:col-span-2`}>
          <div class="flex items-center justify-between">
            <p class="font-semibold text-navy-900">Build & deploy terakhir</p>
            <button class="text-xs text-muted hover:underline" onClick={runs.reload}>
              Muat ulang
            </button>
          </div>
          {runs.loading ? (
            <Loading />
          ) : runs.error ? (
            <ErrorBox text={runs.error} />
          ) : (
            <ul class="mt-3 divide-y divide-black/5 text-sm">
              {(runs.data ?? []).map((r) => (
                <li class="flex flex-col gap-1 py-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                  <span class="min-w-0 truncate">{r.head_commit || `Run #${r.id}`}</span>
                  <span class="flex shrink-0 items-center gap-3 text-xs text-muted">
                    {new Date(r.created_at).toLocaleString('id-ID')}
                    <RunBadge r={r} />
                  </span>
                </li>
              ))}
            </ul>
          )}
          <p class="mt-3 text-xs break-words text-muted">
            Setiap penyimpanan membuat commit ke <code class="break-all">{me.repo}</code> ({me.branch}); situs diperbarui otomatis setelah
            build berhasil (±1–3 menit).
          </p>
        </div>
      </div>
      <div class="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ['#/pages', 'Edit halaman'],
          ['#/posts', 'Tulis artikel'],
          ['#/media', 'Kelola media'],
          ['#/settings', 'Data bisnis'],
        ].map(([h, l]) => (
          <a href={h} class={`${card} font-semibold text-navy-900 hover:ring-brand-400`}>
            {l} →
          </a>
        ))}
      </div>
    </>
  );
}

/* ---------------- Halaman ---------------- */
export function PagesList() {
  const files = useAsync(() => api.files('src/content/pages'));
  const { links } = useStatic();
  const titleOf = (f: FileEntry) => {
    const slug = f.path.split('/').pop()!.replace('.json', '');
    const l = links.find((x) => x.path === `/${slug === 'home' ? '' : `${slug}/`}`);
    return fileLocale(f.path) === 'id' && l ? l.title : slug;
  };
  if (files.loading) return <Loading />;
  if (files.error) return <ErrorBox text={files.error} />;
  return (
    <>
      <Header title="Halaman" />
      <div class="grid gap-6 lg:grid-cols-2">
        {['id', 'en'].map((loc) => (
          <div class={card}>
            <h2 class="font-semibold text-navy-900">{loc === 'id' ? 'Bahasa Indonesia' : 'English'}</h2>
            <ul class="mt-3 divide-y divide-black/5">
              {files
                .data!.filter((f) => fileLocale(f.path) === loc)
                .map((f) => (
                  <li>
                    <a
                      href={`#/pages/edit?path=${encodeURIComponent(f.path)}`}
                      class="flex items-center justify-between gap-3 py-2 text-sm hover:text-brand-700"
                    >
                      <span class="truncate">{titleOf(f)}</span>
                      <span class="shrink-0 text-xs text-muted">{f.path.split('/').pop()}</span>
                    </a>
                  </li>
                ))}
            </ul>
          </div>
        ))}
      </div>
    </>
  );
}

function useEditor<T>(path: string, decode: (s: string) => T) {
  const [state, set] = useState<{ sha?: string; data?: T; error?: string; dirty: boolean }>({ dirty: false });
  useEffect(() => {
    api
      .read(path)
      .then((f) => set({ sha: f.sha, data: decode(f.content), dirty: false }))
      .catch((e: Error) => set({ error: e.message, dirty: false }));
  }, [path]);
  return [state, set] as const;
}

export function PageEditor({ path }: { path: string }) {
  const statics = useStatic();
  const toast = useToast();
  const [st, set] = useEditor(path, (s) => JSON.parse(s) as Record<string, unknown>);
  const [saving, setSaving] = useState(false);
  const parsed = useMemo(() => (st.data ? pageSchema.safeParse(st.data) : undefined), [st.data]);
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (st.dirty) e.preventDefault();
    };
    addEventListener('beforeunload', warn);
    return () => removeEventListener('beforeunload', warn);
  }, [st.dirty]);
  if (st.error) return <ErrorBox text={st.error} />;
  if (!st.data) return <Loading />;
  const data = st.data;
  const loc = fileLocale(path);
  const save = async () => {
    if (!parsed?.success) return;
    setSaving(true);
    try {
      const next = { ...data, updatedAt: today() };
      const res = await api.write(
        path,
        `${JSON.stringify(next, null, 2)}\n`,
        st.sha,
        `Dashboard: perbarui halaman ${String(data.slug) || 'beranda'} (${loc})`,
      );
      set({ sha: res.sha, data: next, dirty: false });
      toast({ kind: 'ok', text: 'Tersimpan. Situs diperbarui setelah build selesai (±1–3 menit).' });
    } catch (e) {
      toast({ kind: 'err', text: (e as Error).message });
    } finally {
      setSaving(false);
    }
  };
  return (
    <>
      <Header title={String((data.hero as { title?: string })?.title ?? 'Halaman')}>
        <a class={btnLight} href={publicPath(loc, String(data.slug ?? ''))} target="_blank" rel="noopener">
          Lihat di situs ↗
        </a>
        <button class={btnDark} disabled={saving || !st.dirty || !parsed?.success} onClick={save}>
          {saving ? 'Menyimpan…' : st.dirty ? 'Simpan & terbitkan' : 'Tersimpan'}
        </button>
      </Header>
      <p class="mb-4 text-xs break-all text-muted">
        {path} · {loc.toUpperCase()}
      </p>
      {parsed && !parsed.success && (
        <div class="mb-4">
          <Issues issues={parsed.error.issues} />
        </div>
      )}
      <div class={card}>
        <ObjectFields
          schema={statics.page}
          value={data}
          onChange={(v) => set((s) => ({ ...s, data: v as Record<string, unknown>, dirty: true }))}
          hide={['updatedAt', ...PAGE_TECH]}
        />
        <TechnicalFields
          schema={statics.page}
          value={data}
          onChange={(v) => set((s) => ({ ...s, data: v as Record<string, unknown>, dirty: true }))}
          keys={PAGE_TECH}
        />
      </div>
    </>
  );
}

/* ---------------- Artikel ---------------- */
function splitMd(src: string): { fm: Record<string, unknown>; body: string } {
  const m = src.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!m) return { fm: {}, body: src };
  return { fm: (parseYaml(m[1]!) ?? {}) as Record<string, unknown>, body: m[2]!.replace(/^\n/, '') };
}
const joinMd = (fm: Record<string, unknown>, body: string) => `---\n${stringifyYaml(fm, { lineWidth: 0 }).trim()}\n---\n\n${body.trim()}\n`;
const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 90);

export function PostsList() {
  const files = useAsync(() => api.files('src/content/posts'));
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [loc, setLoc] = useState('id');
  const toast = useToast();
  const create = async () => {
    const slug = slugify(title);
    if (!slug) return;
    const path = `src/content/posts/${loc}/${slug}.md`;
    const fm = {
      translationKey: `post-${slug}`.slice(0, 60),
      slug,
      title,
      seo: {
        title: title.slice(0, 60),
        description:
          `${title}. Panduan praktis akses tali dari Rope Access Center: pelatihan, sertifikasi, dan keselamatan kerja di ketinggian.`.slice(
            0,
            160,
          ),
      },
      excerpt: 'Ringkasan artikel…',
      category: 'keselamatan',
      publishedAt: today(),
      draft: true,
    };
    try {
      await api.write(path, joinMd(fm, '## Subjudul pertama\n\nTulis isi artikel di sini.'), undefined, `Dashboard: artikel baru ${slug}`);
      toast({ kind: 'ok', text: 'Draf artikel dibuat.' });
      navigate(`#/posts/edit?path=${encodeURIComponent(path)}`);
    } catch (e) {
      toast({ kind: 'err', text: (e as Error).message });
    }
  };
  if (files.loading) return <Loading />;
  if (files.error) return <ErrorBox text={files.error} />;
  return (
    <>
      <Header title="Artikel">
        <button class={btnDark} onClick={() => setCreating(true)}>
          + Artikel baru
        </button>
      </Header>
      {creating && (
        <div class={`${card} mb-6 flex flex-wrap items-end gap-3`}>
          <label class="min-w-64 flex-1 text-sm font-medium">
            Judul
            <input
              class="mt-1 block w-full rounded-lg px-3 py-2 ring-1 ring-black/15"
              value={title}
              onInput={(e) => setTitle((e.target as HTMLInputElement).value)}
            />
          </label>
          <label class="text-sm font-medium">
            Bahasa
            <select
              class="mt-1 block rounded-lg px-3 py-2 ring-1 ring-black/15"
              value={loc}
              onChange={(e) => setLoc((e.target as HTMLSelectElement).value)}
            >
              <option value="id">ID</option>
              <option value="en">EN</option>
            </select>
          </label>
          <button class={btnDark} disabled={!slugify(title)} onClick={create}>
            Buat draf
          </button>
          <p class="w-full text-xs text-muted">URL: {publicPath(loc, slugify(title) || '…')}</p>
        </div>
      )}
      <div class={card}>
        <ul class="divide-y divide-black/5">
          {files.data!.map((f) => (
            <li>
              <a
                href={`#/posts/edit?path=${encodeURIComponent(f.path)}`}
                class="flex items-center justify-between gap-3 py-2.5 text-sm hover:text-brand-700"
              >
                <span class="truncate">{f.path.split('/').pop()!.replace('.md', '')}</span>
                <span class="shrink-0 rounded bg-sand px-2 py-0.5 text-xs uppercase">{fileLocale(f.path)}</span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
}

export function PostEditor({ path }: { path: string }) {
  const statics = useStatic();
  const toast = useToast();
  const [st, set] = useEditor(path, splitMd);
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(false);
  const parsed = useMemo(() => (st.data ? postSchema.safeParse(st.data.fm) : undefined), [st.data]);
  if (st.error) return <ErrorBox text={st.error} />;
  if (!st.data) return <Loading />;
  const { fm, body } = st.data;
  const loc = fileLocale(path);
  const update = (next: { fm: Record<string, unknown>; body: string }) => set((s) => ({ ...s, data: next, dirty: true }));
  const save = async () => {
    setSaving(true);
    try {
      const nextFm = { ...fm, ...(fm.publishedAt && String(fm.publishedAt) !== today() ? { updatedAt: today() } : {}) };
      const res = await api.write(path, joinMd(nextFm, body), st.sha, `Dashboard: perbarui artikel ${String(fm.slug)}`);
      set({ sha: res.sha, data: { fm: nextFm, body }, dirty: false });
      toast({ kind: 'ok', text: 'Tersimpan. Situs diperbarui setelah build selesai (±1–3 menit).' });
    } catch (e) {
      toast({ kind: 'err', text: (e as Error).message });
    } finally {
      setSaving(false);
    }
  };
  const remove = async () => {
    if (!st.sha || !confirm('Hapus artikel ini secara permanen? URL-nya akan menjadi 404.')) return;
    try {
      await api.remove(path, st.sha);
      toast({ kind: 'ok', text: 'Artikel dihapus.' });
      navigate('#/posts');
    } catch (e) {
      toast({ kind: 'err', text: (e as Error).message });
    }
  };
  return (
    <>
      <Header title={String(fm.title ?? 'Artikel')}>
        <a class={btnLight} href={publicPath(loc, String(fm.slug ?? ''))} target="_blank" rel="noopener">
          Lihat ↗
        </a>
        <button class={`${btn} text-red-700 ring-1 ring-red-200 hover:bg-red-50`} onClick={remove}>
          Hapus
        </button>
        <button class={btnDark} disabled={saving || !st.dirty || !parsed?.success} onClick={save}>
          {saving ? 'Menyimpan…' : st.dirty ? 'Simpan & terbitkan' : 'Tersimpan'}
        </button>
      </Header>
      {parsed && !parsed.success && (
        <div class="mb-4">
          <Issues issues={parsed.error.issues} />
        </div>
      )}
      <div class="grid gap-6 xl:grid-cols-5">
        <div class={`${card} xl:col-span-3`}>
          <div class="mb-3 flex items-center justify-between">
            <h2 class="font-semibold text-navy-900">Isi artikel (Markdown)</h2>
            <button class="text-sm font-semibold text-brand-800 hover:underline" onClick={() => setPreview(!preview)}>
              {preview ? 'Edit' : 'Pratinjau'}
            </button>
          </div>
          {preview ? (
            <div
              class="prose max-w-none space-y-4 [&_h2]:text-xl [&_h2]:font-bold [&_h3]:font-semibold"
              dangerouslySetInnerHTML={{ __html: marked.parse(body, { async: false }) as string }}
            />
          ) : (
            <textarea
              class="block min-h-[32rem] w-full rounded-lg px-3 py-2 font-mono text-sm ring-1 ring-black/15"
              value={body}
              onInput={(e) => update({ fm, body: (e.target as HTMLTextAreaElement).value })}
            />
          )}
          <p class="mt-2 text-xs text-muted">
            Gunakan ## untuk subjudul (otomatis masuk Daftar Isi), **tebal**, *miring*, [tautan](/jasa-arsitek/).
          </p>
        </div>
        <div class={`${card} xl:col-span-2`}>
          <ObjectFields
            schema={statics.post}
            value={fm}
            onChange={(v) => update({ fm: v as Record<string, unknown>, body })}
            hide={POST_TECH}
          />
          <TechnicalFields
            schema={statics.post}
            value={fm}
            onChange={(v) => update({ fm: v as Record<string, unknown>, body })}
            keys={POST_TECH}
          />
        </div>
      </div>
    </>
  );
}

/* ---------------- Media ---------------- */
export function MediaView() {
  return (
    <>
      <Header title="Media" />
      <p class="mb-4 text-sm text-muted">
        Klik gambar untuk menyalin path-nya. Semua gambar disimpan di repo (<code>src/assets/images</code>) dan dioptimasi otomatis ke
        AVIF/WebP saat build.
      </p>
      <div class={card}>
        <MediaGrid />
      </div>
    </>
  );
}

/* ---------------- Pesan masuk ---------------- */
const STATUSES = ['baru', 'dihubungi', 'selesai', 'spam'];
const waLink = (phone: string | null) => {
  if (!phone) return null;
  const d = phone.replace(/\D/g, '').replace(/^0/, '62');
  return d.length >= 9 ? `https://wa.me/${d}` : null;
};
export function Messages() {
  const [filter, setFilter] = useState<string>('');
  const res = useAsync(() => api.messages(filter || undefined), [filter]);
  const toast = useToast();
  const setStatus = async (m: Message, status: string) => {
    try {
      await api.setMessageStatus(m.id, status);
      res.reload();
    } catch (e) {
      toast({ kind: 'err', text: (e as Error).message });
    }
  };
  return (
    <>
      <Header title="Pesan Masuk">
        {['', ...STATUSES].map((s) => (
          <button class={s === filter ? btnDark : btnLight} onClick={() => setFilter(s)}>
            {s || 'Semua'} {s && res.data?.counts?.[s] ? `(${res.data.counts[s]})` : ''}
          </button>
        ))}
      </Header>
      {res.loading ? (
        <Loading />
      ) : res.error ? (
        <ErrorBox text={res.error} />
      ) : !res.data!.db ? (
        <ErrorBox text="Database D1 belum terhubung. Lihat docs/DASHBOARD.md." />
      ) : res.data!.items.length === 0 ? (
        <p class={`${card} text-center text-sm text-muted`}>Belum ada pesan.</p>
      ) : (
        <ul class="space-y-3">
          {res.data!.items.map((m) => (
            <li class={card}>
              <div class="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p class="font-semibold text-navy-900">
                    {m.name} {m.service && <span class="ml-2 rounded bg-brand-50 px-2 py-0.5 text-xs text-brand-800">{m.service}</span>}
                  </p>
                  <p class="text-xs text-muted">
                    {new Date(m.created_at).toLocaleString('id-ID')} · {m.page} · {m.locale.toUpperCase()}
                    {m.city ? ` · ${m.city}` : ''}
                  </p>
                </div>
                <div class="flex items-center gap-2">
                  {waLink(m.phone) && (
                    <a class={`${btn} bg-[#25D366] text-white`} href={waLink(m.phone)!} target="_blank" rel="noopener">
                      Balas WA {m.phone}
                    </a>
                  )}
                  <select
                    class="rounded-lg px-3 py-2 text-sm ring-1 ring-black/15"
                    value={m.status}
                    onChange={(e) => setStatus(m, (e.target as HTMLSelectElement).value)}
                  >
                    {STATUSES.map((s) => (
                      <option value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>
              <p class="mt-3 whitespace-pre-line text-sm text-ink">{m.message}</p>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

/* ---------------- Pengaturan (site.json) & redirect ---------------- */
export function Settings() {
  const statics = useStatic();
  const toast = useToast();
  const path = 'src/data/site.json';
  const [st, set] = useEditor(path, (s) => JSON.parse(s) as Record<string, unknown>);
  const [saving, setSaving] = useState(false);
  const parsed = useMemo(() => (st.data ? siteSchema.safeParse(st.data) : undefined), [st.data]);
  if (st.error) return <ErrorBox text={st.error} />;
  if (!st.data) return <Loading />;
  const save = async () => {
    setSaving(true);
    try {
      const res = await api.write(path, `${JSON.stringify(st.data, null, 2)}\n`, st.sha, 'Dashboard: perbarui data bisnis');
      set((s) => ({ ...s, sha: res.sha, dirty: false }));
      toast({ kind: 'ok', text: 'Data bisnis tersimpan.' });
    } catch (e) {
      toast({ kind: 'err', text: (e as Error).message });
    } finally {
      setSaving(false);
    }
  };
  return (
    <>
      <Header title="Data Bisnis">
        <button class={btnDark} disabled={saving || !st.dirty || !parsed?.success} onClick={save}>
          {saving ? 'Menyimpan…' : 'Simpan'}
        </button>
      </Header>
      <p class="mb-4 text-sm text-muted">
        Nama, kontak, alamat, jam buka, dan media sosial dipakai di seluruh situs, data terstruktur Google, dan llms.txt.
      </p>
      {parsed && !parsed.success && (
        <div class="mb-4">
          <Issues issues={parsed.error.issues} />
        </div>
      )}
      <div class={card}>
        <ObjectFields
          schema={statics.site}
          value={st.data}
          onChange={(v) => set((s) => ({ ...s, data: v as Record<string, unknown>, dirty: true }))}
        />
      </div>
    </>
  );
}

export function Redirects() {
  const toast = useToast();
  const path = 'public/_redirects';
  const [st, set] = useEditor(path, (s) => s);
  const [saving, setSaving] = useState(false);
  if (st.error) return <ErrorBox text={st.error} />;
  if (st.data === undefined) return <Loading />;
  const bad = st.data
    .split('\n')
    .map((l, i) => [l.trim(), i + 1] as const)
    .filter(([l]) => l && !l.startsWith('#') && !/^\S+\s+\S+(\s+(301|302|307|308|200))?$/.test(l));
  const save = async () => {
    setSaving(true);
    try {
      const res = await api.write(path, st.data!.endsWith('\n') ? st.data! : `${st.data}\n`, st.sha, 'Dashboard: perbarui redirect');
      set((s) => ({ ...s, sha: res.sha, dirty: false }));
      toast({ kind: 'ok', text: 'Redirect tersimpan.' });
    } catch (e) {
      toast({ kind: 'err', text: (e as Error).message });
    } finally {
      setSaving(false);
    }
  };
  return (
    <>
      <Header title="Redirect">
        <button class={btnDark} disabled={saving || !st.dirty || bad.length > 0} onClick={save}>
          {saving ? 'Menyimpan…' : 'Simpan'}
        </button>
      </Header>
      <p class="mb-4 text-sm text-muted">
        Format per baris: <code>/url-lama/ /url-baru/ 301</code>. Gunakan untuk URL yang dihapus atau diganti agar SEO tidak hilang.
      </p>
      {bad.length > 0 && (
        <div class="mb-4">
          <ErrorBox text={`Format salah di baris: ${bad.map(([, n]) => n).join(', ')}`} />
        </div>
      )}
      <textarea
        class="block min-h-[28rem] w-full rounded-2xl bg-white p-4 font-mono text-sm ring-1 ring-black/10"
        value={st.data}
        onInput={(e) => set((s) => ({ ...s, data: (e.target as HTMLTextAreaElement).value, dirty: true }))}
      />
    </>
  );
}

/* ---------------- Koleksi data (jadwal, tim, testimoni, akreditasi, FAQ) ---------------- */
const DATA_HELP: Record<DataCollection, string> = {
  schedule:
    'Satu baris = satu kelas. Kelas yang tanggal selesainya sudah lewat otomatis disembunyikan dari situs. "Program" diisi kunci terjemahan halaman pelatihan, mis. course-tkpk-1.',
  accreditations: 'Lembaga & standar yang ditampilkan di Beranda, Tentang Kami, dan Sertifikasi.',
  team: 'Profil instruktur & staf. Centang "Data contoh" hanya untuk data sementara — data contoh tidak tampil di situs live.',
  testimonials: 'Testimoni klien. Pastikan sudah ada izin dari yang bersangkutan. Data contoh tidak tampil di situs live.',
  faqs: 'Tanya-jawab dua bahasa. Dipakai di halaman FAQ, Pelatihan, Sertifikasi, Layanan, Kontak, dan data terstruktur Google.',
};
export function DataEditor({ name }: { name: DataCollection }) {
  const statics = useStatic();
  const toast = useToast();
  const path = `src/content/data/${name}.json`;
  const [st, set] = useEditor(path, (s) => ({ items: JSON.parse(s) as unknown[] }));
  const [saving, setSaving] = useState(false);
  const schema = useMemo(() => z.object({ items: z.array(dataCollections[name].item) }), [name]);
  const parsed = useMemo(() => (st.data ? schema.safeParse(st.data) : undefined), [st.data, schema]);
  const meta = statics.data[name];
  if (st.error) return <ErrorBox text={st.error} />;
  if (!st.data || !meta) return <Loading />;
  const save = async () => {
    setSaving(true);
    try {
      const res = await api.write(
        path,
        `${JSON.stringify(st.data!.items, null, 2)}\n`,
        st.sha,
        `Dashboard: perbarui ${meta.title.toLowerCase()}`,
      );
      set((s) => ({ ...s, sha: res.sha, dirty: false }));
      toast({ kind: 'ok', text: `${meta.title} tersimpan. Situs diperbarui setelah build selesai (±1–3 menit).` });
    } catch (e) {
      toast({ kind: 'err', text: (e as Error).message });
    } finally {
      setSaving(false);
    }
  };
  return (
    <>
      <Header title={meta.title}>
        <button class={btnDark} disabled={saving || !st.dirty || !parsed?.success} onClick={save}>
          {saving ? 'Menyimpan…' : st.dirty ? 'Simpan & terbitkan' : 'Tersimpan'}
        </button>
      </Header>
      <p class="mb-4 text-sm text-muted">{DATA_HELP[name]}</p>
      {parsed && !parsed.success && (
        <div class="mb-4">
          <Issues issues={parsed.error.issues} />
        </div>
      )}
      <div class={card}>
        <ObjectFields
          schema={meta.schema}
          value={st.data}
          onChange={(v) => set((s) => ({ ...s, data: v as { items: unknown[] }, dirty: true }))}
        />
      </div>
    </>
  );
}
