import type { Route } from './routes';

/**
 * Interlinking otomatis: relasi dihitung dari tautan di isi artikel, jadi menambah satu link di
 * dashboard langsung memperkuat "Artikel Terkait" di halaman layanan & artikel lain.
 */
type PageRoute = Extract<Route, { kind: 'page' }>;
type PostRoute = Extract<Route, { kind: 'post' }>;

const linkCache = new WeakMap<object, Set<string>>();

/** Path internal yang ditautkan isi artikel, mis. "/jasa-arsitek/". */
export function linksOf(post: PostRoute): Set<string> {
  let set = linkCache.get(post.entry);
  if (!set) {
    set = new Set([...(post.entry.body ?? '').matchAll(/\]\((\/[^)\s#?]*)/g)].map((m) => m[1]!));
    linkCache.set(post.entry, set);
  }
  return set;
}

const posts = (all: Route[], locale: string) => all.filter((r): r is PostRoute => r.kind === 'post' && r.locale === locale);
const newest = (a: PostRoute, b: PostRoute) => b.entry.data.publishedAt.getTime() - a.entry.data.publishedAt.getTime();

/**
 * Skor relevansi antar artikel: saling menautkan (+3 per arah), menautkan halaman yang sama (+2 per halaman,
 * kecuali halaman kontak), kategori sama (+1). Seri → artikel terbaru.
 */
export function relatedForPost(route: PostRoute, all: Route[], contactPath: string, limit = 3): PostRoute[] {
  const mine = linksOf(route);
  const score = (p: PostRoute) => {
    const theirs = linksOf(p);
    let n = (mine.has(p.path) ? 3 : 0) + (theirs.has(route.path) ? 3 : 0);
    for (const l of mine) if (l !== contactPath && theirs.has(l)) n += 2;
    return n + Number(p.entry.data.category === route.entry.data.category);
  };
  return posts(all, route.locale)
    .filter((p) => p.path !== route.path)
    .map((p) => ({ p, s: score(p) }))
    .sort((a, b) => b.s - a.s || newest(a.p, b.p))
    .slice(0, limit)
    .map(({ p }) => p);
}

/** Artikel untuk halaman: pilihan manual (relatedPosts) dulu, lalu artikel yang menautkan halaman ini. */
export function relatedForPage(route: PageRoute, all: Route[], limit = 3): PostRoute[] {
  const pool = posts(all, route.locale);
  const manual = route.entry.data.relatedPosts.map((slug) => pool.find((p) => p.slug === slug)).filter((p): p is PostRoute => !!p);
  const backlinks = pool.filter((p) => linksOf(p).has(route.path) && !manual.includes(p)).sort(newest);
  return [...manual, ...backlinks].slice(0, limit);
}

/** Induk halaman untuk breadcrumb: field `parent`, default "services" untuk layanan & "training" untuk program pelatihan. */
export function parentKeyOf(route: PageRoute): string | undefined {
  const d = route.entry.data;
  if (d.parent) return d.parent;
  return d.template === 'service' ? 'services' : d.template === 'course' ? 'training' : undefined;
}

/** Panjang awalan kunci yang sama, mis. "course-tkpk-1" vs "course-tkpk-2" → 12. */
const prefix = (a: string, b: string) => {
  let i = 0;
  while (i < a.length && a[i] === b[i]) i++;
  return i;
};

/**
 * Blok "Layanan Terkait": induk, anak langsung (halaman hub menautkan semua anaknya), lalu halaman
 * saudara dengan induk sama — yang kuncinya paling mirip dulu (mis. TKPK Tingkat 1 ke Tingkat 2).
 */
export function siblingPages(route: PageRoute, all: Route[], limit = 8): PageRoute[] {
  const pages = all.filter((r): r is PageRoute => r.kind === 'page' && r.locale === route.locale && r.path !== route.path);
  const parent = parentKeyOf(route);
  const children = pages.filter((p) => parentKeyOf(p) === route.translationKey);
  const parentPage = parent ? pages.filter((p) => p.translationKey === parent) : [];
  const siblings = pages
    .filter((p) => parent && p.entry.data.template === route.entry.data.template && parentKeyOf(p) === parent)
    .sort((a, b) => prefix(b.translationKey, route.translationKey) - prefix(a.translationKey, route.translationKey));
  return [...new Set([...parentPage, ...children, ...siblings])].slice(0, children.length ? Math.max(limit, children.length) : limit);
}
