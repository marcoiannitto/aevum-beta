-- Body composition scan storage (InBody / BIA-ACC / Other)
-- Isolated from daily_logs and users tables
CREATE TABLE IF NOT EXISTS body_scans (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL,
  scan_date TEXT NOT NULL,
  scan_type TEXT NOT NULL DEFAULT 'InBody',
  scan_height REAL,
  scan_weight REAL,
  scan_bmi REAL,
  body_fat_pct REAL,
  fat_mass REAL,
  smm REAL,
  tbw REAL,
  scan_bmr INTEGER,
  visceral_fat REAL,
  body_score REAL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE INDEX IF NOT EXISTS idx_body_scans_user ON body_scans(user_id, scan_date);
