import type { APIRoute, GetStaticPaths } from 'astro';
import { getRoutes, type Route } from '@/lib/routes';
import { ogPath, renderOg } from '@/lib/og';
import { categoryLabel } from '@/lib/labels';

/** Gambar OG bermerek per halaman/artikel, dibuat saat build. */
export const getStaticPaths = (async () => {
  const routes = await getRoutes();
  return routes.map((route) => ({
    params: {
      ogpath: ogPath(route.path)
        .replace(/^\/og\//, '')
        .replace(/\.jpg$/, ''),
    },
    props: { route },
  }));
}) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ props }) => {
  const route = (props as { route: Route }).route;
  const isPost = route.kind === 'post';
  const image = isPost ? route.entry.data.image : (route.entry.data.seo.ogImage ?? route.entry.data.hero.image);
  const eyebrow = isPost
    ? categoryLabel[route.entry.data.category]?.[route.locale]
    : (route.entry.data.hero.eyebrow ??
      (route.locale === 'id' ? 'Pelatihan · Sertifikasi · Layanan' : 'Training · Certification · Services'));
  const jpg = await renderOg({
    title: isPost ? route.entry.data.title : route.entry.data.hero.title,
    eyebrow,
    photoPath: image ? `src/assets/images/${image}` : undefined,
    locale: route.locale,
  });
  return new Response(new Uint8Array(jpg), { headers: { 'Content-Type': 'image/jpeg' } });
};
