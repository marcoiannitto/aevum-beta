-- Reference ranges for body scan metrics (stored as JSON)
ALTER TABLE body_scans ADD COLUMN reference_json TEXT;
