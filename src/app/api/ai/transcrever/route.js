import { NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/admin-auth';

export async function POST(request) {
  try {
    const auth = await isAuthenticated(request);
    if (!auth) {
      return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 });
    }

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json({ erro: 'GROQ_API_KEY não configurada' }, { status: 500 });
    }

    const formData = await request.formData();
    const audio = formData.get('audio');
    if (!audio || typeof audio === 'string') {
      return NextResponse.json({ erro: 'Áudio não recebido' }, { status: 400 });
    }

    const modelo = process.env.GROQ_WHISPER_MODEL || 'whisper-large-v3-turbo';

    // Reempacota o blob num FormData novo pra enviar pra Groq
    const upstream = new FormData();
    // audio é um File/Blob — repassa direto
    const filename = audio.name || 'audio.webm';
    upstream.append('file', audio, filename);
    upstream.append('model', modelo);
    upstream.append('response_format', 'json');
    upstream.append('language', 'pt');

    const r = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: upstream,
    });

    if (!r.ok) {
      const txt = await r.text();
      return NextResponse.json({ erro: `Groq Whisper ${r.status}: ${txt.slice(0, 300)}` }, { status: 500 });
    }

    const data = await r.json();
    const texto = (data?.text || '').trim();

    return NextResponse.json({ texto });
  } catch (err) {
    console.error('[ai/transcrever POST]', err);
    return NextResponse.json({ erro: err.message }, { status: 500 });
  }
}
