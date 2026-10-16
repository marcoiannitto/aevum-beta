-- Per-client phase lengths (NULL = use default)
ALTER TABLE users ADD COLUMN loading_days INTEGER;
ALTER TABLE users ADD COLUMN transition_days INTEGER;
ALTER TABLE users ADD COLUMN stabilization_days INTEGER;
