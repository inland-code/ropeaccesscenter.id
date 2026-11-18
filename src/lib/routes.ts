import { getCollection, type CollectionEntry } from 'astro:content';
import { defaultLocale, isLocale, locales, type Locale } from '@/i18n/config';

export type PageEntry = CollectionEntry<'pages'>;
export type PostEntry = CollectionEntry<'posts'>;

export type Route =
  | { kind: 'page'; locale: Locale; translationKey: string; slug: string; path: string; entry: PageEntry }
  | { kind: 'post'; locale: Locale; translationKey: string; slug: string; path: string; entry: PostEntry };

/** Locale dari folder pertama id entri, contoh "en/about-us" -> "en". */
export function localeOf(id: string): Locale {
  const first = id.split('/')[0] ?? '';
  if (!isLocale(first)) throw new Error(`Entri konten harus berada di folder locale (id/ atau en/): ${id}`);
  return first;
}

/** Path publik selalu diakhiri "/" (sama seperti WordPress). ID tanpa prefix, EN di /en/. */
export function localePath(locale: Locale, slug: string): string {
  const prefix = locale === defaultLocale ? '' : `/${locale}`;
  return slug ? `${prefix}/${slug}/` : `${prefix}/`;
}

let cache: Route[] | undefined;

export async function getRoutes(): Promise<Route[]> {
  if (cache) return cache;
  const [pages, posts] = await Promise.all([
    getCollection('pages'),
    getCollection('posts', ({ data }) => import.meta.env.DEV || !data.draft),
  ]);
  const routes: Route[] = [
    ...pages.map((entry) => {
      const locale = localeOf(entry.id);
      return {
        kind: 'page' as const,
        locale,
        translationKey: entry.data.translationKey,
        slug: entry.data.slug,
        path: localePath(locale, entry.data.slug),
        entry,
      };
    }),
    ...posts.map((entry) => {
      const locale = localeOf(entry.id);
      return {
        kind: 'post' as const,
        locale,
        translationKey: entry.data.translationKey,
        slug: entry.data.slug,
        path: localePath(locale, entry.data.slug),
        entry,
      };
    }),
  ];

  // Validasi: tidak boleh ada path ganda, dan setiap translationKey unik per locale.
  const seenPath = new Map<string, string>();
  const seenKey = new Set<string>();
  for (const r of routes) {
    const other = seenPath.get(r.path);
    if (other) throw new Error(`Path ganda ${r.path}: ${other} dan ${r.entry.id}`);
    seenPath.set(r.path, r.entry.id);
    const k = `${r.locale}:${r.translationKey}`;
    if (seenKey.has(k)) throw new Error(`translationKey ganda untuk locale ${r.locale}: ${r.translationKey}`);
    seenKey.add(k);
  }
  cache = routes;
  return routes;
}

/** URL untuk translationKey pada locale tertentu (fallback ke versi ID). */
export async function hrefFor(translationKey: string, locale: Locale): Promise<string> {
  const routes = await getRoutes();
  const match =
    routes.find((r) => r.translationKey === translationKey && r.locale === locale) ??
    routes.find((r) => r.translationKey === translationKey && r.locale === defaultLocale);
  if (!match) throw new Error(`translationKey tidak dikenal: ${translationKey}`);
  return match.path;
}

/** Daftar versi bahasa yang tersedia untuk sebuah konten (untuk hreflang & tombol bahasa). */
export async function alternatesFor(translationKey: string): Promise<{ locale: Locale; path: string }[]> {
  const routes = await getRoutes();
  return locales.flatMap((locale) => {
    const r = routes.find((x) => x.translationKey === translationKey && x.locale === locale);
    return r ? [{ locale, path: r.path }] : [];
  });
}
