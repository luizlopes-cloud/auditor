-- Migration: features batch (manual approval, versioning, comments, team)

ALTER TABLE laudos ADD COLUMN IF NOT EXISTS aprovacao_manual text;
ALTER TABLE laudos ADD COLUMN IF NOT EXISTS nota_aprovacao text;
ALTER TABLE laudos ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1;

ALTER TABLE artifacts ADD COLUMN IF NOT EXISTS equipe text;

CREATE TABLE IF NOT EXISTS comentarios (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  laudo_id uuid NOT NULL REFERENCES laudos(id) ON DELETE CASCADE,
  autor text NOT NULL,
  texto text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS comentarios_laudo_id_idx ON comentarios(laudo_id);
CREATE INDEX IF NOT EXISTS laudos_artifact_id_version_idx ON laudos(artifact_id, version DESC);
