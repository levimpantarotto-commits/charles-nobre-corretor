-- ============================================================
-- Migration 004: Neural Modules
-- Idempotente — seguro para rodar múltiplas vezes
-- ============================================================

-- 1. briefings
create table if not exists briefings (
  id uuid primary key default gen_random_uuid(),
  conteudo text not null,
  gerado_em timestamptz default now()
);

-- 2. skills
create table if not exists skills (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  titulo text not null,
  descricao text,
  prompt_template text not null,
  matchers text[] default array[]::text[],
  ativo boolean default true,
  criado_em timestamptz default now()
);

-- 3. skill_execucoes
create table if not exists skill_execucoes (
  id uuid primary key default gen_random_uuid(),
  skill_id uuid references skills(id) on delete cascade,
  entrada text,
  output text,
  sucesso boolean default true,
  erro text,
  ms integer,
  criado_em timestamptz default now()
);

-- 4. treinamento
create table if not exists treinamento (
  id uuid primary key default gen_random_uuid(),
  categoria text not null, -- dna_charles, argumentos, contratos, regiao, pipeline, regras, outros
  titulo text not null,
  conteudo text not null,
  tipo text default 'texto',
  ativo boolean default true,
  criado_em timestamptz default now()
);

-- 5. analises_conversa
create table if not exists analises_conversa (
  id uuid primary key default gen_random_uuid(),
  telefone text not null,
  score integer,
  pontos_fortes text,
  pontos_fracos text,
  erros jsonb,
  sugestoes text,
  analisado_em timestamptz default now()
);

-- 6. regras_propostas
create table if not exists regras_propostas (
  id uuid primary key default gen_random_uuid(),
  regra text not null,
  contexto text,
  status text default 'proposta', -- proposta, aprovada, rejeitada
  criado_em timestamptz default now()
);

-- 7. Expandir tabela properties para campos do Rokni
alter table properties add column if not exists quartos integer;
alter table properties add column if not exists suites integer;
alter table properties add column if not exists banheiros integer;
alter table properties add column if not exists vagas integer;
alter table properties add column if not exists area_total real;
alter table properties add column if not exists area_construida real;
alter table properties add column if not exists area_privativa real;
alter table properties add column if not exists terreno_frente text;
alter table properties add column if not exists terreno_fundo text;
alter table properties add column if not exists terreno_direita text;
alter table properties add column if not exists terreno_esquerda text;
alter table properties add column if not exists aceita_financiamento boolean default false;
alter table properties add column if not exists aceita_mcmv boolean default false;
alter table properties add column if not exists escriturado boolean default false;
alter table properties add column if not exists permuta boolean default false;
alter table properties add column if not exists condominio text;
alter table properties add column if not exists latitude real;
alter table properties add column if not exists longitude real;
alter table properties add column if not exists stripe text;
alter table properties add column if not exists caracteristicas text[];
alter table properties add column if not exists origem text default 'charles';
alter table properties add column if not exists origem_id text;
alter table properties add column if not exists url_origem text;
alter table properties add column if not exists subtipo text;

-- 8. Seed inicial de treinamento
insert into treinamento (categoria, titulo, conteudo) values
(
  'dna_charles',
  'Perfil Charles R. Nobre',
  'Charles R. Nobre, corretor imobiliário CRECI 37177, atua há mais de 12 anos em Imbituba, Garopaba e Imaruí (SC). Especialista em imóveis de médio e alto padrão no litoral catarinense. Tom profissional, direto e acolhedor. Trata o cliente pelo nome.'
),
(
  'regiao',
  'Região de atuação',
  'Imbituba: Vila Nova, Mirim, Alto Arroio, Nova Brasília, Progresso, Centro, Araçatuba, Ibiraquera. Garopaba: Centro, Lagoa, Ouvidor. Imaruí: Centro. Litoral catarinense com forte crescimento e valorização imobiliária.'
),
(
  'argumentos',
  'Principais argumentos de venda',
  'Imbituba tem melhor custo-benefício do litoral sul catarinense. Garopaba é destino de alto padrão em expansão. Região a 70km do aeroporto de Florianópolis. Financiamento facilitado. Alta valorização histórica nos últimos 5 anos.'
)
on conflict do nothing;

-- 9. Seed inicial de skills
insert into skills (slug, titulo, descricao, prompt_template, matchers) values
(
  'apresentar-imovel',
  'Apresentar Imóvel',
  'Apresenta um imóvel para um lead interessado',
  'Você é Charles R. Nobre, corretor CRECI 37177 em Imbituba SC. Apresente o imóvel a seguir de forma profissional e atrativa para um potencial comprador. Destaque os pontos fortes, localização e custo-benefício. Tom direto e acolhedor.' || E'\n\n' || 'IMÓVEL:' || E'\n' || '{{input}}',
  ARRAY['apresentar imóvel', 'descrever imóvel', 'texto do imóvel']
),
(
  'responder-objecao',
  'Responder Objeção',
  'Responde objeções de leads de forma profissional',
  'Você é Charles R. Nobre, corretor imobiliário em Imbituba SC. Um lead disse: "{{input}}". Responda a objeção de forma empática, profissional e construtiva, sem pressionar. Ofereça soluções reais.',
  ARRAY['responder objeção', 'lead disse', 'contornar objeção']
),
(
  'follow-up',
  'Follow-up de Lead',
  'Gera mensagem de follow-up para lead sem resposta',
  'Você é Charles R. Nobre, corretor em Imbituba SC. Gere uma mensagem de WhatsApp de follow-up para o lead a seguir que não respondeu. Tom natural, sem pressão, curto (máx 3 linhas).' || E'\n\n' || 'CONTEXTO DO LEAD:' || E'\n' || '{{input}}',
  ARRAY['follow-up', 'follow up', 'lead sumiu', 'não respondeu']
),
(
  'descricao-imovel',
  'Descrição para Anúncio',
  'Cria descrição atrativa para anúncio de imóvel',
  'Você é especialista em copywriting imobiliário. Crie uma descrição atrativa para anúncio do imóvel abaixo. Máx 150 palavras, tom profissional, destaque localização e diferenciais. Sem clichês.' || E'\n\n' || 'DADOS DO IMÓVEL:' || E'\n' || '{{input}}',
  ARRAY['descrição anúncio', 'texto anúncio', 'escrever anúncio']
)
on conflict (slug) do nothing;

-- 10. RLS nas novas tabelas
alter table briefings enable row level security;
alter table skills enable row level security;
alter table skill_execucoes enable row level security;
alter table treinamento enable row level security;
alter table analises_conversa enable row level security;
alter table regras_propostas enable row level security;

-- Nenhuma política pública — só service_role acessa
