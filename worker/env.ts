export interface Env {
  ASSETS: Fetcher;
  /** D1 untuk pesan formulir kontak. */
  DB?: D1Database;
  WHATSAPP_NUMBER: string;
  /** Secret opsional: Cloudflare Turnstile. Jika diisi, formulir wajib lolos verifikasi. */
  TURNSTILE_SECRET?: string;

  /* ---- Dashboard: login dengan GitHub (OAuth App) ---- */
  /** Client ID OAuth App GitHub (boleh publik). */
  GITHUB_OAUTH_CLIENT_ID?: string;
  /** Secret: Client secret OAuth App GitHub. */
  GITHUB_OAUTH_CLIENT_SECRET?: string;
  /** Secret: kunci acak panjang untuk menandatangani cookie sesi. */
  SESSION_SECRET?: string;
  /** Username GitHub yang boleh masuk, dipisah koma (mis. "inland-code"). */
  ADMIN_GITHUB_USERS?: string;
  /** Email terverifikasi di akun GitHub yang boleh masuk, dipisah koma. */
  ADMIN_EMAIL?: string;

  /* ---- Dashboard: penyimpanan ke repo ---- */
  /** Secret: fine-grained PAT GitHub (Contents: read & write, Actions: read) khusus repo ini. */
  GITHUB_TOKEN?: string;
  GITHUB_REPO: string;
  GITHUB_BRANCH: string;

  /* ---- Hanya untuk pengujian lokal ---- */
  GITHUB_API?: string;
  GITHUB_WEB?: string;
  /** "1" = lewati login di localhost (hanya `wrangler dev`). */
  ADMIN_DEV_BYPASS?: string;
}
