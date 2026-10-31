CREATE TABLE auth_access_tokens (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL CHECK (length(name) BETWEEN 1 AND 100),
  digest TEXT NOT NULL UNIQUE,
  prefix TEXT NOT NULL,
  scope TEXT NOT NULL CHECK (scope = 'read'),
  created_at TEXT NOT NULL,
  last_used_at TEXT
);
CREATE INDEX auth_access_tokens_created ON auth_access_tokens(created_at);
