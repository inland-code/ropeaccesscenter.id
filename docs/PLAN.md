# Rencana Rebuild ropeaccesscenter.id — Astro + Cloudflare (mengikuti template Inland)

Status: **LIVE di https://ropeaccesscenter.id** (mode produksi, 2026-11-19) · sitemap terkirim ke Search Console · menunggu hasil peninjauan Safe Browsing

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

| Halaman                 | ID                                      | EN                                   |
| ----------------------- | --------------------------------------- | ------------------------------------ |
| Beranda                 | `/`                                     | `/en/`                               |
| Tentang Kami            | `/tentang-kami/`                        | `/en/about-us/`                      |
| Pelatihan (hub)         | `/pelatihan/`                           | `/en/training/`                      |
| — TKPK Tingkat 1        | `/pelatihan-tkpk-tingkat-1/`            | `/en/tkpk-level-1-training/`         |
| — TKPK Tingkat 2        | `/pelatihan-tkpk-tingkat-2/`            | `/en/tkpk-level-2-training/`         |
| — TKPK Tingkat 3        | `/pelatihan-tkpk-tingkat-3/`            | `/en/tkpk-level-3-training/`         |
| — TKBT Tingkat 1        | `/pelatihan-tkbt-tingkat-1/`            | `/en/tkbt-level-1-training/`         |
| — TKBT Tingkat 2        | `/pelatihan-tkbt-tingkat-2/`            | `/en/tkbt-level-2-training/`         |
| Jadwal Pelatihan        | `/jadwal-pelatihan/`                    | `/en/training-schedule/`             |
| Sertifikasi             | `/sertifikasi/`                         | `/en/certification/`                 |
| Layanan (hub)           | `/layanan/`                             | `/en/services/`                      |
| — Inspeksi visual & NDT | `/jasa-inspeksi-ndt/`                   | `/en/ndt-inspection-services/`       |
| — Perawatan & perbaikan | `/jasa-perawatan-perbaikan-ketinggian/` | `/en/maintenance-repair-at-height/`  |
| — Kaca & fasad gedung   | `/jasa-perawatan-fasad-gedung/`         | `/en/building-facade-maintenance/`   |
| — Standby rescue        | `/jasa-standby-rescue/`                 | `/en/standby-rescue-services/`       |
| — Penyediaan teknisi    | `/penyediaan-teknisi-akses-tali/`       | `/en/rope-access-technician-supply/` |
| Artikel (daftar)        | `/artikel/`                             | `/en/insights/`                      |
| — 6 artikel             | `/<slug-artikel>/`                      | `/en/<slug-terjemahan>/`             |
| FAQ                     | `/faq/`                                 | `/en/faq/`                           |
| Kontak                  | `/kontak/`                              | `/en/contact/`                       |
| Kebijakan Privasi       | `/kebijakan-privasi/`                   | `/en/privacy-policy/`                |
| Syarat & Ketentuan      | `/syarat-ketentuan/`                    | `/en/terms-conditions/`              |

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

### Fase 8 — Domain & peluncuran ✅ (2026-11-19)

- ✅ Domain di Cloudflare (nameserver Niagahoster → `charles`/`joyce.ns.cloudflare.com`), record parkir lama dihapus.
- ✅ Custom domain Worker `ropeaccesscenter.id` + `www`; Redirect Rule 301 `www` → root.
- ✅ OAuth App callback dipindah ke `https://ropeaccesscenter.id/api/auth/callback`; dashboard di `/admin/`.
- ✅ Build pratinjau (Previews) dimatikan; `PUBLIC_SITE_ENV=production` + rebuild → `robots.txt` Allow.
- ✅ Google Search Console: properti Domain `ropeaccesscenter.id` terverifikasi; `sitemap_index.xml` dikirim — status **Berhasil**.
- ⏳ Safe Browsing: Google mencatat "Halaman tidak jujur" (salah deteksi pada `/api/auth/login`, redirect ke OAuth GitHub
  dari domain baru). Halaman login diubah agar tidak menyerupai halaman GitHub (PR #8); peninjauan diminta di Search Console
  dan laporan salah deteksi dikirim. Sambil menunggu, login dashboard lewat "Detail → kunjungi situs". Hasil dikirim via email.
- ⏳ Pantau Search Console 2–4 minggu (Pengindeksan halaman, Masalah keamanan); Bing Webmaster (impor dari GSC) opsional.

Rencana awal fase ini:

- Ganti data contoh lewat dashboard (Data Bisnis, Tim, Testimoni, Jadwal) — wajib sebelum mode produksi.
- Sambungkan `ropeaccesscenter.id` ke Worker, redirect `www` → root, tambah trailing slash, ubah build variable `PUBLIC_SITE_ENV` → `production`, tambah callback OAuth domain baru, Search Console + sitemap.

## Revisi konten 2026-11-19 (arahan pemilik)

- Sertifikasi **hanya Kemnaker RI**: program IRATA, BNSP, dan refresher dihapus; diganti TKPK Tingkat 1–3 (akses tali)
  dan TKBT Tingkat 1–2 (bangunan tinggi). Prasyarat mengikuti informasi publik penyedia pelatihan; durasi & biaya
  "dikonfirmasi saat pendaftaran" — isi lewat dashboard bila sudah pasti.
- Klaim angka & "sejak 2014" dihapus; pelatihan **sejak 2024**, RAC sebagai brand grup Inland. Section statistik dihapus.
- Layanan: 5 halaman ditulis ulang & dioptimasi (fasad/kaca, perawatan & perbaikan, inspeksi & NDT, standby rescue,
  penyediaan teknisi) — lingkup, aset, hasil kerja, 4 langkah kerja, FAQ khusus. Halaman konsultasi/audit K3 digabung ke standby rescue.
- 2 artikel ditulis ulang (TKPK vs TKBT, jenjang karier); tautan artikel lain diarahkan ke program baru.
- URL lama di-redirect 301 (`public/_redirects`), dicek `scripts/verify-urls.mjs`.

## Optimasi & konten kompetitif (2026-11-19)

- Riset kompetitor: penyedia pelatihan TKPK/TKBT menampilkan halaman per program (harga, syarat) dan artikel pendukung
  (TKBT 1 vs 2, TKPK 1–3, Kemnaker vs BNSP); jasa fasad bersaing lewat artikel prosedur & perbandingan metode.
- ✅ Program: section "Yang sudah termasuk" + FAQ khusus tiap program (4 tanya-jawab, FAQPage JSON-LD).
- ✅ Hub Pelatihan: 4 langkah pendaftaran; layanan fasad & perawatan: tabel rope access vs gondola vs perancah.
- ✅ 3 artikel baru ID + EN: apa itu rope access, TKBT 1 vs TKBT 2, sertifikat K3 Kemnaker vs BNSP (+ Kepdirjen 45/2008).
- ✅ JSON-LD `ItemList` di hub Pelatihan, Layanan, Artikel; `updatedAt` semua halaman (lastmod sitemap).
- ✅ Kode: section sisa Inland (`service-cards`, `banner`) & string UI tak terpakai dihapus; header COOP;
  GitHub Actions checkout v7, setup-node v7, cache v6 (menggantikan PR Dependabot #2–#4). TypeScript 7 (PR #5) ditunda.
- ✅ Lighthouse mobile (produksi, Brotli lokal): 100/100/100/100 di program, layanan, dan artikel baru.
- Halaman fasad/kaca RAC dan halaman pembersihan kaca Inland menyasar kata kunci serupa — pemilik setuju keduanya
  boleh bersaing; fokus dibedakan (Inland: gedung & renovasi; RAC: pelatihan Kemnaker & pekerjaan di ketinggian/industri).

## Grup Inland × RAC (2026-11-19)

- ✅ Saling menautkan: halaman perawatan fasad & perawatan di ketinggian (ID/EN) menautkan jasa Inland; CTA ke Inland di
  hub Layanan; artikel "Apa itu Rope Access" menautkan artikel rope access Inland. Inland menautkan balik dari footer,
  halaman jasa rope access, pembersihan kaca, tentang Inland, dan artikel rope access (repo `inland-code/inland.co.id`).
- ✅ JSON-LD: RAC `parentOrganization` Inland; Inland `subOrganization` RAC.

## Media sosial (2026-11-22)

- ✅ Instagram, Facebook, Threads `@ropeaccesscenter` tertaut di footer, halaman Kontak, JSON-LD `sameAs`, dan `llms.txt`.
  Field `threads` ditambahkan ke skema Data Bisnis. Panduan optimasi profil: [`docs/SOSMED.md`](SOSMED.md).

## Data pemilik

RAC adalah brand dari grup Inland, jadi kontak memakai data Inland (2026-11-19):

- ✅ WhatsApp/telepon `+62 856 770 0883`, email `info@inland.co.id`, alamat Jl. Kelor II No 31, Pd. Cabe Ilir, Pamulang,
  Tangerang Selatan 15418, jam buka Senin–Jumat 08–17, Sabtu 08–13. JSON-LD `parentOrganization`: Inland; footer "Bagian dari grup Inland".
- ✅ Tahun berdiri & koordinat peta dikosongkan (opsional) sampai ada data pasti.
- ✅ Jadwal kelas contoh disembunyikan (`published: false`); hanya "Pelatihan in-house — sesuai permintaan" yang tampil.
  Tambahkan tanggal kelas asli lewat dashboard → Jadwal Kelas.
- ✅ Klaim angka lama dihapus (lihat revisi konten di atas).
- ⏳ Tim & testimoni masih data contoh (`sample: true`) → otomatis tersembunyi di produksi sampai diganti data asli.
- ⏳ Media sosial RAC belum ada (ikon otomatis tersembunyi). Email `@ropeaccesscenter.id` belum aktif (tanpa MX).
- ⏳ Foto asli (pelatihan, menara latih, proyek) — bisa diunggah kapan saja lewat dashboard.
- ⏳ Durasi, biaya, dan tanggal kelas program Kemnaker — isi lewat dashboard (Halaman → program, Jadwal Kelas).

## Pemeliharaan

- Token GitHub "RAC dashboard" (`GITHUB_TOKEN`) berlaku s.d. **19/11/2027** — buat token baru dengan izin yang sama dan
  ganti secret di Cloudflare sebelum tanggal itu, atau tombol "Simpan" di dashboard berhenti berfungsi.
- Perubahan `PUBLIC_SITE_ENV` (Cloudflare → Settings → Builds → Variables) baru berlaku setelah build ulang (Retry build).
- Build pratinjau untuk branch non-`main` dimatikan (tab Previews Base); hanya `main` yang di-build & di-deploy.
- PR otomatis Dependabot (update paket) dicek dulu sebelum di-merge — versi mayor (mis. TypeScript 7) bisa gagal CI.
