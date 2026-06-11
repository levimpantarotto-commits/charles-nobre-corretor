// qualificar-lead.js — Qualificação automática de leads via Groq.
// Chamado em background quando lead chega pelo site (não bloqueia resposta).
import { supabaseAdmin, hasServiceRole } from '@/lib/supabase-admin';

export async function qualificarLeadEmBackground({ leadId, nome, telefone, email, interesse, mensagem }) {
  if (!leadId) return;
  if (!hasServiceRole) {
    console.warn('[qualificar-lead] sem service role, abortando');
    return;
  }
  if (!process.env.GROQ_API_KEY) {
    console.warn('[qualificar-lead] GROQ_API_KEY ausente');
    return;
  }

  const db = supabaseAdmin;

  let contexto = '';
  try {
    const { data: trein } = await db
      .from('treinamento')
      .select('categoria,titulo,conteudo')
      .eq('ativo', true)
      .in('categoria', ['dna_charles', 'regiao', 'argumentos']);
    if (Array.isArray(trein) && trein.length) {
      contexto = trein
        .map((t) => `## ${String(t.categoria || 'geral').toUpperCase()} — ${t.titulo}\n${t.conteudo}`)
        .join('\n\n');
    }
  } catch (e) {
    console.warn('[qualificar-lead] falha ao carregar treinamento:', e.message);
  }

  const prompt = `Você é o SDR do Charles R. Nobre, corretor em Imbituba/Garopaba/Imaruí. Analise o lead abaixo e retorne JSON estrito:
{ "score_ia": 0-100, "segmento": "investidor"|"morar"|"veranear"|"urgente"|"longo_prazo"|"indefinido", "tags_ia": [array de 2-5 tags], "cor": "verde"|"amarelo"|"vermelho"|"branco", "observacao": "frase curta sobre o lead" }
Score: 80+ se claro e qualificado, 50-79 morno, <50 frio. Cor verde=quente, amarelo=morno, vermelho=frio, branco=indeterminado.

${contexto ? `=== CONTEXTO DO CHARLES ===\n${contexto}\n\n` : ''}LEAD: nome=${nome} interesse=${interesse || '—'} telefone=${telefone || '—'} email=${email || '—'} mensagem=${mensagem || '—'}`;

  const modelo = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

  let qualificacao = null;
  try {
    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: modelo,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.3,
        response_format: { type: 'json_object' },
      }),
    });

    if (!groqResponse.ok) {
      const txt = await groqResponse.text();
      throw new Error(`Groq ${groqResponse.status}: ${txt.slice(0, 300)}`);
    }

    const data = await groqResponse.json();
    const conteudo = data?.choices?.[0]?.message?.content?.trim() || '{}';
    qualificacao = JSON.parse(conteudo);
  } catch (err) {
    console.error('[qualificar-lead] groq falhou:', err);
    try {
      await db.from('activity_log').insert({
        agent: 'sdr',
        level: 'erro',
        message: `Falha ao qualificar lead ${nome}: ${err.message}`,
        context: { lead_id: leadId },
      });
    } catch {}
    return;
  }

  const score = Number(qualificacao?.score_ia);
  const segmento = String(qualificacao?.segmento || 'indefinido');
  const tags = Array.isArray(qualificacao?.tags_ia) ? qualificacao.tags_ia : [];
  const cor = String(qualificacao?.cor || 'branco');
  const observacao = String(qualificacao?.observacao || '').trim();

  // Preserva mensagem original e anexa observação do SDR
  let notas = mensagem || '';
  if (observacao) notas = (notas ? notas + '\n\n' : '') + `[SDR] ${observacao}`;

  try {
    const { error: updErr } = await db
      .from('leads')
      .update({
        score_ia: Number.isFinite(score) ? score : null,
        segmento,
        tags_ia: tags,
        cor,
        notes: notas || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', leadId);

    if (updErr) throw updErr;

    await db.from('activity_log').insert({
      agent: 'sdr',
      level: 'sucesso',
      message: `Lead qualificado automaticamente: ${nome} → score ${Number.isFinite(score) ? score : '?'}`,
      context: { lead_id: leadId, segmento, cor, tags_ia: tags },
    });
  } catch (err) {
    console.error('[qualificar-lead] update falhou:', err);
  }
}
