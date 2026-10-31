CREATE TABLE workspace_canvas_previews (
  canvas_id TEXT PRIMARY KEY REFERENCES workspace_canvases(id) ON DELETE CASCADE,
  scene_version INTEGER NOT NULL CHECK (scene_version > 0),
  png BLOB NOT NULL CHECK (length(png) BETWEEN 1 AND 262144),
  width INTEGER NOT NULL CHECK (width BETWEEN 1 AND 1568),
  height INTEGER NOT NULL CHECK (height BETWEEN 1 AND 1568),
  created_at TEXT NOT NULL
);
