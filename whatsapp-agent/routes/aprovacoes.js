// routes/aprovacoes.js — Charles Neural System
// Express Router para gerenciamento de aprovacoes humanas.
//
// Tabelas esperadas no Supabase:
//   aprovacoes(id, agente_destino, tipo, payload, descricao, status, motivo, created_at, updated_at)
//   fila_tarefas(id, agente_destino, tipo, payload, status, aprovacao_id, created_at)
//
// Todos os endpoints devolvem X-Pendentes com a contagem atual de aprovacoes
// com status='pendente'.

import { Router } from 'express';
import { supabase } from '../lib/supabase.js';
import { log } from '../lib/logger.js';

const router = Router();

// ---------------------------------------------------------------------------
// Helper: conta aprovacoes pendentes e injeta no header de resposta
// ---------------------------------------------------------------------------
async function injetarPendentes(res) {
  try {
    const { count } = await supabase
      .from('aprovacoes')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pendente');
    res.setHeader('X-Pendentes', count ?? 0);
  } catch (_err) {
    res.setHeader('X-Pendentes', -1);
  }
}

// ---------------------------------------------------------------------------
// GET /api/aprovacoes?status=pendente|aprovada|rejeitada|cancelada|todas
// ---------------------------------------------------------------------------
router.get('/', async (req, res) => {
  try {
    const statusFiltro = (req.query.status || 'pendente').toLowerCase();
    const statusValidos = ['pendente', 'aprovada', 'rejeitada', 'cancelada', 'todas'];
    if (!statusValidos.includes(statusFiltro)) {
      return res.status(400).json({ error: `status invalido. Use: ${statusValidos.join(', ')}` });
    }

    let q = supabase
      .from('aprovacoes')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);

    if (statusFiltro !== 'todas') {
      q = q.eq('status', statusFiltro);
    }

    const { data, error } = await q;
    if (error) throw error;

    await injetarPendentes(res);
    res.json({ ok: true, status: statusFiltro, count: (data || []).length, aprovacoes: data || [] });
  } catch (err) {
    log.error('aprovacoes.list falhou', { err: err.message });
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// GET /api/aprovacoes/:id
// ---------------------------------------------------------------------------
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('aprovacoes')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Aprovacao nao encontrada' });

    await injetarPendentes(res);
    res.json({ ok: true, aprovacao: data });
  } catch (err) {
    if (err.code === 'PGRST116') {
      return res.status(404).json({ error: 'Aprovacao nao encontrada' });
    }
    log.error('aprovacoes.get falhou', { err: err.message });
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/aprovacoes — cria nova aprovacao
// Body: { agente_destino, tipo, payload?, descricao? }
// ---------------------------------------------------------------------------
router.post('/', async (req, res) => {
  try {
    const { agente_destino, tipo, payload, descricao } = req.body || {};

    if (!agente_destino) return res.status(400).json({ error: 'agente_destino e obrigatorio' });
    if (!tipo) return res.status(400).json({ error: 'tipo e obrigatorio' });

    const row = {
      agente_destino,
      tipo,
      payload: payload ?? null,
      descricao: descricao ?? null,
      status: 'pendente',
      motivo: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('aprovacoes')
      .insert(row)
      .select()
      .single();

    if (error) throw error;

    log.info('Aprovacao criada', { id: data.id, agente_destino, tipo });
    await injetarPendentes(res);
    res.status(201).json({ ok: true, aprovacao: data });
  } catch (err) {
    log.error('aprovacoes.create falhou', { err: err.message });
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/aprovacoes/:id/aprovar
// Muda status para 'aprovada' e insere tarefa na fila_tarefas com o payload.
// ---------------------------------------------------------------------------
router.post('/:id/aprovar', async (req, res) => {
  try {
    const { id } = req.params;

    // Busca aprovacao atual
    const { data: aprov, error: e1 } = await supabase
      .from('aprovacoes')
      .select('*')
      .eq('id', id)
      .single();

    if (e1 || !aprov) return res.status(404).json({ error: 'Aprovacao nao encontrada' });
    if (aprov.status !== 'pendente') {
      return res.status(409).json({
        error: `Aprovacao ja esta com status '${aprov.status}', nao pode ser aprovada`,
        aprovacao: aprov,
      });
    }

    const agora = new Date().toISOString();

    // Atualiza status da aprovacao
    const { data: aprovAtualizada, error: e2 } = await supabase
      .from('aprovacoes')
      .update({ status: 'aprovada', updated_at: agora })
      .eq('id', id)
      .select()
      .single();

    if (e2) throw e2;

    // Enfileira tarefa na fila_tarefas
    const tarefaRow = {
      agente_destino: aprov.agente_destino,
      tipo: aprov.tipo,
      payload: aprov.payload ?? null,
      status: 'pendente',
      aprovacao_id: id,
      created_at: agora,
    };

    const { data: tarefa, error: e3 } = await supabase
      .from('fila_tarefas')
      .insert(tarefaRow)
      .select()
      .single();

    if (e3) throw e3;

    log.info('Aprovacao aprovada e tarefa enfileirada', { aprovacaoId: id, tarefaId: tarefa.id });
    await injetarPendentes(res);
    res.json({ ok: true, aprovacao: aprovAtualizada, tarefa });
  } catch (err) {
    log.error('aprovacoes.aprovar falhou', { id: req.params.id, err: err.message });
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/aprovacoes/:id/rejeitar
// Body: { motivo? }
// ---------------------------------------------------------------------------
router.post('/:id/rejeitar', async (req, res) => {
  try {
    const { id } = req.params;
    const motivo = req.body?.motivo ?? null;

    const { data: aprov, error: e1 } = await supabase
      .from('aprovacoes')
      .select('*')
      .eq('id', id)
      .single();

    if (e1 || !aprov) return res.status(404).json({ error: 'Aprovacao nao encontrada' });
    if (aprov.status !== 'pendente') {
      return res.status(409).json({
        error: `Aprovacao ja esta com status '${aprov.status}', nao pode ser rejeitada`,
        aprovacao: aprov,
      });
    }

    // Salva motivo dentro do payload (merge) e atualiza status
    const payloadAtualizado = {
      ...(aprov.payload && typeof aprov.payload === 'object' ? aprov.payload : {}),
      ...(motivo ? { rejeicao_motivo: motivo } : {}),
    };

    const { data: aprovAtualizada, error: e2 } = await supabase
      .from('aprovacoes')
      .update({
        status: 'rejeitada',
        motivo,
        payload: payloadAtualizado,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single();

    if (e2) throw e2;

    log.info('Aprovacao rejeitada', { id, motivo });
    await injetarPendentes(res);
    res.json({ ok: true, aprovacao: aprovAtualizada });
  } catch (err) {
    log.error('aprovacoes.rejeitar falhou', { id: req.params.id, err: err.message });
    res.status(500).json({ error: err.message });
  }
});

// ---------------------------------------------------------------------------
// POST /api/aprovacoes/:id/cancelar
// ---------------------------------------------------------------------------
router.post('/:id/cancelar', async (req, res) => {
  try {
    const { id } = req.params;

    const { data: aprov, error: e1 } = await supabase
      .from('aprovacoes')
      .select('id, status')
      .eq('id', id)
      .single();

    if (e1 || !aprov) return res.status(404).json({ error: 'Aprovacao nao encontrada' });
    if (aprov.status === 'cancelada') {
      return res.status(409).json({ error: 'Aprovacao ja esta cancelada', aprovacao: aprov });
    }
    if (aprov.status !== 'pendente') {
      return res.status(409).json({
        error: `Aprovacao com status '${aprov.status}' nao pode ser cancelada`,
        aprovacao: aprov,
      });
    }

    const { data: aprovAtualizada, error: e2 } = await supabase
      .from('aprovacoes')
      .update({ status: 'cancelada', updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (e2) throw e2;

    log.info('Aprovacao cancelada', { id });
    await injetarPendentes(res);
    res.json({ ok: true, aprovacao: aprovAtualizada });
  } catch (err) {
    log.error('aprovacoes.cancelar falhou', { id: req.params.id, err: err.message });
    res.status(500).json({ error: err.message });
  }
});

export default router;
