import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase-admin';
import { isAuthenticated } from '@/lib/admin-auth';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const historico = searchParams.get('historico') === 'true';

    const db = supabaseAdmin;
    let query = db
      .from('briefings')
      .select('*')
      .order('gerado_em', { ascending: false });

    if (historico) {
      query = query.limit(10);
    } else {
      query = query.limit(1);
    }

    const { data, error } = await query;

    if (error) throw error;

    const result = historico ? data : (data?.[0] ?? null);
    return NextResponse.json(result);
  } catch (err) {
    console.error('[briefing GET]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const auth = await isAuthenticated(request);
    if (!auth) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const db = supabaseAdmin;

    // Coleta métricas
    const now = new Date();
    const iniDia = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const fim24h = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();

    const [
      { count: leadsCount },
      { count: eventosHoje },
      { count: imoveisAtivos },
      { count: aprovacoesPendentes },
    ] = await Promise.all([
      db.from('leads').select('*', { count: 'exact', head: true }).gte('criado_em', fim24h),
      db.from('events').select('*', { count: 'exact', head: true }).gte('start_time', iniDia).lt('start_time', new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString()),
      db.from('properties').select('*', { count: 'exact', head: true }).eq('ativo', true),
      db.from('approvals').select('*', { count: 'exact', head: true }).eq('status', 'pendente'),
    ]);

    const metricas = {
      leads_24h: leadsCount ?? 0,
      eventos_hoje: eventosHoje ?? 0,
      imoveis_ativos: imoveisAtivos ?? 0,
      aprovacoes_pendentes: aprovacoesPendentes ?? 0,
    };

    const prompt = `Você é assistente do corretor Charles R. Nobre (CRECI 37177, Imbituba SC). Gere briefing matinal com: resumo do dia, 3 destaques, 3 ações prioritárias. Métricas: ${JSON.stringify(metricas)}`;

    const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!groqResponse.ok) {
      const groqErr = await groqResponse.text();
      throw new Error(`Groq error: ${groqErr}`);
    }

    const groqData = await groqResponse.json();
    const conteudo = groqData.choices?.[0]?.message?.content ?? '';

    const { data, error } = await db
      .from('briefings')
      .insert({ conteudo, metricas, gerado_em: new Date().toISOString() })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data, { status: 201 });
  } catch (err) {
    console.error('[briefing POST]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
