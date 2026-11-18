-- Riwayat formulir kontak (ditampilkan di dashboard /admin).
CREATE TABLE IF NOT EXISTS contact_messages (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at  TEXT    NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%SZ', 'now')),
  locale      TEXT    NOT NULL DEFAULT 'id',
  page        TEXT,
  name        TEXT    NOT NULL,
  phone       TEXT,
  service     TEXT,
  message     TEXT    NOT NULL,
  status      TEXT    NOT NULL DEFAULT 'baru' CHECK (status IN ('baru', 'dihubungi', 'selesai', 'spam')),
  country     TEXT,
  city        TEXT,
  user_agent  TEXT
);
CREATE INDEX IF NOT EXISTS idx_contact_messages_created ON contact_messages (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_contact_messages_status ON contact_messages (status);
