# ropeaccesscenter.id

Situs resmi **Rope Access Center (RAC) — Training, Certification & Corporate Services**: Astro (statis) + Cloudflare Workers,
dengan dashboard pemilik di `/admin`. Dibangun dengan teknologi & pola yang sama dengan inland.co.id.
Rencana & status: [`docs/PLAN.md`](docs/PLAN.md) · Dashboard: [`docs/DASHBOARD.md`](docs/DASHBOARD.md) ·
Identitas visual: [`docs/brand-guidelines.webp`](docs/brand-guidelines.webp) · Source code lama: branch `rac-original`.

## Perintah

```bash
npm install
npm run dev               # http://localhost:4321
npm run build             # build staging (noindex) + verifikasi URL + audit SEO
npm run build:production  # build produksi (indexable)
npm run preview           # sajikan dist/ + Worker lewat Wrangler
npm run check             # type check situs + Worker
npm test                  # unit test Worker (formulir, login, izin path)
npm run format            # Prettier
```

Deploy: setiap push ke `main` otomatis di-build & di-deploy oleh **Cloudflare Workers Builds**.
GitHub Actions hanya menjalankan pemeriksaan (format, type check, test, build).

## Struktur

| Lokasi                             | Isi                                                                                    |
| ---------------------------------- | -------------------------------------------------------------------------------------- |
| `src/content/schema.ts`            | Skema konten (zod) — dipakai build **dan** form dashboard                              |
| `src/content/pages/{id,en}/*.json` | Halaman: SEO, hero, section; program pelatihan (`template: "course"` + field `course`) |
| `src/content/posts/{id,en}/*.md`   | Artikel                                                                                |
| `src/content/data/*.json`          | Data dua bahasa: jadwal kelas, akreditasi, tim, testimoni, FAQ                         |
| `src/assets/images/**`             | Foto konten (di repo), dioptimasi ke AVIF/WebP saat build                              |
| `src/assets/brand/`, `fonts/`      | Logo RAC, siluet pemanjat, font Archivo & Montserrat (self-hosted)                     |
| `src/data/site.json`               | Data bisnis: nama, kontak, alamat, jam buka, media sosial                              |
| `src/pages/[...slug].astro`        | Satu route untuk semua halaman & artikel → `src/views/{PageView,PostView}.astro`       |
| `src/components/sections/`         | Komponen section (kartu otomatis, jadwal, FAQ, tim, testimoni, akreditasi, kontak, …)  |
| `src/lib/`                         | Routing & i18n, data koleksi, SEO/JSON-LD, sitemap, Markdown untuk LLM, gambar OG      |
| `src/admin/`                       | Dashboard (Preact, hanya dimuat di `/admin`)                                           |
| `worker/`                          | Cloudflare Worker: formulir kontak (D1 → WhatsApp), login GitHub, API dashboard        |
| `migrations/`                      | Skema database D1 (`rac-db`)                                                           |
| `scripts/`                         | Pasca-build: CSP + noindex staging, verifikasi URL, audit SEO                          |
| `migration/url-inventory.csv`      | Daftar URL rencana — build gagal jika ada yang hilang                                  |
| `tests/`                           | Unit test Worker (Vitest)                                                              |

## Aturan URL

- Bahasa Indonesia di root: `/tentang-kami/`; Bahasa Inggris di `/en/` dengan slug terjemahan: `/en/about-us/`.
- Selalu diakhiri `/`; sitemap: `/sitemap_index.xml`.

## Staging vs produksi

Build Cloudflare Workers Builds dari branch `main` (atau `PUBLIC_SITE_ENV=production`) bisa diindeks; `PUBLIC_SITE_ENV=staging`
memaksa noindex. Build lain otomatis `noindex` (meta robots + `X-Robots-Tag` + `robots.txt Disallow`).
Testimoni & profil tim bertanda `sample: true` otomatis disembunyikan di build produksi.
