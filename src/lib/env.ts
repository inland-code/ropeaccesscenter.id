/**
 * Mode produksi (boleh diindeks Google):
 * - PUBLIC_SITE_ENV=production, atau
 * - build otomatis Cloudflare Workers Builds dari branch main (produksi ropeaccesscenter.id).
 * PUBLIC_SITE_ENV=staging memaksa noindex. Build lain (lokal, GitHub Actions, branch preview) → noindex.
 * Hanya dipakai saat build (prerender), jadi aman membaca process.env.
 */
export function siteIsProduction(env: Record<string, string | undefined>): boolean {
  if (env.PUBLIC_SITE_ENV) return env.PUBLIC_SITE_ENV === 'production';
  return env.WORKERS_CI === '1' && env.WORKERS_CI_BRANCH === 'main';
}

export const isProduction = siteIsProduction({
  ...process.env,
  PUBLIC_SITE_ENV: import.meta.env.PUBLIC_SITE_ENV ?? process.env.PUBLIC_SITE_ENV,
});
