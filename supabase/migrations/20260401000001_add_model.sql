ALTER TABLE laudos ADD COLUMN model_used text;
CREATE INDEX ON laudos(created_at DESC);
