-- URL yang sudah dikirim ke IndexNow beserta hash isinya (dibuat juga otomatis oleh Worker bila belum ada).
CREATE TABLE IF NOT EXISTS indexnow_urls (
  url          TEXT PRIMARY KEY,
  hash         TEXT NOT NULL,
  submitted_at TEXT NOT NULL
);
