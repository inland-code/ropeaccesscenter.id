import { absoluteUrl } from './seo';
import { alternatesFor, type Route } from './routes';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export async function urlset(routes: Route[]): Promise<string> {
  const items = await Promise.all(
    routes.map(async (r) => {
      const alts = await alternatesFor(r.translationKey);
      const raw = r.kind === 'post' ? (r.entry.data.updatedAt ?? r.entry.data.publishedAt) : r.entry.data.updatedAt;
      const lastmod = raw ? new Date(raw) : undefined;
      const links =
        alts.length > 1
          ? [
              ...alts.map((a) => `<xhtml:link rel="alternate" hreflang="${a.locale}" href="${esc(absoluteUrl(a.path))}"/>`),
              ...alts
                .filter((a) => a.locale === 'id')
                .map((a) => `<xhtml:link rel="alternate" hreflang="x-default" href="${esc(absoluteUrl(a.path))}"/>`),
            ].join('')
          : '';
      return `<url><loc>${esc(absoluteUrl(r.path))}</loc>${lastmod ? `<lastmod>${lastmod.toISOString()}</lastmod>` : ''}${links}</url>`;
    }),
  );
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${items.join('')}</urlset>\n`;
}

export function xml(body: string): Response {
  return new Response(body, { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
}

/** Halaman yang ikut sitemap: tidak noindex. */
export function indexable(r: Route): boolean {
  return !r.entry.data.seo.noindex;
}
