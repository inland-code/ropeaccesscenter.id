import type { ImageMetadata } from 'astro';

/**
 * Semua gambar konten disimpan di repo: src/assets/images/**.
 * Konten (JSON/Markdown, dan nanti dashboard) cukup menyimpan path relatif,
 * misal "home/hero-rumah-modern-carport.jpg"; Astro mengoptimasi saat build.
 */
const images = import.meta.glob<{ default: ImageMetadata }>('/src/assets/images/**/*.{jpg,jpeg,png,webp,avif}', { eager: true });

export function imageFor(path: string): ImageMetadata {
  const mod = images[`/src/assets/images/${path}`];
  if (!mod) {
    throw new Error(`Gambar tidak ditemukan: src/assets/images/${path}`);
  }
  return mod.default;
}

export function listImages(): string[] {
  return Object.keys(images).map((k) => k.replace('/src/assets/images/', ''));
}
