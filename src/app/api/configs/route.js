import { NextResponse } from 'next/server';
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
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Acesso negado fora do ambiente local' }, { status: 403 });
  }

  try {
    const newData = await request.json();
    fs.writeFileSync(CONFIGS_PATH, JSON.stringify(newData, null, 2), 'utf8');
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Falha ao gravar configurações' }, { status: 500 });
  }
}
