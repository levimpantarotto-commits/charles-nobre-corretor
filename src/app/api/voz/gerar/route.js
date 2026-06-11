// POST /api/voz/gerar
// Body: { texto, voice_id?, model_id? }
// Gera áudio MP3 via ElevenLabs TTS e devolve o stream (audio/mpeg).
// Quando WhatsApp Agentic estiver no ar, plug essa rota no fluxo de resposta em áudio.

export const dynamic = 'force-dynamic';

const API_BASE = 'https://api.elevenlabs.io/v1';
const DEFAULT_MODEL = 'eleven_multilingual_v2';

export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json({ erro: 'JSON inválido' }, { status: 400 });
  }

  const { texto, voice_id, model_id } = body || {};

  if (!texto || typeof texto !== 'string') {
    return Response.json(
      { erro: 'texto é obrigatório' },
      { status: 400 }
    );
  }
  if (texto.length > 2000) {
    return Response.json(
      { erro: 'texto excede 2000 caracteres' },
      { status: 400 }
    );
  }

  const key = process.env.ELEVENLABS_API_KEY;
  const defaultVoice = process.env.ELEVENLABS_VOICE_ID || null;
  const voiceId = voice_id || defaultVoice;

  if (!key || !voiceId) {
    return Response.json(
      {
        erro: 'ElevenLabs não configurado. Configure ELEVENLABS_API_KEY e ELEVENLABS_VOICE_ID nas env vars do Coolify',
      },
      { status: 503 }
    );
  }

  const modelId = model_id || process.env.ELEVENLABS_MODEL || DEFAULT_MODEL;

  try {
    const r = await fetch(`${API_BASE}/text-to-speech/${voiceId}`, {
      method: 'POST',
      headers: {
        'xi-api-key': key,
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
      },
      body: JSON.stringify({
        text: texto,
        model_id: modelId,
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
        },
      }),
    });

    if (!r.ok) {
      const txt = await r.text();
      return Response.json(
        { erro: `ElevenLabs ${r.status}`, detalhe: txt.slice(0, 300) },
        { status: 502 }
      );
    }

    // Stream do áudio direto pro cliente
    return new Response(r.body, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    return Response.json(
      { erro: 'Falha ao gerar áudio', detalhe: err.message },
      { status: 500 }
    );
  }
}
