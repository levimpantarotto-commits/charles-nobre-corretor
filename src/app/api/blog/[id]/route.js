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

export async function GET(_request, { params }) {
  const { id } = await params;
  if (!id) return NextResponse.json({ error: 'id requerido' }, { status: 400 });
  const authed = await isAuthenticated();
  const client = authed ? supabaseAdmin() : supabase;
  const table = authed ? 'blog_posts' : 'blog_posts_public';
  const { data, error } = await client.from(table).select('*').eq('id', id).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 404 });
  return NextResponse.json(data);
}

export async function PUT(request, { params }) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }
  if (!hasServiceRole) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY ausente' }, { status: 503 });
  }
  const { id } = await params;
  try {
    const body = await request.json();
    const patch = {};
    if (body.title !== undefined) patch.title = String(body.title).trim();
    if (body.slug !== undefined) patch.slug = slugify(body.slug);
    if (body.excerpt !== undefined) patch.excerpt = body.excerpt || null;
    if (body.content_md !== undefined) {
      patch.content_md = String(body.content_md);
      patch.reading_minutes = estimateReadingMinutes(patch.content_md);
    }
    if (body.cover_image !== undefined) patch.cover_image = body.cover_image || null;
    if (body.tags !== undefined) patch.tags = Array.isArray(body.tags) ? body.tags : [];
    if (body.city !== undefined) patch.city = body.city || null;
    if (body.author !== undefined) patch.author = body.author || 'Charles R. Nobre';
    if (body.seo_keywords !== undefined) patch.seo_keywords = Array.isArray(body.seo_keywords) ? body.seo_keywords : [];
    if (body.published !== undefined) {
      patch.published = !!body.published;
      if (patch.published && !body.published_at) {
        patch.published_at = new Date().toISOString();
      } else if (body.published_at !== undefined) {
        patch.published_at = body.published_at;
      }
    }

    const { data, error } = await supabaseAdmin()
      .from('blog_posts')
      .update(patch)
      .eq('id', id)
      .select()
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    await logActivity('blog_post_updated', { id, slug: data.slug, title: data.title });
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(_request, { params }) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }
  if (!hasServiceRole) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY ausente' }, { status: 503 });
  }
  const { id } = await params;
  const { error } = await supabaseAdmin().from('blog_posts').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  await logActivity('blog_post_deleted', { id });
  return NextResponse.json({ ok: true });
}
