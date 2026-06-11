import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAuthenticated } from '@/lib/admin-auth';
import { findMatchingSkill, stripTrigger } from '@/lib/skill-matcher';

export async function POST(request) {
  const t0 = Date.now();
  try {
    const auth = await isAuthenticated(request);
    if (!auth) {
      return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { messages = [], mode = 'chat' } = body || {};

    if (!Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ erro: 'messages é obrigatório' }, { status: 400 });
    }

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json({ erro: 'GROQ_API_KEY não configurada' }, { status: 500 });
    }

    const db = supabaseAdmin;

    // Interceptor de skills: checa se a última mensagem dispara alguma skill ativa
    const lastUserMsg = [...messages].reverse().find((m) => m?.role === 'user');
    const userText = lastUserMsg?.content || '';

    if (userText) {
      try {
        const { data: skills } = await db
          .from('skills')
          .select('*')
          .eq('ativo', true);

        const match = findMatchingSkill(userText, skills || []);
        if (match) {
          const { skill, trigger } = match;
          const tSkill = Date.now();
          const input = stripTrigger(userText, trigger);
          const prompt = String(skill.prompt_template || '').replace('{{input}}', input);
          const modeloSkill = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

          try {
            const skillResp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
              },
              body: JSON.stringify({
                model: modeloSkill,
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.7,
              }),
            });

            if (!skillResp.ok) {
              const txt = await skillResp.text();
              throw new Error(`Groq ${skillResp.status}: ${txt.slice(0, 300)}`);
            }

            const skillData = await skillResp.json();
            const skillOutput = skillData?.choices?.[0]?.message?.content?.trim() || '';
            const resposta = `**🛠️ Skill: ${skill.titulo}**\n\n${skillOutput}`;
            const ms = Date.now() - tSkill;

            try {
              await db.from('skill_execucoes').insert({
                skill_id: skill.id,
                input: userText,
                output: skillOutput,
                ms,
                sucesso: true,
                executado_em: new Date().toISOString(),
              });
            } catch (logErr) {
              console.warn('[ai/chat] skill_execucoes log falhou:', logErr.message);
            }

            return NextResponse.json({
              resposta,
              modelo: modeloSkill,
              skill: skill.slug,
              ms: Date.now() - t0,
            });
          } catch (skillErr) {
            console.error('[ai/chat] skill falhou, caindo no fluxo normal:', skillErr);
            try {
              await db.from('skill_execucoes').insert({
                skill_id: skill.id,
                input: userText,
                output: String(skillErr.message || skillErr),
                ms: Date.now() - tSkill,
                sucesso: false,
                executado_em: new Date().toISOString(),
              });
            } catch {}
          }
        }
      } catch (e) {
        console.warn('[ai/chat] falha ao checar skills:', e.message);
      }
    }

    // Carrega DNA / treinamento ativo
    let contexto = '';
    try {
      const { data: trein } = await db
        .from('treinamento')
        .select('categoria,titulo,conteudo')
        .eq('ativo', true);
      if (Array.isArray(trein) && trein.length) {
        contexto = trein
          .map((t) => `## ${String(t.categoria || 'geral').toUpperCase()} — ${t.titulo}\n${t.conteudo}`)
          .join('\n\n');
      }
    } catch (e) {
      console.warn('[ai/chat] falha ao carregar treinamento:', e.message);
    }

    // Estado do negócio
    const now = new Date();
    const iniDia = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const fimDia = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString();

    let imoveisCount = 0;
    let leadsCount = 0;
    let eventosHojeCount = 0;
    let porCidade = {};
    try {
      const [imRes, ldRes, evRes, imAll] = await Promise.all([
        db.from('properties').select('*', { count: 'exact', head: true }).eq('ativo', true),
        db.from('leads').select('*', { count: 'exact', head: true }),
        db.from('events').select('*', { count: 'exact', head: true }).gte('start_time', iniDia).lt('start_time', fimDia),
        db.from('properties').select('city').eq('ativo', true),
      ]);
      imoveisCount = imRes.count ?? 0;
      leadsCount = ldRes.count ?? 0;
      eventosHojeCount = evRes.count ?? 0;
      if (Array.isArray(imAll.data)) {
        porCidade = imAll.data.reduce((acc, r) => {
          const c = r.city || 'Outro';
          acc[c] = (acc[c] || 0) + 1;
          return acc;
        }, {});
      }
    } catch (e) {
      console.warn('[ai/chat] falha ao carregar estatísticas:', e.message);
    }

    const porCidadeTxt = Object.entries(porCidade)
      .map(([c, n]) => `${c}: ${n}`)
      .join(', ') || '—';

    const systemPrompt = `Você é o Jarvis, assistente pessoal do corretor Charles R. Nobre (CRECI 37177, Imbituba/Garopaba/Imaruí SC).

Você responde em duas pessoas dependendo do modo:
- MODO CHAT (default): responde direto pro Charles como assistente pessoal — informações, análises, sugestões. Tom profissional, claro, conciso.
- MODO GERAR: gera texto pra cliente externo (lead, anúncio, mensagem). Aí você OBRIGATORIAMENTE segue o DNA do Charles abaixo.

MODO ATUAL: ${mode === 'gerar' ? 'GERAR' : 'CHAT'}

=== DNA CHARLES (use SOMENTE em modo gerar) ===
${contexto || '(nenhum treinamento cadastrado ainda)'}

=== ESTADO ATUAL DO NEGÓCIO ===
- Imóveis ativos: ${imoveisCount}
- Distribuição por cidade: ${porCidadeTxt}
- Leads no pipeline: ${leadsCount}
- Eventos hoje: ${eventosHojeCount}

Quando o Charles pedir pra você gerar mensagem pra lead, descrição de imóvel, copy de anúncio etc, você muda pro tom dele (DNA acima). Caso contrário responde como Jarvis falando com o Charles.`;

    const modelo = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

    const groqMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.map((m) => ({ role: m.role, content: m.content })),
    ];

    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: modelo,
        messages: groqMessages,
        temperature: 0.7,
      }),
    });

    if (!groqResponse.ok) {
      const txt = await groqResponse.text();
      throw new Error(`Groq ${groqResponse.status}: ${txt.slice(0, 300)}`);
    }

    const data = await groqResponse.json();
    const resposta = data?.choices?.[0]?.message?.content?.trim() || '';

    return NextResponse.json({
      resposta,
      modelo,
      ms: Date.now() - t0,
    });
  } catch (err) {
    console.error('[ai/chat POST]', err);
    return NextResponse.json({ erro: err.message }, { status: 500 });
  }
}
