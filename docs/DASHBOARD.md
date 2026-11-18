# Dashboard Rope Access Center (`/admin`)

Dashboard untuk pemilik situs: mengedit halaman, menulis artikel, mengelola media,
membaca pesan formulir kontak, dan mengubah data bisnis — tanpa menyentuh kode.

## Cara kerja

```
Browser (/admin, hanya pemilik)
   │  Login dengan GitHub (OAuth App, gratis)
   ▼
Worker /api/admin/*  ── verifikasi cookie sesi bertanda tangan + akun GitHub yang diizinkan
   ├─ baca/tulis konten ──► GitHub API (commit ke branch main)
   │                          └─► GitHub Actions: build + audit SEO + deploy (±1–3 menit)
   └─ pesan masuk ─────────► Cloudflare D1
```

- **Semua konten & media tetap di repo.** Setiap "Simpan" = satu commit, jadi ada riwayat dan bisa di-rollback.
- **Build adalah pengaman terakhir.** Jika konten tidak valid, build gagal dan situs live tidak berubah.
  Dashboard juga memvalidasi dengan skema yang sama sebelum menyimpan.
- **Halaman publik tetap 0 KB JavaScript.** Kode dashboard hanya dimuat di `/admin`.

| Menu                         | Fungsi                                                                     |
| ---------------------------- | -------------------------------------------------------------------------- |
| Ringkasan                    | Jumlah pesan baru, status build & deploy terakhir                          |
| Halaman                      | Edit SEO, hero, dan section (tambah/hapus/urutkan) semua halaman ID & EN   |
| Artikel                      | Buat, edit (Markdown + pratinjau), hapus artikel; FAQ untuk rich result    |
| Jadwal Kelas                 | Tambah/ubah kelas terbuka (tanggal, lokasi, sisa kursi, status)            |
| FAQ                          | Tanya-jawab dua bahasa (per grup: umum, pelatihan, sertifikasi, layanan)   |
| Tim / Testimoni / Akreditasi | Data dua bahasa yang tampil di Beranda, Tentang Kami, Sertifikasi          |
| Media                        | Unggah gambar (otomatis dikompres maks 2560px/WebP di browser), salin path |
| Pesan Masuk                  | Riwayat formulir kontak, ubah status, balas langsung via WhatsApp          |
| Data Bisnis                  | Nama, telepon, WhatsApp, alamat, jam buka, media sosial                    |
| Redirect                     | Kelola `public/_redirects` (301) dengan validasi format                    |

## Setup (sekali saja)

### 1. Database D1 — ✅ sudah dibuat (`rac-db`, APAC), migrasi `0001_contact_messages.sql` sudah dijalankan, terhubung di `wrangler.jsonc`.

### 2. Token GitHub untuk menyimpan perubahan

GitHub → Settings → Developer settings → **Fine-grained personal access tokens** → Generate new token

- Resource owner: `inland-code` · Repository access: **Only select repositories** → `ropeaccesscenter.id`
- Permissions: **Contents: Read and write**, **Actions: Read-only**
- Expiration: maks. 1 tahun — catat tanggalnya untuk diperpanjang.

### 3. OAuth App GitHub untuk login dashboard (gratis, tanpa kartu kredit)

GitHub → Settings → Developer settings → **OAuth Apps** → **New OAuth App**

- Application name: `RAC Dashboard`
- Homepage URL: `https://ropeaccesscenter-id.<subdomain-akun>.workers.dev`
- Authorization callback URL: `https://ropeaccesscenter-id.<subdomain-akun>.workers.dev/api/auth/callback`
- Simpan **Client ID**, lalu **Generate a new client secret** dan simpan.

Setelah domain `ropeaccesscenter.id` tersambung, ganti kedua URL di atas ke domain itu.

### 4. Secret di Cloudflare

Workers & Pages → `ropeaccesscenter-id` → Settings → Variables and Secrets → **Add** (pilih tipe **Secret** untuk semuanya):

| Nama                         | Isi                                                                                                 |
| ---------------------------- | --------------------------------------------------------------------------------------------------- |
| `GITHUB_TOKEN`               | token dari langkah 2                                                                                |
| `GITHUB_OAUTH_CLIENT_ID`     | Client ID dari langkah 3                                                                            |
| `GITHUB_OAUTH_CLIENT_SECRET` | Client secret dari langkah 3                                                                        |
| `SESSION_SECRET`             | teks acak panjang (≥ 32 karakter)                                                                   |
| `ADMIN_EMAIL`                | email akun GitHub pemilik (opsional; akun `inland-code` sudah diizinkan lewat `ADMIN_GITHUB_USERS`) |

Akun yang diizinkan diatur di `wrangler.jsonc` → `ADMIN_GITHUB_USERS` (dipisah koma).

### 5. Deploy

Workers & Pages → **Create** → Import a repository → `inland-code/ropeaccesscenter.id`, branch `main`
(build command `npm run build`, deploy command `npx wrangler deploy`). Setiap push ke `main` otomatis di-build & di-deploy;
build `main` di Workers Builds otomatis mode produksi (boleh diindeks).

## Pengembangan lokal

```bash
npm run build
npx wrangler dev --var ADMIN_DEV_BYPASS:1 --var GITHUB_TOKEN:<token-uji>
# buka http://localhost:8787/admin/
```

`ADMIN_DEV_BYPASS` hanya berlaku untuk host `localhost`/`127.0.0.1`, tidak pernah di produksi.

## Keamanan

- API menolak semua permintaan tanpa cookie sesi yang valid (HMAC-SHA256, kedaluwarsa 7 hari, HttpOnly, Secure, SameSite=Lax).
- Login hanya untuk akun GitHub di `ADMIN_GITHUB_USERS` atau email terverifikasi di `ADMIN_EMAIL`; parameter `state` OAuth mencegah login palsu.
- Permintaan yang mengubah data wajib dari origin yang sama (anti-CSRF).
- Hanya path konten tertentu yang bisa ditulis: `src/content/{pages,posts}/**`, `src/content/data/*.json`, `src/assets/images/**`, `src/data/site.json`, `public/_redirects`.
- Penyimpanan memakai `sha` file sehingga tidak menimpa perubahan lain secara diam-diam (konflik → pesan error).
