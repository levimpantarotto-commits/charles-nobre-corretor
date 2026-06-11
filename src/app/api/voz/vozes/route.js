// GET /api/voz/vozes
// Lista vozes disponíveis na conta ElevenLabs.
// 503 quando a chave não está configurada (UI mostra aviso).

export const dynamic = 'force-dynamic';

const API_BASE = 'https://api.elevenlabs.io/v1';

export async function GET() {
  const key = process.env.ELEVENLABS_API_KEY;
  if (!key) {
    return Response.json(
      { erro: 'ElevenLabs não configurado' },
      { status: 503 }
    );
  }

  try {
    const r = await fetch(`${API_BASE}/voices`, {
      headers: { 'xi-api-key': key },
      cache: 'no-store',
    });
    if (!r.ok) {
      const txt = await r.text();
      return Response.json(
        { erro: `ElevenLabs ${r.status}`, detalhe: txt.slice(0, 200) },
        { status: 502 }
      );
    }
    const data = await r.json();
    const vozes = (data.voices || []).map((v) => ({
      id: v.voice_id,
      name: v.name,
      category: v.category,
      preview_url: v.preview_url,
    }));
    return Response.json({ total: vozes.length, vozes });
  } catch (err) {
    return Response.json(
      { erro: 'Falha ao listar vozes', detalhe: err.message },
      { status: 500 }
    );
  }
}
