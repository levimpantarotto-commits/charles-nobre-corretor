import { NextResponse } from 'next/server';
import { supabaseAdmin, hasServiceRole } from '@/lib/supabase-admin';

// Intervalos da cadência por passo (em horas) -> próximo passo
// passo 0 -> envia inicial e agenda passo 1 daqui 24h
// passo 1 -> envia, agenda passo 2 daqui 48h
// passo 2 -> envia, agenda passo 3 daqui 5 dias
// passo 3 -> envia, agenda passo 4 daqui 15 dias
// passo 4 -> envia, agenda passo 5 daqui 30 dias
// passo 5 -> envia, agenda passo 6 (arquiva como frio)
const PROXIMO_INTERVALO_HORAS = {
  0: 24,
  1: 48,
  2: 24 * 5,
  3: 24 * 15,
  4: 24 * 30,
  5: 24 * 30,
};

export async function POST(req) {
  try {
    const token = req.headers.get('x-cron-token');
    if (!token || token !== process.env.CRON_SECRET) {
      return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 });
    }
    if (!hasServiceRole) {
      return NextResponse.json({ erro: 'SUPABASE_SERVICE_ROLE_KEY ausente' }, { status: 503 });
    }

    const agora = new Date().toISOString();

    const { data: leads, error: errLeads } = await supabaseAdmin
      .from('leads')
      .select('*')
      .not('status', 'in', '("convertido","perdido")');

    if (errLeads) {
      console.error('Erro buscando leads:', errLeads);
      return NextResponse.json({ erro: errLeads.message }, { status: 500 });
    }

    const elegiveis = (leads || []).filter((lead) => {
      const meta = lead.meta_cadencia || {};
      if (meta.pausado) return false;
      if (!meta || Object.keys(meta).length === 0) return true;
      if (!meta.proximo_em) return true;
      return new Date(meta.proximo_em).getTime() <= Date.now();
    });

    let processados = 0;
    let novas_tarefas = 0;

    for (const lead of elegiveis) {
      const metaAtual = lead.meta_cadencia || {};
      const passoAtual = typeof metaAtual.passo === 'number' ? metaAtual.passo : 0;

      if (passoAtual >= 6) continue;

      const proximoPasso = passoAtual + 1;
      let novoStatus = lead.status;

      const proximoIntervalo = PROXIMO_INTERVALO_HORAS[passoAtual];
      const proximo_em = proximoIntervalo
        ? new Date(Date.now() + proximoIntervalo * 60 * 60 * 1000).toISOString()
        : null;

      const novaMeta = {
        ...metaAtual,
        passo: proximoPasso,
        ultimo_em: agora,
        proximo_em,
        total_enviados: (metaAtual.total_enviados || 0) + 1,
      };

      // Passo 6: arquiva como frio
      if (proximoPasso >= 6) {
        novoStatus = 'frio';
        novaMeta.proximo_em = null;
      }

      const update = { meta_cadencia: novaMeta };
      if (novoStatus !== lead.status) update.status = novoStatus;

      const { error: errUpd } = await supabaseAdmin
        .from('leads')
        .update(update)
        .eq('id', lead.id);

      if (errUpd) {
        console.error('Erro atualizando lead', lead.id, errUpd);
        continue;
      }
      processados++;

      // Só enfileira follow-up se não passou pro arquivamento
      if (proximoPasso < 6) {
        const { error: errFila } = await supabaseAdmin
          .from('fila_tarefas')
          .insert({
            agente_destino: 'sdr',
            tipo: 'follow_up',
            payload: {
              lead_id: lead.id,
              passo: proximoPasso,
              nome: lead.name || lead.nome || null,
              telefone: lead.phone || lead.telefone || null,
            },
            prioridade: 4,
          });

        if (errFila) {
          console.error('Erro enfileirando tarefa para lead', lead.id, errFila);
          continue;
        }
        novas_tarefas++;
      }
    }

    return NextResponse.json({ ok: true, processados, novas_tarefas });
  } catch (e) {
    console.error('Erro no cron/cadencia:', e);
    return NextResponse.json({ erro: e.message || String(e) }, { status: 500 });
  }
}
