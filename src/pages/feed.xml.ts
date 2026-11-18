import type { APIRoute } from 'astro';
import site from '@/data/site.json';
import { getRoutes, type Route } from '@/lib/routes';
import { absoluteUrl } from '@/lib/seo';
import { categoryLabel } from '@/lib/labels';
import type { Locale } from '@/i18n/config';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** RSS artikel Bahasa Indonesia. Versi Inggris: /en/feed.xml */
export async function rss(locale: Locale): Promise<Response> {
  const posts = (await getRoutes())
    .filter((r): r is Extract<Route, { kind: 'post' }> => r.kind === 'post' && r.locale === locale && !r.entry.data.seo.noindex)
    .sort((a, b) => b.entry.data.publishedAt.getTime() - a.entry.data.publishedAt.getTime());
  const items = posts
    .map(
      (p) =>
        `<item><title>${esc(p.entry.data.title)}</title><link>${absoluteUrl(p.path)}</link><guid isPermaLink="true">${absoluteUrl(p.path)}</guid><pubDate>${p.entry.data.publishedAt.toUTCString()}</pubDate><category>${esc(categoryLabel[p.entry.data.category]?.[locale] ?? p.entry.data.category)}</category><description>${esc(p.entry.data.excerpt)}</description></item>`,
    )
    .join('');
  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom"><channel><title>${esc(site.name)} — ${locale === 'id' ? 'Artikel' : 'Insights'}</title><link>${absoluteUrl(locale === 'id' ? '/artikel/' : '/en/insights/')}</link><atom:link href="${absoluteUrl(locale === 'id' ? '/feed.xml' : '/en/feed.xml')}" rel="self" type="application/rss+xml"/><description>${esc(site.tagline[locale])}</description><language>${locale === 'id' ? 'id-ID' : 'en'}</language>${items}</channel></rss>\n`;
  return new Response(body, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } });
}

export const GET: APIRoute = () => rss('id');
