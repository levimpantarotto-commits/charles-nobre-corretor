-- Migration 003 — blog_posts pra SEO local (Imbituba/Garopaba/Imaruí)
-- Rodar no SQL Editor do Supabase. Idempotente.

create table if not exists blog_posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  excerpt text,                                -- resumo curto pro card + meta description
  content_md text not null,                    -- corpo em markdown
  cover_image text,                            -- URL da capa (Supabase Storage ou externa)
  tags text[] default array[]::text[],         -- ex: ['compra', 'financiamento', 'imbituba']
  city text,                                   -- 'Imbituba' | 'Garopaba' | 'Imaruí' | null (geral)
  author text default 'Charles R. Nobre',
  seo_keywords text[] default array[]::text[], -- pra meta keywords (legado, mas ok)
  reading_minutes int,                         -- estimado, populado no save
  published boolean default false,
  published_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_blog_posts_published on blog_posts(published, published_at desc);
create index if not exists idx_blog_posts_city on blog_posts(city) where city is not null;
create index if not exists idx_blog_posts_slug on blog_posts(slug);

-- View pública (só publicados, sem campos internos)
create or replace view blog_posts_public as
select id, slug, title, excerpt, content_md, cover_image, tags, city, author,
       seo_keywords, reading_minutes, published_at, created_at
from blog_posts
where published = true and published_at <= now()
order by published_at desc;

-- RLS: leitura pública só dos publicados; mutations só com service_role
alter table blog_posts enable row level security;

drop policy if exists "blog_posts_select_published" on blog_posts;
create policy "blog_posts_select_published" on blog_posts
  for select using (published = true and published_at <= now());

-- Trigger updated_at
create or replace function update_blog_posts_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_blog_posts_updated_at on blog_posts;
create trigger trg_blog_posts_updated_at
  before update on blog_posts
  for each row execute function update_blog_posts_updated_at();
