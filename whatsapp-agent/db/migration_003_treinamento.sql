-- migration_003_treinamento.sql
-- Base de conhecimento do agente IA Charles Nobre

create table if not exists treinamento (
  id           uuid primary key default gen_random_uuid(),
  categoria    text not null check (categoria in ('dna_charles','argumentos','contratos','regiao','pipeline','regras','outros')),
  titulo       text not null,
  conteudo     text not null,
  tipo         text not null default 'texto' check (tipo in ('texto','pdf','audio')),
  ativo        boolean not null default true,
  arquivo_path text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- Índice para listar por categoria rapidamente
create index if not exists idx_treinamento_categoria_ativo on treinamento (categoria, ativo);

-- Trigger para atualizar updated_at automaticamente
create or replace function set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists treinamento_updated_at on treinamento;
create trigger treinamento_updated_at
  before update on treinamento
  for each row execute function set_updated_at();

-- RLS: desabilitado (service_role bypassa de qualquer forma)
alter table treinamento disable row level security;
