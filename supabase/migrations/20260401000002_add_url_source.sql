-- Add 'url' to artifact_source enum and source_url column
ALTER TYPE artifact_source ADD VALUE IF NOT EXISTS 'url';

ALTER TABLE artifacts ADD COLUMN IF NOT EXISTS source_url text;
