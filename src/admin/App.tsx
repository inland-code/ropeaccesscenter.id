import { useEffect, useState } from 'preact/hooks';
import { ApiError, api, loadSchema, type Me, type StaticSchema } from './api';
import { StaticCtx, ToastCtx } from './state';
import {
  DataEditor,
  ErrorBox,
  Loading,
  Messages,
  MediaView,
  Overview,
  PageEditor,
  PagesList,
  PostEditor,
  PostsList,
  Redirects,
  Settings,
} from './views';

const NAV = [
  ['#/', 'Ringkasan'],
  ['#/pages', 'Halaman'],
  ['#/posts', 'Artikel'],
  ['#/data/schedule', 'Jadwal Kelas'],
  ['#/data/faqs', 'FAQ'],
  ['#/data/team', 'Tim'],
  ['#/data/testimonials', 'Testimoni'],
  ['#/data/accreditations', 'Akreditasi'],
  ['#/media', 'Media'],
  ['#/messages', 'Pesan Masuk'],
  ['#/settings', 'Data Bisnis'],
  ['#/redirects', 'Redirect'],
] as const;

function useHash() {
  const [hash, setHash] = useState(location.hash || '#/');
  useEffect(() => {
    const on = () => setHash(location.hash || '#/');
    addEventListener('hashchange', on);
    return () => removeEventListener('hashchange', on);
  }, []);
  return hash;
}

export default function App() {
  const hash = useHash();
  const [me, setMe] = useState<Me>();
  const [schema, setSchema] = useState<StaticSchema>();
  const [error, setError] = useState<string>();
  const [needLogin, setNeedLogin] = useState(false);
  const [toasts, setToasts] = useState<{ id: number; kind: 'ok' | 'err'; text: string }[]>([]);

  useEffect(() => {
    Promise.all([api.me(), loadSchema()])
      .then(([m, s]) => {
        setMe(m);
        setSchema(s);
      })
      .catch((e: Error) => (e instanceof ApiError && e.status === 401 ? setNeedLogin(true) : setError(e.message)));
  }, []);

  const toast = (t: { kind: 'ok' | 'err'; text: string }) => {
    const id = Date.now() + Math.random();
    setToasts((x) => [...x, { id, ...t }]);
    setTimeout(() => setToasts((x) => x.filter((y) => y.id !== id)), t.kind === 'err' ? 9000 : 5000);
  };

  if (needLogin) return <Login />;
  if (error)
    return (
      <div class="mx-auto max-w-lg p-10">
        <ErrorBox text={`Tidak bisa masuk dashboard: ${error}`} />
      </div>
    );
  if (!me || !schema) return <Loading text="Memuat dashboard…" />;

  const [route, query = ''] = hash.slice(1).split('?');
  const params = new URLSearchParams(query);
  const view = (() => {
    switch (route) {
      case '/pages':
        return <PagesList />;
      case '/pages/edit':
        return <PageEditor key={params.get('path')} path={params.get('path') ?? ''} />;
      case '/posts':
        return <PostsList />;
      case '/posts/edit':
        return <PostEditor key={params.get('path')} path={params.get('path') ?? ''} />;
      case '/data/schedule':
      case '/data/faqs':
      case '/data/team':
      case '/data/testimonials':
      case '/data/accreditations':
        return <DataEditor key={route} name={route.slice(6) as 'schedule' | 'faqs' | 'team' | 'testimonials' | 'accreditations'} />;
      case '/media':
        return <MediaView />;
      case '/messages':
        return <Messages />;
      case '/settings':
        return <Settings />;
      case '/redirects':
        return <Redirects />;
      default:
        return <Overview me={me} />;
    }
  })();
  const active = (h: string) => (h === '#/' ? route === '/' || route === '' : route?.startsWith(h.slice(1)));

  return (
    <StaticCtx.Provider value={schema}>
      <ToastCtx.Provider value={toast}>
        <div class="min-h-dvh bg-surface-alt lg:grid lg:grid-cols-[15rem_minmax(0,1fr)]">
          <aside class="bg-navy-950 text-white/80 lg:sticky lg:top-0 lg:h-dvh">
            <div class="flex items-center justify-between px-5 py-5 lg:block">
              <p class="text-lg font-bold text-white">
                RAC <span class="text-brand-400">Dashboard</span>
              </p>
              <p class="truncate text-xs text-white/50 lg:mt-1">{me.email}</p>
            </div>
            <nav class="flex gap-1 overflow-x-auto px-3 pb-3 lg:block lg:space-y-1 lg:overflow-visible">
              {NAV.map(([h, l]) => (
                <a
                  href={h}
                  class={`block shrink-0 rounded-lg px-3 py-2 text-sm font-medium ${active(h) ? 'bg-brand-500 text-white' : 'hover:bg-white/10'}`}
                >
                  {l}
                </a>
              ))}
              <a href="/" target="_blank" rel="noopener" class="block shrink-0 rounded-lg px-3 py-2 text-sm hover:bg-white/10">
                Lihat situs ↗
              </a>
              <a href="/api/auth/logout" class="block shrink-0 rounded-lg px-3 py-2 text-sm text-white/60 hover:bg-white/10">
                Keluar
              </a>
            </nav>
          </aside>
          <main class="mx-auto w-full max-w-6xl min-w-0 overflow-x-hidden p-4 sm:p-8">{view}</main>
        </div>
        <div class="fixed right-4 bottom-4 z-50 space-y-2" aria-live="polite">
          {toasts.map((t) => (
            <p
              class={`max-w-sm rounded-xl px-4 py-3 text-sm shadow-lg ${t.kind === 'ok' ? 'bg-navy-900 text-white' : 'bg-red-600 text-white'}`}
            >
              {t.text}
            </p>
          ))}
        </div>
      </ToastCtx.Provider>
    </StaticCtx.Provider>
  );
}

const LOGIN_ERRORS: Record<string, string> = {
  denied: 'Akun GitHub ini tidak diizinkan masuk dashboard.',
  state: 'Sesi login kedaluwarsa. Silakan coba lagi.',
  token: 'GitHub menolak login. Silakan coba lagi.',
};

function Login() {
  const err = new URLSearchParams(location.search).get('login');
  // Sengaja tanpa logo/warna GitHub: halaman ini milik RAC, bukan tiruan halaman login pihak lain.
  return (
    <div class="flex min-h-dvh items-center justify-center bg-navy-950 p-6">
      <div class="w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-xl">
        <img src="/logo-rac.png" alt="Rope Access Center" width="180" height="89" class="mx-auto h-auto w-44" />
        <p class="mt-4 text-lg font-bold text-navy-900">Dashboard pengelola situs</p>
        <p class="mt-2 text-sm text-muted">
          Halaman internal untuk pemilik situs ropeaccesscenter.id. Pengunjung umum tidak perlu masuk ke sini.
        </p>
        {err && <p class="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{LOGIN_ERRORS[err] ?? 'Login gagal.'}</p>}
        <a
          href="/api/auth/login"
          class="mt-6 inline-flex w-full items-center justify-center rounded-lg bg-brand-600 px-4 py-3 text-sm font-semibold text-white hover:bg-brand-700"
        >
          Masuk sebagai pengelola
        </a>
        <p class="mt-4 text-xs leading-relaxed text-muted">
          Verifikasi akun dilakukan di halaman resmi github.com (OAuth). Situs ini tidak pernah meminta atau menyimpan kata sandi.
        </p>
        <a href="/" class="mt-6 inline-block text-sm font-semibold text-brand-700 hover:underline">
          ← Kembali ke situs
        </a>
      </div>
    </div>
  );
}
