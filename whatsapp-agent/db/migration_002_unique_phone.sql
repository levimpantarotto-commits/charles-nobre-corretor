-- Migration 002 — UNIQUE constraint em leads.phone + cleanup de duplicatas
-- ATENÇÃO: NÃO rodar sem revisar. Roda PASSO A PASSO no SQL Editor do Supabase.
-- Motivação: incidente Scheila 2026-05-19 — 15 leads pendentes apontando pro
-- mesmo phone fizeram bot disparar 15 vezes a mesma msg. Dedup no app
-- (broadcast.js + cooldown 12h) ja foi feito; isso aqui e a proteção
-- estrutural no banco pra cobrir todos os caminhos.

-- ============================================================
-- PASSO 1 — INSPECIONAR DUPLICATAS (sem alterar nada)
-- ============================================================
-- Roda primeiro pra ver o estrago. Se devolver 0 linhas, pula direto pro PASSO 4.
select
  regexp_replace(phone, '\D', '', 'g') as phone_normalizado,
  count(*) as qtd,
  array_agg(id order by created_at) as ids,
  array_agg(name order by created_at) as nomes,
  array_agg(phone order by created_at) as phones_originais,
  array_agg(created_at order by created_at) as criados
from leads
where phone is not null
group by regexp_replace(phone, '\D', '', 'g')
having count(*) > 1
order by qtd desc;

-- ============================================================
-- PASSO 2 — BACKUP DAS DUPLICATAS (pra forense, antes de deletar)
-- ============================================================
-- Cria tabela leads_dup_backup_<data> com tudo que vamos remover.
-- Rode antes do PASSO 3. Se algo der errado, e so restaurar.
create table if not exists leads_dup_backup_2026_05_19 as
with ranked as (
  select
    l.*,
    regexp_replace(l.phone, '\D', '', 'g') as phone_norm,
    row_number() over (
      partition by regexp_replace(l.phone, '\D', '', 'g')
      order by l.created_at asc
    ) as rn
  from leads l
  where l.phone is not null
)
select * from ranked where rn > 1;

-- Confere o backup
select count(*) as dup_backuped from leads_dup_backup_2026_05_19;

-- ============================================================
-- PASSO 3 — DELETAR DUPLICATAS (mantem a MAIS ANTIGA de cada grupo)
-- ============================================================
-- Estrategia: pra cada grupo de phones identicos (normalizados), preserva o
-- que foi criado primeiro (presumivelmente o "real") e apaga os outros.
-- Tambem reatribui whatsapp_messages dos deletados pro lead mantido.
with grupos as (
  select
    id,
    regexp_replace(phone, '\D', '', 'g') as phone_norm,
    row_number() over (
      partition by regexp_replace(phone, '\D', '', 'g')
      order by created_at asc
    ) as rn
  from leads
  where phone is not null
),
mantidos as (select id, phone_norm from grupos where rn = 1),
deletar as (select id, phone_norm from grupos where rn > 1)
-- Reatribui whatsapp_messages dos a-deletar pro mantido do mesmo phone_norm
update whatsapp_messages wm
set lead_id = m.id
from deletar d
join mantidos m on m.phone_norm = d.phone_norm
where wm.lead_id = d.id;

-- Agora deleta os duplicados
delete from leads
where id in (
  select id from (
    select
      id,
      row_number() over (
        partition by regexp_replace(phone, '\D', '', 'g')
        order by created_at asc
      ) as rn
    from leads
    where phone is not null
  ) ranked
  where rn > 1
);

-- ============================================================
-- PASSO 4 — UNIQUE INDEX em phone normalizado
-- ============================================================
-- Cria indice UNIQUE no phone normalizado (so digitos). Bloqueia insert/update
-- futuro que crie duplicata, independente do formato.
create unique index if not exists idx_leads_phone_normalized
  on leads (regexp_replace(phone, '\D', '', 'g'))
  where phone is not null;

-- ============================================================
-- VALIDAÇÃO (roda no final pra conferir)
-- ============================================================
-- 0 linhas = sucesso
select
  regexp_replace(phone, '\D', '', 'g') as phone_normalizado,
  count(*) as qtd
from leads
where phone is not null
group by regexp_replace(phone, '\D', '', 'g')
having count(*) > 1;

-- ============================================================
-- ROLLBACK (se precisar reverter)
-- ============================================================
-- drop index if exists idx_leads_phone_normalized;
-- -- restore manual de leads_dup_backup_2026_05_19 (faltam os relacionamentos)
