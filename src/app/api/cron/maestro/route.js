import { NextResponse } from 'next/server';
import { supabaseAdmin, hasServiceRole } from '@/lib/supabase-admin';

async function coletarEstado() {
  const estado = {
    leads_por_status: {},
    imoveis_ativos: 0,
    aprovacoes_pendentes: 0,
    fila_pendentes: 0,
    fila_executando: 0,
    leads_sem_score: 0,
    aprovacoes_antigas_horas: [],
  };

  const { data: leads } = await supabaseAdmin.from('leads').select('status, score_ia');
  for (const l of leads || []) {
    const s = l.status || 'sem_status';
    estado.leads_por_status[s] = (estado.leads_por_status[s] || 0) + 1;
    if (l.score_ia == null) estado.leads_sem_score++;
  }

  const { count: nImoveis } = await supabaseAdmin
    .from('properties')
    .select('*', { count: 'exact', head: true })
    .eq('ativo', true);
  estado.imoveis_ativos = nImoveis || 0;

  const { data: aprovs } = await supabaseAdmin
    .from('approvals')
    .select('id, created_at')
    .eq('status', 'pendente');
  estado.aprovacoes_pendentes = (aprovs || []).length;
  for (const a of aprovs || []) {
    if (!a.created_at) continue;
    const horas = (Date.now() - new Date(a.created_at).getTime()) / (1000 * 60 * 60);
    estado.aprovacoes_antigas_horas.push({ id: a.id, horas: Math.round(horas) });
  }

  const { count: nPend } = await supabaseAdmin
    .from('fila_tarefas')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'pendente');
  estado.fila_pendentes = nPend || 0;

  const { count: nExec } = await supabaseAdmin
    .from('fila_tarefas')
    .select('*', { count: 'exact', head: true })
    .eq('status', 'executando');
  estado.fila_executando = nExec || 0;

  return estado;
}

async function pensarComGemini(estado) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return null;
  const modelo = process.env.GEMINI_MODEL || 'gemini-2.0-flash-exp';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelo}:generateContent?key=${key}`;

  const prompt = `Você é o Maestro, IA orquestradora do sistema do Charles. Com base no estado abaixo, decida no máximo 3 ações concretas. Retorne JSON estrito: [{agente, tipo, payload, motivo}]. ESTADO: ${JSON.stringify(estado)}`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.4, responseMimeType: 'application/json' },
      }),
    });
    if (!res.ok) {
      console.error('Gemini status', res.status, await res.text());
      return null;
    }
    const json = await res.json();
    const texto = json?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!texto) return null;
    const match = texto.match(/\[[\s\S]*\]/);
    if (!match) return null;
    const arr = JSON.parse(match[0]);
    if (!Array.isArray(arr)) return null;
    return arr.slice(0, 3);
  } catch (e) {
    console.error('Erro chamando Gemini:', e);
    return null;
  }
}

function fallbackHeuristico(estado) {
  const decisoes = [];

  if (estado.leads_sem_score > 0) {
    decisoes.push({
      agente: 'sdr',
      tipo: 'qualificar_leads',
      payload: { quantidade: estado.leads_sem_score },
      motivo: `${estado.leads_sem_score} lead(s) sem score_ia`,
    });
  }

  const aprovsAntigas = (estado.aprovacoes_antigas_horas || []).filter((a) => a.horas > 48);
  if (aprovsAntigas.length > 0) {
    decisoes.push({
      agente: 'maestro',
      tipo: 'expirar_aprovacoes',
      payload: { ids: aprovsAntigas.map((a) => a.id) },
      motivo: `${aprovsAntigas.length} aprovação(ões) com mais de 48h`,
    });
  }

  if (estado.fila_pendentes === 0 && estado.imoveis_ativos > 0) {
    decisoes.push({
      agente: 'designer',
      tipo: 'gerar_criativos',
      payload: { limite: 5 },
      motivo: 'Fila vazia — pré-produzir criativos',
    });
  }

  return decisoes.slice(0, 3);
}

export async function POST(req) {
  try {
    const token = req.headers.get('x-cron-token');
    if (!token || token !== process.env.CRON_SECRET) {
      return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 });
    }
    if (!hasServiceRole) {
      return NextResponse.json({ erro: 'SUPABASE_SERVICE_ROLE_KEY ausente' }, { status: 503 });
    }

    const estado = await coletarEstado();

    let decisoes = await pensarComGemini(estado);
    let fonte = 'gemini';
    if (!decisoes || decisoes.length === 0) {
      decisoes = fallbackHeuristico(estado);
      fonte = 'heuristico';
    }

    let tarefasCriadas = 0;
    for (const d of decisoes) {
      if (!d || !d.agente || !d.tipo) continue;
      const { error } = await supabaseAdmin.from('fila_tarefas').insert({
        agente_destino: d.agente,
        tipo: d.tipo,
        payload: d.payload || {},
        prioridade: 5,
      });
      if (error) {
        console.error('Erro inserindo tarefa do Maestro:', error);
        continue;
      }
      tarefasCriadas++;
    }

    const resumo = `Maestro (${fonte}): ${decisoes.length} decisão(ões), ${tarefasCriadas} tarefa(s) criada(s). Leads pendentes=${estado.fila_pendentes}, aprovações=${estado.aprovacoes_pendentes}.`;

    await supabaseAdmin.from('maestro_ciclos').insert({
      decisoes_json: decisoes,
      tarefas_criadas: tarefasCriadas,
      resumo,
    });

    try {
      await supabaseAdmin
        .from('agentes')
        .update({ ultimo_heartbeat: new Date().toISOString() })
        .eq('nome', 'maestro');
    } catch (e) {
      console.error('Heartbeat maestro falhou (tabela agentes pode não existir):', e);
    }

    return NextResponse.json({ ok: true, decisoes: tarefasCriadas, fonte });
  } catch (e) {
    console.error('Erro no cron/maestro:', e);
    return NextResponse.json({ erro: e.message || String(e) }, { status: 500 });
  }
}
