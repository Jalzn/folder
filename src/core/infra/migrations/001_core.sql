CREATE TABLE core_mutations (
  request_id TEXT PRIMARY KEY,
  operation TEXT NOT NULL,
  fingerprint TEXT NOT NULL,
  response TEXT NOT NULL CHECK(json_valid(response)),
  created_at TEXT NOT NULL
);
CREATE INDEX core_mutations_created_at ON core_mutations(created_at);
