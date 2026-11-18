import type { APIRoute, GetStaticPaths } from 'astro';
import { getRoutes, type Route } from '@/lib/routes';
import { markdownPath, routeToMarkdown } from '@/lib/markdown';

/** Versi Markdown tiap halaman: /tentang-kami.md, /en/about-us.md, /index.md */
export const getStaticPaths = (async () => {
  const routes = (await getRoutes()).filter((r) => !r.entry.data.seo.noindex);
  return routes.map((route) => ({
    params: { mdpath: markdownPath(route.path).replace(/^\//, '').replace(/\.md$/, '') },
    props: { route },
  }));
}) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ props }) => {
  const body = await routeToMarkdown((props as { route: Route }).route);
  return new Response(body, { headers: { 'Content-Type': 'text/markdown; charset=utf-8' } });
};
