import type { APIRoute } from 'astro';
import { isProduction } from '@/lib/env';
import { absoluteUrl } from '@/lib/seo';

/**
 * Produksi: izinkan semua crawler termasuk crawler AI (GEO).
 * Staging/preview: blokir semua agar tidak terindeks.
 */
export const GET: APIRoute = () => {
  const body = isProduction
    ? [
        'User-agent: *',
        'Allow: /',
        'Disallow: /admin/',
        'Disallow: /api/',
        '',
        '# Crawler AI diizinkan secara eksplisit (GEO / AI search)',
        ...[
          'GPTBot',
          'OAI-SearchBot',
          'ChatGPT-User',
          'ClaudeBot',
          'Claude-SearchBot',
          'Claude-User',
          'PerplexityBot',
          'Google-Extended',
          'Applebot-Extended',
          'CCBot',
        ].flatMap((ua) => [`User-agent: ${ua}`, 'Allow: /', '']),
        `Sitemap: ${absoluteUrl('/sitemap_index.xml')}`,
        '',
      ].join('\n')
    : 'User-agent: *\nDisallow: /\n';
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
