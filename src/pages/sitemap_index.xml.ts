import type { APIRoute } from 'astro';
import { absoluteUrl } from '@/lib/seo';
import { xml } from '@/lib/sitemap';

/** Nama & path sama dengan Rank Math SEO di situs WordPress lama. */
export const GET: APIRoute = () => {
  const maps = ['page-sitemap.xml', 'post-sitemap.xml'];
  const now = new Date().toISOString();
  return xml(
    `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${maps
      .map((m) => `<sitemap><loc>${absoluteUrl('/' + m)}</loc><lastmod>${now}</lastmod></sitemap>`)
      .join('')}</sitemapindex>\n`,
  );
};
