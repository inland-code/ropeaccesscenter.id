import type { APIRoute } from 'astro';
import { getRoutes } from '@/lib/routes';
import { indexable, urlset, xml } from '@/lib/sitemap';

export const GET: APIRoute = async () => {
  const routes = (await getRoutes()).filter((r) => r.kind === 'page' && indexable(r));
  return xml(await urlset(routes));
};
