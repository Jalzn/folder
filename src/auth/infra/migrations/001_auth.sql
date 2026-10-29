CREATE TABLE auth_owner (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  name TEXT NOT NULL,
  installation_id TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  password_changed_at TEXT NOT NULL
);
CREATE TABLE auth_sessions (
  id TEXT PRIMARY KEY,
  digest TEXT NOT NULL UNIQUE,
  device_label TEXT NOT NULL,
  created_at TEXT NOT NULL,
  last_used_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);
CREATE INDEX auth_sessions_expires_at ON auth_sessions(expires_at);
