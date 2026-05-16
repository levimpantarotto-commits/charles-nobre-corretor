import { NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/admin-auth';
import { supabaseAdmin, hasServiceRole } from '@/lib/supabase-admin';

const BUCKET = 'properties';
const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED_MIME = /^image\/(jpe?g|png|webp|avif)$/i;

function slugify(text) {
  return (text || 'imovel')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 60) || 'imovel';
}

function extFromMime(mime) {
  if (/jpeg|jpg/.test(mime)) return 'jpg';
  if (/png/.test(mime)) return 'png';
  if (/webp/.test(mime)) return 'webp';
  if (/avif/.test(mime)) return 'avif';
  return 'jpg';
}

export async function POST(request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Nao autenticado' }, { status: 401 });
  }

  if (!hasServiceRole) {
    return NextResponse.json(
      { error: 'SUPABASE_SERVICE_ROLE_KEY ausente em .env.local' },
      { status: 503 }
    );
  }

  let form;
  try {
    form = await request.formData();
  } catch (err) {
    return NextResponse.json({ error: 'FormData invalido' }, { status: 400 });
  }

  const files = form.getAll('files').filter((f) => f && typeof f === 'object' && 'arrayBuffer' in f);
  if (files.length === 0) {
    return NextResponse.json({ error: 'Nenhum arquivo enviado (campo files)' }, { status: 400 });
  }

  const folderHint = form.get('folder');
  const folder = slugify(folderHint);
  const timestamp = Date.now();

  const uploaded = [];
  const erros = [];

  for (let i = 0; i < files.length; i++) {
    const file = files[i];

    if (!ALLOWED_MIME.test(file.type)) {
      erros.push({ name: file.name, error: `Mime nao permitido: ${file.type}` });
      continue;
    }
    if (file.size > MAX_BYTES) {
      erros.push({ name: file.name, error: `Arquivo > 10MB (${(file.size / 1024 / 1024).toFixed(1)}MB)` });
      continue;
    }

    const ext = extFromMime(file.type);
    const safeName = slugify(file.name.replace(/\.[^.]+$/, ''));
    const objectPath = `${folder}/${timestamp}-${String(i + 1).padStart(2, '0')}-${safeName}.${ext}`;

    const buf = Buffer.from(await file.arrayBuffer());

    const { error } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(objectPath, buf, { contentType: file.type, upsert: false });

    if (error) {
      erros.push({ name: file.name, error: error.message });
      continue;
    }

    const { data: pub } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(objectPath);
    uploaded.push(pub.publicUrl);
  }

  return NextResponse.json({
    success: uploaded.length > 0,
    uploaded,
    erros,
    total: files.length,
  });
}
