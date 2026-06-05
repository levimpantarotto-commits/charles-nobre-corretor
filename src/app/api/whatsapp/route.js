import { NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/admin-auth';

const INSTANCE = 'charles-nobre';

function evolutionHeaders() {
  return {
    'Content-Type': 'application/json',
    apikey: process.env.EVOLUTION_API_KEY,
  };
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const acao = searchParams.get('acao');
    const phone = searchParams.get('phone');

    // GET /api/whatsapp?acao=status
    if (acao === 'status' || !acao) {
      const res = await fetch(
        `${process.env.EVOLUTION_API_URL}/instance/fetchInstances`,
        { headers: evolutionHeaders() }
      );

      if (!res.ok) throw new Error(`Evolution error: ${res.status}`);

      const instancias = await res.json();
      const instancia = Array.isArray(instancias)
        ? instancias.find((i) => i.instance?.instanceName === INSTANCE || i.name === INSTANCE)
        : instancias;

      return NextResponse.json(instancia ?? null);
    }

    // GET /api/whatsapp?acao=conversas&phone=5548999999999
    if (acao === 'conversas') {
      if (!phone) {
        return NextResponse.json({ error: 'Parâmetro phone obrigatório' }, { status: 400 });
      }

      const res = await fetch(
        `${process.env.EVOLUTION_API_URL}/chat/findMessages/${INSTANCE}`,
        {
          method: 'POST',
          headers: evolutionHeaders(),
          body: JSON.stringify({
            where: { key: { remoteJid: `${phone}@s.whatsapp.net` } },
            limit: 50,
          }),
        }
      );

      if (!res.ok) throw new Error(`Evolution error: ${res.status}`);

      const data = await res.json();
      return NextResponse.json(data);
    }

    return NextResponse.json({ error: 'Ação desconhecida' }, { status: 400 });
  } catch (err) {
    console.error('[whatsapp GET]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const auth = await isAuthenticated(request);
    if (!auth) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { phone, text } = await request.json();

    if (!phone || !text) {
      return NextResponse.json({ error: 'Campos obrigatórios: phone, text' }, { status: 400 });
    }

    const res = await fetch(
      `${process.env.EVOLUTION_API_URL}/message/sendText/${INSTANCE}`,
      {
        method: 'POST',
        headers: evolutionHeaders(),
        body: JSON.stringify({
          number: phone,
          text,
        }),
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Evolution error ${res.status}: ${errText}`);
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    console.error('[whatsapp POST]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
