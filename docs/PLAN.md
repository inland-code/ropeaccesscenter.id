# Rencana Rebuild ropeaccesscenter.id — Astro + Cloudflare (mengikuti template Inland)

Status: **Fase 0–7 selesai — staging live di https://ropeaccesscenter-id.inlandgrup.workers.dev (noindex)**; tersisa data pemilik & domain (Fase 8)

Situs Rope Access Center (RAC) dibangun ulang dengan teknologi dan pola yang **sama** dengan
[inland.co.id](https://inland.co.id) (repo `inland-code/inland.co.id`). Konten dan identitas visual diambil dari
source code RAC lama yang diarsipkan apa adanya di branch [`rac-original`](../../../tree/rac-original) (tidak dideploy).

## Keputusan

| #   | Topik            | Keputusan                                                                                                                                    |
| --- | ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Teknologi        | Sama dengan Inland: Astro 7 **statis**, Tailwind v4, Cloudflare Workers Static Assets; Worker hanya untuk `/api/*`                           |
| 2   | Format URL       | Sama dengan Inland: **datar** (`/slug/`), selalu diakhiri `/`. ID di root, EN di `/en/` dengan **slug terjemahan** + `hreflang`              |
| 3   | Konten           | File di repo (`src/content/**`), divalidasi skema zod; diedit lewat dashboard `/admin` (commit ke GitHub). D1/KV konten RAC lama dihapus     |
| 4   | Media            | Di repo (`src/assets/images/`), dioptimasi AVIF/WebP saat build. **Tanpa R2**                                                                |
| 5   | Login dashboard  | GitHub OAuth App + cookie sesi HMAC, hanya akun `inland-code`. **Tanpa** Cloudflare Zero Trust/Access. Login email+password lama dihapus     |
| 6   | Formulir kontak  | Worker `/api/contact` → D1 baru `rac-db` → redirect WhatsApp; honeypot, cek origin, Turnstile opsional                                       |
| 7   | Identitas visual | **Dipertahankan**: navy `#0D1B2A`, merah `#E30613`, charcoal `#222529`, abu netral; font Archivo (judul) + Montserrat (isi); logo & ikon RAC |
| 8   | Foto             | RAC lama belum punya foto (semua gambar = logo). Foto hero **opsional**; tanpa foto tampil grafis merek (siluet pemanjat + diagonal merah)   |

## Arsitektur (sama dengan Inland)

```
[Dashboard /admin (Preact)] → [Worker /api/admin/*] → commit ke GitHub (konten + media)
                                                        ↓
                              Cloudflare Workers Builds: build Astro + audit SEO → deploy
[Formulir kontak] → [Worker /api/contact] → D1 rac-db → redirect wa.me
```

- Semua halaman publik di-prerender jadi HTML statis, **0 KB JavaScript** (kecuali skrip tema inline), prefetch via Speculation Rules.
- Build `main` di Workers Builds otomatis mode **produksi**; build lain otomatis `noindex` (`src/lib/env.ts`).

## Pemetaan konten RAC lama → struktur baru

| RAC lama (`src/data/*.ts`)                | Struktur baru                                                                                            |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `settings.ts` (profil, kontak, statistik) | `src/data/site.json` (data bisnis) + section `stats` di Beranda                                          |
| `pages.ts` (hero, meta, body HTML)        | `src/content/pages/{id,en}/*.json` — hero + section; body HTML → section `prose` (Markdown)              |
| `courses.ts` (6 program)                  | Halaman `template: "course"` + field `course` (kode, skema, level, durasi, prasyarat, silabus, …)        |
| `services.ts` (6 layanan)                 | Halaman `template: "service"` (seperti Inland) + section `lists` (lingkup, industri, hasil kerja)        |
| `schedule.ts` (jadwal kelas)              | Koleksi baru `src/content/schedule.json` → section `schedule` + JSON-LD `Course`/`CourseInstance`        |
| `accreditations.ts`                       | Koleksi baru `src/content/accreditations.json` → section `accreditations`                                |
| `team.ts`                                 | Koleksi baru `src/content/team.json` → section `team`                                                    |
| `testimonials.ts`                         | Koleksi baru `src/content/testimonials.json` → section `testimonials` (sumber koleksi)                   |
| `faqs.ts` (per grup)                      | Koleksi baru `src/content/faqs.json` → section `faq-group` + `FAQPage` JSON-LD                           |
| `posts.ts` (6 artikel, HTML)              | `src/content/posts/{id,en}/*.md` (Markdown) + referensi sumber kredibel                                  |
| `public/brand`, `public/fonts`, guideline | `src/assets/brand/` (logo, siluet), `src/assets/fonts/` (Archivo, Montserrat), ikon/favicon di `public/` |

## Daftar URL (ID ↔ EN)

| Halaman                    | ID                                      | EN                                   |
| -------------------------- | --------------------------------------- | ------------------------------------ |
| Beranda                    | `/`                                     | `/en/`                               |
| Tentang Kami               | `/tentang-kami/`                        | `/en/about-us/`                      |
| Pelatihan (hub)            | `/pelatihan/`                           | `/en/training/`                      |
| — IRATA Level 1            | `/pelatihan-irata-level-1/`             | `/en/irata-level-1-training/`        |
| — IRATA Level 2            | `/pelatihan-irata-level-2/`             | `/en/irata-level-2-training/`        |
| — IRATA Level 3            | `/pelatihan-irata-level-3/`             | `/en/irata-level-3-training/`        |
| — BNSP TKPK                | `/sertifikasi-bnsp-tkpk/`               | `/en/bnsp-tkpk-certification/`       |
| — Refresher & revalidasi   | `/refresher-revalidasi-irata/`          | `/en/irata-refresher-revalidation/`  |
| — Pelatihan in-house       | `/pelatihan-in-house/`                  | `/en/in-house-training/`             |
| Jadwal Pelatihan           | `/jadwal-pelatihan/`                    | `/en/training-schedule/`             |
| Sertifikasi                | `/sertifikasi/`                         | `/en/certification/`                 |
| Layanan (hub)              | `/layanan/`                             | `/en/services/`                      |
| — Inspeksi & NDT           | `/jasa-inspeksi-ndt/`                   | `/en/ndt-inspection-services/`       |
| — Perawatan & perbaikan    | `/jasa-perawatan-perbaikan-ketinggian/` | `/en/maintenance-repair-at-height/`  |
| — Perawatan gedung & fasad | `/jasa-perawatan-fasad-gedung/`         | `/en/building-facade-maintenance/`   |
| — Standby rescue           | `/jasa-standby-rescue/`                 | `/en/standby-rescue-services/`       |
| — Konsultasi & audit K3    | `/konsultasi-audit-k3/`                 | `/en/hse-audit-consulting/`          |
| — Penyediaan teknisi       | `/penyediaan-teknisi-akses-tali/`       | `/en/rope-access-technician-supply/` |
| Artikel (daftar)           | `/artikel/`                             | `/en/insights/`                      |
| — 6 artikel                | `/<slug-artikel>/`                      | `/en/<slug-terjemahan>/`             |
| FAQ                        | `/faq/`                                 | `/en/faq/`                           |
| Kontak                     | `/kontak/`                              | `/en/contact/`                       |
| Kebijakan Privasi          | `/kebijakan-privasi/`                   | `/en/privacy-policy/`                |
| Syarat & Ketentuan         | `/syarat-ketentuan/`                    | `/en/terms-conditions/`              |

Berkas pendukung (sama dengan Inland): `/sitemap_index.xml` → `/page-sitemap.xml` + `/post-sitemap.xml`, `/feed.xml`
(ID) + `/en/feed.xml`, `/robots.txt`, `/llms.txt`, `/llms-full.txt`, versi Markdown tiap halaman (`/tentang-kami.md`),
gambar OG `/og/*.jpg`. Daftar lengkap dijaga oleh `migration/url-inventory.csv` — build gagal bila ada URL yang hilang.

## Fase kerja

Setiap fase: `npm run format` → `npm run check` → `npm test` → `npm run build` (0 error audit) → commit & push.

### Fase 0 — Arsip ✅

- ✅ `RAC-main.zip` diperiksa (tidak ada `.dev.vars`/token; hanya contoh) dan disimpan apa adanya di branch `rac-original`.

### Fase 1 — Fondasi (template Inland + merek RAC) ✅

- Salin kerangka Inland: `astro.config.mjs`, `wrangler.jsonc`, `src/lib`, `src/layouts`, `src/components`, `src/views`,
  `worker/`, `scripts/`, `tests/`, `.github/`, Prettier, Vitest.
- Token Tailwind v4 dari brand guideline RAC (navy/merah/charcoal/abu), dark mode class + toggle tanpa kedipan.
- Font Archivo + Montserrat variable self-hosted (berkas asli RAC), logo/ikon/favicon RAC.
- Header, footer, hero bermerek, OG image bermerek (satori + sharp, JPEG) dengan logo & siluet RAC.
- Worker: nama `ropeaccesscenter-id`, D1 `rac-db`, `GITHUB_REPO=inland-code/ropeaccesscenter.id`, `ADMIN_GITHUB_USERS=inland-code`.

### Fase 2 — Skema & koleksi khas RAC ✅

- `pageSchema` + template `training`, `course`, `schedule`, `certification`, `faq`, `legal`; field `course`.
- Section baru: `prose`, `lists`, `course-cards`, `schedule`, `accreditations`, `team`, `faq-group`, `testimonials` (dari koleksi).
- Koleksi data: `schedule`, `accreditations`, `team`, `testimonials`, `faqs` (JSON, diedit dari dashboard).

### Fase 3 — Migrasi konten (ID + EN) ✅

- ✅ 23 halaman × 2 bahasa + 6 artikel × 2 bahasa dari RAC lama; HTML → Markdown; meta SEO disesuaikan panjangnya.
- ✅ Interlinking: artikel menautkan halaman pelatihan/layanan terkait (`lib/related.ts`), breadcrumb berjenjang.

### Fase 4 — SEO / GEO ✅

- JSON-LD: `Organization` + `LocalBusiness`/`EducationalOrganization`, `WebSite`, `WebPage`, `Service`, `Course`
  (+ `CourseInstance` dari jadwal), `EducationEvent` di halaman jadwal, `FAQPage`, `BlogPosting`, `BreadcrumbList`.
- hreflang, sitemap index, RSS, robots.txt (crawler AI diizinkan), llms.txt, llms-full.txt, `.md` per halaman.
- ✅ Referensi sumber kredibel di setiap artikel (IRATA, SPRAT, BNSP, JDIH Kemnaker, JDIH BPK, ISO 22846/45001/9712, legislation.gov.uk).

### Fase 5 — Dashboard `/admin` (kode ✅, perlu setup akun di Fase 7)

- Sama dengan Inland (Halaman, Artikel, Media, Pesan Masuk, Data Bisnis, Redirect) + menu **Jadwal**, **Tim**,
  **Testimoni**, **Akreditasi**, **FAQ** (form otomatis dari skema zod).

### Fase 6 — Kualitas & performa ✅

- ✅ CSP dengan hash skrip inline, audit SEO (link rusak, halaman yatim, link keluar), uji Worker (Vitest, 25 test).
- ✅ Lighthouse (build produksi, lokal dengan Brotli): desktop **100/100/100/100**; mobile performa 99–100, aksesibilitas/best practices/SEO 100; CLS 0; 0 KB JavaScript di halaman publik.
- ✅ Font Archivo di-instance ke lebar 112% (90 KB → 25 KB). Berkas variable asli tetap di branch `rac-original`.

### Fase 7 — Setup Cloudflare & GitHub ✅ (2026-11-19)

1. ✅ Worker `ropeaccesscenter-id` + **Workers Builds** dari `main`; build variable `PUBLIC_SITE_ENV=staging` (noindex sampai domain siap).
2. ✅ D1 baru `rac-db` (region APAC) dibuat + migrasi `migrations/0001_contact_messages.sql` dijalankan.
3. ✅ Fine-grained PAT "RAC dashboard" (berlaku s.d. 19/11/2027 — perpanjang sebelum tanggal itu) → secret `GITHUB_TOKEN`.
4. ✅ OAuth App GitHub "RAC Dashboard" (callback workers.dev) → `GITHUB_OAUTH_CLIENT_ID` + `GITHUB_OAUTH_CLIENT_SECRET`.
5. ✅ Secret `SESSION_SECRET`. Login dashboard `/admin` diuji berhasil (akun `inland-code`).

### Fase 8 — Domain & peluncuran (paling akhir)

- Ganti data contoh lewat dashboard (Data Bisnis, Tim, Testimoni, Jadwal) — wajib sebelum mode produksi.
- Sambungkan `ropeaccesscenter.id` ke Worker, redirect `www` → root, tambah trailing slash, ubah build variable `PUBLIC_SITE_ENV` → `production`, tambah callback OAuth domain baru, Search Console + sitemap.

## Data yang perlu dikonfirmasi pemilik (⏳ sebelum peluncuran)

Data di source code lama tampak sebagai **contoh/placeholder** dan tidak boleh tayang di situs live tanpa konfirmasi:

- ⏳ Nomor WhatsApp/telepon (`+62 812 3456 7890`) dan alamat (`Jl. Industri Raya No. 10, Jakarta`), koordinat peta.
- ⏳ Akun media sosial (facebook/instagram/linkedin/youtube `ropeaccesscenter`).
- ⏳ Nama legal (`PT Rope Access Center Indonesia`), tahun berdiri (2014), angka statistik (1.200+ teknisi, 98%, 250+ proyek).
- ⏳ Nama & profil tim instruktur, testimoni klien (nama orang & perusahaan), status akreditasi (IRATA member company?
  LSP BNSP? ISO 45001?). Testimoni & tim ditandai `sample: true` dan **otomatis disembunyikan di build produksi**
  sampai pemilik mengonfirmasi.
- ⏳ Jadwal kelas 2026–2027 yang sebenarnya, harga (saat ini "Hubungi kami").
- ⏳ Foto asli (pelatihan, menara latih, proyek) — bisa diunggah kapan saja lewat dashboard.
