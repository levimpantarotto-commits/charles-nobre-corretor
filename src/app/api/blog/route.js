import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { supabaseAdmin, hasServiceRole } from '@/lib/supabase-admin';
import { isAuthenticated } from '@/lib/admin-auth';
import { logActivity } from '@/lib/activity-log';
import { estimateReadingMinutes } from '@/lib/blog';

function slugify(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 80);
}

// GET /api/blog?published=all|true|false
// Pra admin: ?published=all retorna drafts tambem (precisa auth).
// Sem auth: retorna so publicados.
export async function GET(request) {
  try {
    const url = new URL(request.url);
    const publishedFilter = url.searchParams.get('published') || 'true';
    const authed = await isAuthenticated();

    let q;
    if (authed && publishedFilter === 'all') {
      q = supabaseAdmin.from('blog_posts').select('*').order('created_at', { ascending: false });
    } else {
      q = supabase
        .from('blog_posts_public')
        .select('*')
        .order('published_at', { ascending: false });
    }

    const { data, error } = await q;
    if (error) {
      console.warn('API blog GET:', error.message);
      return NextResponse.json([]);
    }
    return NextResponse.json(data || []);
  } catch (err) {
    console.error('API blog GET fatal:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST /api/blog — cria post novo (admin only)
export async function POST(request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }
  if (!hasServiceRole) {
    return NextResponse.json({
      error: 'SUPABASE_SERVICE_ROLE_KEY ausente — defina em .env.local pra liberar gravação',
    }, { status: 503 });
  }

  try {
    const body = await request.json();
    const title = String(body.title || '').trim();
    const contentMd = String(body.content_md || '').trim();
    if (!title || !contentMd) {
      return NextResponse.json({ error: 'title e content_md sao obrigatorios' }, { status: 400 });
    }

    const row = {
      slug: body.slug ? slugify(body.slug) : slugify(title),
      title,
      excerpt: body.excerpt || null,
      content_md: contentMd,
      cover_image: body.cover_image || null,
      tags: Array.isArray(body.tags) ? body.tags : [],
      city: body.city || null,
      author: body.author || 'Charles R. Nobre',
      seo_keywords: Array.isArray(body.seo_keywords) ? body.seo_keywords : [],
      reading_minutes: estimateReadingMinutes(contentMd),
      published: !!body.published,
      published_at: body.published ? (body.published_at || new Date().toISOString()) : null,
    };

    const { data, error } = await supabaseAdmin
      .from('blog_posts')
      .insert(row)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    await logActivity('blog_post_created', { id: data.id, slug: data.slug, title: data.title });
    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error('API blog POST:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
