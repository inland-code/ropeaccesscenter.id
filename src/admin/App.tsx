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
  return (
    <div class="flex min-h-dvh items-center justify-center bg-navy-950 p-6">
      <div class="w-full max-w-sm rounded-2xl bg-white p-8 text-center shadow-xl">
        <p class="text-xl font-bold text-navy-900">
          Rope Access Center <span class="text-brand-600">Dashboard</span>
        </p>
        <p class="mt-2 text-sm text-muted">Khusus pemilik situs. Masuk dengan akun GitHub yang terdaftar.</p>
        {err && <p class="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{LOGIN_ERRORS[err] ?? 'Login gagal.'}</p>}
        <a
          href="/api/auth/login"
          class="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-[#24292f] px-4 py-3 text-sm font-semibold text-white hover:bg-black"
        >
          <svg class="size-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M12 .5a11.5 11.5 0 0 0-3.64 22.41c.58.1.79-.25.79-.56v-2c-3.2.7-3.88-1.37-3.88-1.37-.53-1.33-1.28-1.69-1.28-1.69-1.05-.71.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11 11 0 0 1 5.79 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.8 1.19 1.83 1.19 3.09 0 4.42-2.7 5.39-5.26 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .5Z" />
          </svg>
          Masuk dengan GitHub
        </a>
      </div>
    </div>
  );
}
