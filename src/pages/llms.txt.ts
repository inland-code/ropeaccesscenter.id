import type { APIRoute } from 'astro';
import site from '@/data/site.json';
import { getRoutes } from '@/lib/routes';
import { absoluteUrl } from '@/lib/seo';
import { markdownPath } from '@/lib/markdown';

/** https://llmstxt.org — ringkasan situs untuk mesin AI. Versi lengkap: /llms-full.txt */
export const GET: APIRoute = async () => {
  const routes = (await getRoutes()).filter((r) => !r.entry.data.seo.noindex);
  // Tautan ke versi Markdown (lebih ringkas untuk LLM); HTML ada di URL yang sama tanpa .md.
  const line = (r: (typeof routes)[number]) =>
    `- [${r.entry.data.seo.title}](${absoluteUrl(markdownPath(r.path))}): ${r.entry.data.seo.description}`;
  const body = [
    `# ${site.name}`,
    '',
    `> ${site.description.id}`,
    '',
    `> ${site.description.en}`,
    '',
    `Kontak: ${site.phoneDisplay} (WhatsApp) · ${site.email} · ${site.address.street}, ${site.address.locality} ${site.address.postalCode}`,
    ...(Object.values(site.social).some(Boolean) ? [`Media sosial: ${Object.values(site.social).filter(Boolean).join(' · ')}`] : []),
    '',
    '## Halaman (Bahasa Indonesia)',
    ...routes.filter((r) => r.kind === 'page' && r.locale === 'id').map(line),
    '',
    '## Artikel',
    ...routes.filter((r) => r.kind === 'post' && r.locale === 'id').map(line),
    '',
    `Konten lengkap dalam satu file: ${absoluteUrl('/llms-full.txt')}`,
    '',
    '## Pages (English)',
    ...routes.filter((r) => r.locale === 'en').map(line),
    '',
  ].join('\n');
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
