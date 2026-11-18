// @ts-check
import { defineConfig, fontProviders } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import preact from '@astrojs/preact';

export default defineConfig({
  site: 'https://ropeaccesscenter.id',
  // Format URL sama dengan Inland: /slug/ (selalu dengan trailing slash).
  trailingSlash: 'always',
  build: {
    format: 'directory',
    inlineStylesheets: 'auto',
  },
  compressHTML: true,
  // Prefetch Astro (JS) dimatikan: navigasi instan ditangani Speculation Rules di <head> tanpa JavaScript.
  prefetch: false,
  image: {
    layout: 'constrained',
    // Dimatikan: CSS bawaan Astro tidak ber-layer sehingga mengalahkan utility Tailwind.
    responsiveStyles: false,
    breakpoints: [360, 480, 640, 768, 1024, 1280, 1600, 1920],
  },
  // Font identitas RAC (berkas asli dari situs lama), self-hosted: Archivo (judul) + Montserrat (isi).
  fonts: [
    {
      name: 'Archivo',
      cssVariable: '--font-archivo',
      provider: fontProviders.local(),
      fallbacks: ['Arial Black', 'Segoe UI', 'Arial', 'sans-serif'],
      optimizedFallbacks: true,
      display: 'swap',
      options: {
        variants: [{ src: ['./src/assets/fonts/archivo-latin-var.woff2'], weight: '400 800', stretch: '100% 125%', style: 'normal' }],
      },
    },
    {
      name: 'Montserrat',
      cssVariable: '--font-montserrat',
      provider: fontProviders.local(),
      fallbacks: ['system-ui', 'Segoe UI', 'Arial', 'sans-serif'],
      optimizedFallbacks: true,
      display: 'swap',
      options: {
        variants: [{ src: ['./src/assets/fonts/montserrat-latin-var.woff2'], weight: '400 700', style: 'normal' }],
      },
    },
  ],
  // Preact hanya dipakai dashboard /admin (client:only); halaman publik tetap tanpa JS.
  integrations: [preact()],
  vite: {
    plugins: [tailwindcss()],
  },
});
