// GET /api/voz/status
// Retorna o estado da integração ElevenLabs (TTS).
// Quando ELEVENLABS_API_KEY não estiver setada, ativo=false e a UI
// deve degradar pra modo "aguardando configuração".

export const dynamic = 'force-dynamic';

export async function GET() {
  const ativo = !!process.env.ELEVENLABS_API_KEY;
  const voice_id = process.env.ELEVENLABS_VOICE_ID || null;
  const modelo = process.env.ELEVENLABS_MODEL || 'eleven_multilingual_v2';

  return Response.json({ ativo, voice_id, modelo });
}
