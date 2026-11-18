import type { APIRoute } from 'astro';
import site from '@/data/site.json';
import { getRoutes } from '@/lib/routes';
import { routeToMarkdown } from '@/lib/markdown';

/** Seluruh konten situs dalam satu file Markdown untuk LLM (https://llmstxt.org). */
export const GET: APIRoute = async () => {
  const routes = (await getRoutes()).filter((r) => !r.entry.data.seo.noindex);
  const order = (r: (typeof routes)[number]) => (r.locale === 'id' ? 0 : 2) + (r.kind === 'post' ? 1 : 0);
  const sorted = [...routes].sort((a, b) => order(a) - order(b) || a.path.localeCompare(b.path));
  const docs = await Promise.all(sorted.map(routeToMarkdown));
  const body = `# ${site.name} — konten lengkap\n\n> ${site.tagline.id} · ${site.tagline.en}\n\n${docs.join('\n\n')}`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
