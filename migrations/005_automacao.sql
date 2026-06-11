-- ============================================================
-- Migration 005: Automação (cadência, fila Maestro, TTL aprovações)
-- Idempotente — seguro para rodar múltiplas vezes
-- ============================================================

-- Cadência de follow-up nos leads
alter table leads add column if not exists meta_cadencia jsonb default '{}'::jsonb;
-- Estrutura esperada do JSON:
-- { "passo": 0..6, "ultimo_em": ISO, "proximo_em": ISO, "pausado": bool, "total_enviados": N }

-- Qualificação automática (preenchida pelo SDR via Groq quando lead chega no site)
alter table leads add column if not exists score_ia int default 0;
alter table leads add column if not exists segmento text;
alter table leads add column if not exists tags_ia jsonb default '[]'::jsonb;
alter table leads add column if not exists cor text default 'branco';
-- segmento: 'investidor' | 'morar' | 'veranear' | 'urgente' | 'longo_prazo' | 'indefinido'
-- cor: 'verde' (quente) | 'amarelo' (morno) | 'vermelho' (frio) | 'branco' (indeterminado)
create index if not exists idx_leads_score on leads(score_ia desc);
create index if not exists idx_leads_segmento on leads(segmento) where segmento is not null;

-- Aprovações com TTL
alter table approvals add column if not exists expira_em timestamptz;
alter table approvals add column if not exists expirada_em timestamptz;

-- Tabela de tarefas agendadas (fila do Maestro)
create table if not exists fila_tarefas (
  id uuid primary key default gen_random_uuid(),
  agente_destino text not null,
  tipo text not null,
  payload jsonb,
  prioridade int default 5,
  status text default 'pendente', -- pendente, executando, concluida, falhou
  resultado text,
  erro text,
  criado_em timestamptz default now(),
  iniciado_em timestamptz,
  concluido_em timestamptz
);
create index if not exists idx_fila_status on fila_tarefas(status, prioridade);

-- Estado do Maestro (last_cycle, decisões)
create table if not exists maestro_ciclos (
  id uuid primary key default gen_random_uuid(),
  decisoes_json jsonb,
  tarefas_criadas int default 0,
  resumo text,
  rodou_em timestamptz default now()
);

-- RLS — só service_role
alter table fila_tarefas enable row level security;
alter table maestro_ciclos enable row level security;
