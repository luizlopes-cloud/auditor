-- Tipos de artefato
create type artifact_type as enum ('planilha', 'script', 'dashboard', 'flow', 'query', 'outro');
create type artifact_source as enum ('upload', 'github');
create type artifact_status as enum ('pending', 'analyzing', 'done', 'error');
create type laudo_resultado as enum ('aprovado', 'ajustes_necessarios', 'reprovado');

-- Artefatos submetidos
create table artifacts (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  name text not null,
  type artifact_type not null,
  source artifact_source not null,
  github_url text,
  file_name text,
  content text,
  submitted_by text not null,
  description text,
  status artifact_status not null default 'pending'
);

-- Laudos gerados pela IA
create table laudos (
  id uuid primary key default gen_random_uuid(),
  artifact_id uuid references artifacts(id) on delete cascade not null,
  created_at timestamptz default now(),
  resultado laudo_resultado not null,
  score integer check (score between 0 and 100),
  resumo text not null,
  checks jsonb not null default '[]',
  tempo_analise_ms integer
);

-- Índices
create index on artifacts(status);
create index on artifacts(created_at desc);
create index on laudos(artifact_id);
create index on laudos(resultado);

-- RLS desabilitado (intranet interna)
alter table artifacts enable row level security;
alter table laudos enable row level security;
create policy "public_access_artifacts" on artifacts for all using (true);
create policy "public_access_laudos" on laudos for all using (true);
