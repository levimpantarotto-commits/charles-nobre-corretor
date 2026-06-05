// routes/skills.js — Catálogo de skills (prompt templates) do Charles Neural System.
// Express Router com ES modules — compatível com o restante do whatsapp-agent.
import { Router } from 'express';
import { supabase } from '../lib/supabase.js';
import { chat } from '../lib/groq.js';
import { log } from '../lib/logger.js';

const router = Router();

// ──────────────────────────────────────────────
// SEED: skills padrão para imobiliária
// ──────────────────────────────────────────────
const SEED_SKILLS = [
  {
    slug: 'apresentar-imovel',
    titulo: 'Apresentar Imóvel',
    descricao: 'Apresenta um imóvel de forma personalizada ao interesse do lead.',
    prompt_template:
      'Você é o Charles Nobre, corretor especialista no litoral catarinense. ' +
      'Apresente o imóvel a seguir para um lead interessado em {interesse}. ' +
      'Seja objetivo, destaque os pontos mais relevantes para o perfil do cliente e finalize com uma chamada para ação convidando a conhecer pessoalmente. ' +
      'Imóvel: {input}',
    matchers: ['apresentar imóvel', 'mostrar imóvel', 'detalhes do imóvel', 'me fale sobre'],
  },
  {
    slug: 'responder-objecao',
    titulo: 'Responder Objeção',
    descricao: 'Responde objeções do lead de forma profissional e persuasiva.',
    prompt_template:
      'Você é o Charles Nobre, corretor experiente. ' +
      'O lead disse: {input}. ' +
      'Responda a objeção de forma profissional, empática e persuasiva, sem pressionar. ' +
      'Use argumentos concretos e, se possível, redirecione a conversa para as vantagens do imóvel ou uma próxima etapa.',
    matchers: ['não tenho interesse', 'está caro', 'vou pensar', 'não é o momento', 'objeção'],
  },
  {
    slug: 'follow-up',
    titulo: 'Follow-up de Lead',
    descricao: 'Gera mensagem de reativação para lead que não respondeu.',
    prompt_template:
      'Você é o Charles Nobre. ' +
      'Gere uma mensagem de follow-up para o lead {nome} que não respondeu em {dias} dias. ' +
      'A mensagem deve ser curta (no máximo 3 linhas), cordial e gerar curiosidade para retomar a conversa. ' +
      'Contexto adicional: {input}',
    matchers: ['follow-up', 'reativar lead', 'lead parado', 'não respondeu'],
  },
  {
    slug: 'descricao-imovel',
    titulo: 'Descrição de Imóvel',
    descricao: 'Cria descrição atraente para anúncio ou apresentação de imóvel.',
    prompt_template:
      'Você é especialista em marketing imobiliário. ' +
      'Crie uma descrição atraente para o imóvel: {input}. ' +
      'A descrição deve ter título chamativo, bullet points com diferenciais e finalizar com chamada emocional. ' +
      'Tom: sofisticado mas acessível.',
    matchers: ['descrição', 'anúncio', 'texto para imóvel', 'criar descrição'],
  },
];

// ──────────────────────────────────────────────
// BOOTSTRAP: garante tabelas e seed inicial
// ──────────────────────────────────────────────

async function bootstrapSkills() {
  // Cria tabela skills se não existir
  const { error: errSkills } = await supabase.rpc('exec_sql', {
    sql: `
      CREATE TABLE IF NOT EXISTS skills (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        slug text NOT NULL UNIQUE,
        titulo text NOT NULL,
        descricao text,
        prompt_template text NOT NULL,
        matchers jsonb DEFAULT '[]'::jsonb,
        ativo boolean DEFAULT true,
        created_at timestamptz DEFAULT now(),
        updated_at timestamptz DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_skills_slug ON skills(slug);
      CREATE INDEX IF NOT EXISTS idx_skills_ativo ON skills(ativo);
    `,
  }).catch(() => null);

  // Fallback: tenta criar via insert direto (Supabase pode não ter exec_sql)
  // Se a tabela já existe, o insert falha silenciosamente pelo conflict.
  if (errSkills) {
    log.debug('bootstrap: exec_sql indisponível — usando upsert direto');
  }

  // Cria tabela skill_execucoes se não existir
  await supabase.rpc('exec_sql', {
    sql: `
      CREATE TABLE IF NOT EXISTS skill_execucoes (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        skill_slug text NOT NULL,
        input text NOT NULL,
        contexto jsonb DEFAULT '{}'::jsonb,
        output text,
        tokens_usados integer,
        erro text,
        created_at timestamptz DEFAULT now()
      );
      CREATE INDEX IF NOT EXISTS idx_skill_exec_slug ON skill_execucoes(skill_slug);
      CREATE INDEX IF NOT EXISTS idx_skill_exec_created ON skill_execucoes(created_at DESC);
    `,
  }).catch(() => null);

  // Seed: insere skills padrão (ignora conflito de slug)
  for (const s of SEED_SKILLS) {
    const { error } = await supabase
      .from('skills')
      .insert({
        slug: s.slug,
        titulo: s.titulo,
        descricao: s.descricao,
        prompt_template: s.prompt_template,
        matchers: s.matchers,
      })
      .select()
      .single();
    if (error && error.code !== '23505') {
      log.debug('Seed skill ignorado', { slug: s.slug, code: error.code });
    }
  }

  log.info('Skills bootstrap concluído');
}

// Roda na inicialização do módulo (não bloqueia o servidor)
bootstrapSkills().catch((err) => {
  log.error('Skills bootstrap falhou', { err: err.message });
});

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

function preencherTemplate(template, vars = {}) {
  return template.replace(/\{(\w+)\}/g, (match, key) => {
    return vars[key] !== undefined ? vars[key] : match;
  });
}

// ──────────────────────────────────────────────
// GET /api/skills — lista todas as skills ativas
// Query: ?ativo=true|false|all  (default: todas)
// ──────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const filtroAtivo = req.query.ativo;

    let query = supabase
      .from('skills')
      .select('id, slug, titulo, descricao, matchers, ativo, created_at, updated_at')
      .order('created_at', { ascending: true });

    if (filtroAtivo === 'true') query = query.eq('ativo', true);
    else if (filtroAtivo === 'false') query = query.eq('ativo', false);
    // 'all' ou ausente: sem filtro

    const { data, error } = await query;
    if (error) throw error;

    res.json({ ok: true, count: (data || []).length, skills: data || [] });
  } catch (err) {
    log.error('GET /api/skills falhou', { err: err.message });
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ──────────────────────────────────────────────
// GET /api/skills/:slug — retorna skill por slug
// ──────────────────────────────────────────────
router.get('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;

    const { data, error } = await supabase
      .from('skills')
      .select('*')
      .eq('slug', slug)
      .single();

    if (error || !data) {
      return res.status(404).json({ ok: false, error: `Skill '${slug}' não encontrada` });
    }

    res.json({ ok: true, skill: data });
  } catch (err) {
    log.error('GET /api/skills/:slug falhou', { err: err.message });
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ──────────────────────────────────────────────
// POST /api/skills — cria nova skill
// Body: { slug, titulo, descricao, prompt_template, matchers?: [] }
// ──────────────────────────────────────────────
router.post('/', async (req, res) => {
  try {
    const { slug, titulo, descricao, prompt_template, matchers } = req.body || {};

    if (!slug || !titulo || !prompt_template) {
      return res.status(400).json({
        ok: false,
        error: 'Campos obrigatórios: slug, titulo, prompt_template',
      });
    }

    // Valida slug: só letras, números e hífen
    if (!/^[a-z0-9-]+$/.test(slug)) {
      return res.status(400).json({
        ok: false,
        error: 'slug deve conter apenas letras minúsculas, números e hífens',
      });
    }

    const { data, error } = await supabase
      .from('skills')
      .insert({
        slug,
        titulo,
        descricao: descricao || null,
        prompt_template,
        matchers: Array.isArray(matchers) ? matchers : [],
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return res.status(409).json({ ok: false, error: `Slug '${slug}' já existe` });
      }
      throw error;
    }

    log.info('Skill criada', { slug });
    res.status(201).json({ ok: true, skill: data });
  } catch (err) {
    log.error('POST /api/skills falhou', { err: err.message });
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ──────────────────────────────────────────────
// PATCH /api/skills/:slug — atualiza campos da skill
// Body: { titulo?, descricao?, prompt_template?, matchers?, ativo? }
// ──────────────────────────────────────────────
router.patch('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const { titulo, descricao, prompt_template, matchers, ativo } = req.body || {};

    const patch = { updated_at: new Date().toISOString() };
    if (titulo !== undefined) patch.titulo = titulo;
    if (descricao !== undefined) patch.descricao = descricao;
    if (prompt_template !== undefined) patch.prompt_template = prompt_template;
    if (matchers !== undefined) patch.matchers = Array.isArray(matchers) ? matchers : [];
    if (ativo !== undefined) patch.ativo = Boolean(ativo);

    if (Object.keys(patch).length === 1) {
      return res.status(400).json({ ok: false, error: 'Nenhum campo para atualizar' });
    }

    const { data, error } = await supabase
      .from('skills')
      .update(patch)
      .eq('slug', slug)
      .select()
      .single();

    if (error || !data) {
      return res.status(404).json({ ok: false, error: `Skill '${slug}' não encontrada` });
    }

    log.info('Skill atualizada', { slug, patch: Object.keys(patch) });
    res.json({ ok: true, skill: data });
  } catch (err) {
    log.error('PATCH /api/skills/:slug falhou', { err: err.message });
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ──────────────────────────────────────────────
// DELETE /api/skills/:slug — remove skill
// ──────────────────────────────────────────────
router.delete('/:slug', async (req, res) => {
  try {
    const { slug } = req.params;

    const { data, error } = await supabase
      .from('skills')
      .delete()
      .eq('slug', slug)
      .select()
      .single();

    if (error || !data) {
      return res.status(404).json({ ok: false, error: `Skill '${slug}' não encontrada` });
    }

    log.info('Skill removida', { slug });
    res.json({ ok: true, removed: slug });
  } catch (err) {
    log.error('DELETE /api/skills/:slug falhou', { err: err.message });
    res.status(500).json({ ok: false, error: err.message });
  }
});

// ──────────────────────────────────────────────
// POST /api/skills/:slug/executar — executa a skill via Groq
// Body: { input, contexto?: { nome?, dias?, interesse?, ... } }
// ──────────────────────────────────────────────
router.post('/:slug/executar', async (req, res) => {
  const { slug } = req.params;
  const { input, contexto } = req.body || {};

  if (!input) {
    return res.status(400).json({ ok: false, error: 'Campo obrigatório: input' });
  }

  let skill = null;
  let output = null;
  let tokensUsados = null;
  let erroExec = null;

  try {
    // 1. Busca skill
    const { data, error } = await supabase
      .from('skills')
      .select('*')
      .eq('slug', slug)
      .eq('ativo', true)
      .single();

    if (error || !data) {
      return res.status(404).json({ ok: false, error: `Skill '${slug}' não encontrada ou inativa` });
    }
    skill = data;

    // 2. Preenche template com input + contexto
    const vars = { input, ...(typeof contexto === 'object' && contexto !== null ? contexto : {}) };
    const promptPreenchido = preencherTemplate(skill.prompt_template, vars);

    // 3. Executa via Groq
    const messages = [
      {
        role: 'system',
        content:
          'Você é o Charles Nobre, corretor imobiliário especialista no litoral de Santa Catarina. ' +
          'Responda sempre em português brasileiro, de forma clara e profissional.',
      },
      { role: 'user', content: promptPreenchido },
    ];

    const groqResponse = await chat(messages, { maxTokens: 800 });
    output = groqResponse;

    log.info('Skill executada', { slug, inputLen: input.length, outputLen: output.length });
  } catch (err) {
    erroExec = err.message;
    log.error('Execução de skill falhou', { slug, err: err.message });
  }

  // 4. Salva histórico (sempre, mesmo em erro)
  try {
    await supabase.from('skill_execucoes').insert({
      skill_slug: slug,
      input,
      contexto: typeof contexto === 'object' && contexto !== null ? contexto : {},
      output: output || null,
      tokens_usados: tokensUsados,
      erro: erroExec || null,
    });
  } catch (saveErr) {
    log.error('Falha ao salvar execução no histórico', { slug, err: saveErr.message });
  }

  if (erroExec) {
    return res.status(500).json({ ok: false, error: erroExec });
  }

  res.json({ ok: true, slug, output });
});

export default router;
