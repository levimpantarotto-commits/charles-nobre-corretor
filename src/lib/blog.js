// Helper pra carregar posts do blog. Compativel com Node + Edge runtime.
// Tenta Supabase com timeout 3s; cai pro seed JSON importado estaticamente
// (sem fs, pra funcionar em opengraph-image que roda em edge).
import { supabase } from '@/lib/supabase';
import seedData from '@/data/blog-seed.json';

const TIMEOUT_MS = 3000;

function readLocalSeed() {
  return Array.isArray(seedData) ? seedData : [];
}

function withTimeout(promise, ms) {
  return Promise.race([
    promise,
    new Promise((_, rej) => setTimeout(() => rej(new Error('Supabase timeout')), ms)),
  ]);
}

// Lista todos os posts publicados (mais recentes primeiro)
export async function getAllPosts({ limit = 50, city = null, tag = null } = {}) {
  try {
    let q = supabase
      .from('blog_posts_public')
      .select('*')
      .order('published_at', { ascending: false })
      .limit(limit);
    if (city) q = q.eq('city', city);
    if (tag) q = q.contains('tags', [tag]);
    const { data, error } = await withTimeout(q, TIMEOUT_MS);
    if (!error && Array.isArray(data) && data.length > 0) return data;
    if (error) console.warn('blog: Supabase erro, fallback seed —', error.message);
  } catch (err) {
    console.warn('blog: fallback seed —', err.message);
  }
  let posts = readLocalSeed().filter((p) => p.published);
  if (city) posts = posts.filter((p) => p.city === city);
  if (tag) posts = posts.filter((p) => Array.isArray(p.tags) && p.tags.includes(tag));
  return posts.slice(0, limit);
}

// Busca 1 post por slug
export async function getPostBySlug(slug) {
  if (!slug) return null;
  try {
    const { data, error } = await withTimeout(
      supabase.from('blog_posts_public').select('*').eq('slug', slug).single(),
      TIMEOUT_MS,
    );
    if (!error && data) return data;
  } catch {
    // segue pro fallback
  }
  return readLocalSeed().find((p) => p.slug === slug && p.published) || null;
}

// Lista slugs publicados (pra generateStaticParams + sitemap)
export async function getAllPostSlugs() {
  try {
    const { data, error } = await withTimeout(
      supabase
        .from('blog_posts_public')
        .select('slug, published_at, city, tags')
        .order('published_at', { ascending: false }),
      TIMEOUT_MS,
    );
    if (!error && Array.isArray(data) && data.length > 0) return data;
  } catch {
    // segue
  }
  return readLocalSeed()
    .filter((p) => p.published)
    .map((p) => ({
      slug: p.slug,
      published_at: p.published_at,
      city: p.city,
      tags: p.tags,
    }));
}

// Conta posts (admin precisa pra badge / paginacao)
export async function countPosts() {
  try {
    const { count, error } = await withTimeout(
      supabase.from('blog_posts').select('id', { count: 'exact', head: true }),
      TIMEOUT_MS,
    );
    if (!error && typeof count === 'number') return count;
  } catch {
    // fallback
  }
  return readLocalSeed().length;
}

// Helpers de UI
export function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
}

export function citySlug(city) {
  if (!city) return null;
  return city.toLowerCase().replace(/\s+/g, '-').normalize('NFD').replace(/[̀-ͯ]/g, '');
}

export function cityFromSlug(slug) {
  const map = {
    imbituba: 'Imbituba',
    garopaba: 'Garopaba',
    imarui: 'Imaruí',
  };
  return map[(slug || '').toLowerCase()] || null;
}

// Estimativa de tempo de leitura (200 palavras / min)
export function estimateReadingMinutes(markdown) {
  if (!markdown) return 1;
  const words = markdown.replace(/[#*`>\-\[\]()]/g, ' ').split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}
