import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const DATA_PATH = path.join(process.cwd(), 'src/data/listings.json');

export async function GET() {
  try {
    const fileContents = fs.readFileSync(DATA_PATH, 'utf8');
    const data = JSON.parse(fileContents);
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Falha ao ler banco de dados local' }, { status: 500 });
  }
}

export async function POST(request) {
  // Garantir que isso só rode localmente ou via admin autorizado
  if (process.env.NODE_ENV !== 'development') {
    // Em produção (Vercel), arquivos são somente leitura.
    // O ideal seria integrar com GitHub API, mas aqui seguiremos a solução local.
    return NextResponse.json({ error: 'A gravação direta só é permitida em ambiente de desenvolvimento local.' }, { status: 403 });
  }

  try {
    const newData = await request.json();
    fs.writeFileSync(DATA_PATH, JSON.stringify(newData, null, 2), 'utf8');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Save Error:', error);
    return NextResponse.json({ error: 'Falha ao gravar no arquivo local' }, { status: 500 });
  }
}
