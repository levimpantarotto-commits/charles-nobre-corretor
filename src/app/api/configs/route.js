import { NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/admin-auth';
import fs from 'fs';
import path from 'path';

const CONFIGS_PATH = path.join(process.cwd(), 'src/data/site_configs.json');

export async function GET() {
  try {
    const fileContents = fs.readFileSync(CONFIGS_PATH, 'utf8');
    const data = JSON.parse(fileContents);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Falha ao ler configurações' }, { status: 500 });
  }
}

export async function POST(request) {
  if (!(await isAuthenticated())) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }
  if (process.env.NODE_ENV !== 'development') {
    // site_configs.json é gravação no filesystem — não funciona em Vercel (FS efêmero).
    // TODO: migrar configs do site pra Supabase também.
    return NextResponse.json({ error: 'Edição de configs disponível apenas em desenvolvimento por enquanto' }, { status: 403 });
  }

  try {
    const newData = await request.json();
    fs.writeFileSync(CONFIGS_PATH, JSON.stringify(newData, null, 2), 'utf8');
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Falha ao gravar configurações' }, { status: 500 });
  }
}
