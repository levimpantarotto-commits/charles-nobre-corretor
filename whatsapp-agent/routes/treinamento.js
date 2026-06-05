// routes/treinamento.js — Base de conhecimento do agente IA Charles Nobre
// Express Router — montado em server.js como:
//   import treinamentoRouter from './routes/treinamento.js';
//   app.use('/api/treinamento', requireToken, treinamentoRouter);
//
// Dependências extras necessárias no package.json:
//   npm install multer
//   (groq-sdk já presente; GROQ_API_KEY no .env ativa transcrição de áudio)

import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { supabase } from '../lib/supabase.js';
import { log } from '../lib/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// --- Diretório de uploads ---
const UPLOAD_DIR = path.resolve(__dirname, '..', 'uploads', 'treinamento');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// --- Multer config ---
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ts = Date.now();
    const safe = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${ts}_${safe}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['text/plain', 'application/pdf', 'audio/mpeg', 'audio/ogg',
      'audio/wav', 'audio/mp4', 'audio/webm', 'audio/x-m4a'];
    if (allowed.includes(file.mimetype) || file.mimetype.startsWith('audio/') || file.mimetype.startsWith('text/')) {
      cb(null, true);
    } else {
      cb(new Error(`Tipo de arquivo nao permitido: ${file.mimetype}`));
    }
  },
});

// --- Categorias fixas ---
const CATEGORIAS_VALIDAS = ['dna_charles', 'argumentos', 'contratos', 'regiao', 'pipeline', 'regras', 'outros'];

const CATEGORIAS_LABEL = {
  dna_charles: 'DNA Charles',
  argumentos:  'Argumentos de Venda',
  contratos:   'Contratos e Documentação',
  regiao:      'Região e Imóveis',
  pipeline:    'Pipeline e Follow-up',
  regras:      'Regras do Agente',
  outros:      'Outros',
};

// --- Groq Whisper (opcional) ---
let transcribeAudio = null;
if (process.env.GROQ_API_KEY) {
  try {
    const mod = await import('../lib/transcribe.js');
    transcribeAudio = mod.transcribeAudio;
  } catch {
    log.warn('transcribe.js nao carregado — transcrição de áudio indisponível');
  }
}

// --- Router ---
const router = Router();

// ============================================================
// GET /api/treinamento/categorias
// Lista as 7 categorias com contagem de itens ativos
// ============================================================
router.get('/categorias', async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from('treinamento')
      .select('categoria, ativo');
    if (error) throw error;

    const contagem = {};
    for (const cat of CATEGORIAS_VALIDAS) contagem[cat] = 0;
    for (const row of data || []) {
      if (row.ativo && contagem[row.categoria] !== undefined) {
        contagem[row.categoria]++;
      }
    }

    const resultado = CATEGORIAS_VALIDAS.map((cat) => ({
      categoria: cat,
      label: CATEGORIAS_LABEL[cat],
      total_ativos: contagem[cat],
    }));

    res.json({ ok: true, categorias: resultado });
  } catch (err) {
    log.error('treinamento/categorias falhou', { err: err.message });
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// GET /api/treinamento/contexto
// Retorna conteúdo ativo de todas as categorias concatenado
// (para injetar no system prompt do wa-agent)
// ============================================================
router.get('/contexto', async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from('treinamento')
      .select('categoria, titulo, conteudo')
      .eq('ativo', true)
      .order('categoria')
      .order('created_at', { ascending: true });
    if (error) throw error;

    // Agrupa por categoria e concatena
    const grupos = {};
    for (const cat of CATEGORIAS_VALIDAS) grupos[cat] = [];
    for (const row of data || []) {
      if (grupos[row.categoria]) grupos[row.categoria].push(row);
    }

    const blocos = [];
    for (const cat of CATEGORIAS_VALIDAS) {
      if (!grupos[cat].length) continue;
      const header = `## ${CATEGORIAS_LABEL[cat] || cat}`;
      const linhas = grupos[cat].map((r) => `### ${r.titulo}\n${r.conteudo}`).join('\n\n');
      blocos.push(`${header}\n\n${linhas}`);
    }

    const contexto = blocos.join('\n\n---\n\n');
    res.json({ ok: true, chars: contexto.length, contexto });
  } catch (err) {
    log.error('treinamento/contexto falhou', { err: err.message });
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// GET /api/treinamento
// Todos os itens agrupados por categoria
// ?todos=1 inclui inativos
// ============================================================
router.get('/', async (req, res) => {
  try {
    const incluirInativos = req.query.todos === '1';

    let q = supabase
      .from('treinamento')
      .select('id, categoria, titulo, conteudo, tipo, ativo, created_at, updated_at')
      .order('categoria')
      .order('created_at', { ascending: true });

    if (!incluirInativos) q = q.eq('ativo', true);

    const { data, error } = await q;
    if (error) throw error;

    // Agrupa por categoria
    const agrupado = {};
    for (const cat of CATEGORIAS_VALIDAS) agrupado[cat] = [];
    for (const row of data || []) {
      if (agrupado[row.categoria]) agrupado[row.categoria].push(row);
      else agrupado['outros'].push(row);
    }

    res.json({ ok: true, total: data?.length || 0, incluirInativos, agrupado });
  } catch (err) {
    log.error('treinamento GET / falhou', { err: err.message });
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// GET /api/treinamento/:id
// ============================================================
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from('treinamento')
      .select('*')
      .eq('id', id)
      .single();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Não encontrado' });
    res.json({ ok: true, item: data });
  } catch (err) {
    if (err.code === 'PGRST116') return res.status(404).json({ error: 'Não encontrado' });
    log.error('treinamento GET /:id falhou', { err: err.message });
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// POST /api/treinamento
// Criar item. Aceita JSON ou multipart/form-data (arquivo de texto ou áudio).
// Body JSON: { categoria, titulo, conteudo, tipo? }
// Form-data: campos idem + arquivo no campo "arquivo"
// ============================================================
router.post('/', upload.single('arquivo'), async (req, res) => {
  try {
    let { categoria, titulo, conteudo, tipo } = req.body || {};

    // --- Validação ---
    if (!categoria || !CATEGORIAS_VALIDAS.includes(categoria)) {
      return res.status(400).json({
        error: `categoria inválida. Use: ${CATEGORIAS_VALIDAS.join(', ')}`,
      });
    }
    if (!titulo || !titulo.trim()) {
      return res.status(400).json({ error: 'titulo obrigatorio' });
    }

    // --- Processa arquivo enviado ---
    if (req.file) {
      const mt = req.file.mimetype || '';

      if (mt.startsWith('audio/') && transcribeAudio) {
        // Transcrição via Groq Whisper
        const buffer = fs.readFileSync(req.file.path);
        try {
          conteudo = await transcribeAudio(buffer, mt);
          tipo = tipo || 'audio';
        } catch (transcErr) {
          log.error('Falha na transcrição', { err: transcErr.message });
          return res.status(422).json({ error: `Falha na transcrição: ${transcErr.message}` });
        } finally {
          fs.unlink(req.file.path, () => {}); // remove temporário
        }
      } else if (mt.startsWith('audio/') && !transcribeAudio) {
        return res.status(503).json({ error: 'GROQ_API_KEY ausente — transcrição de áudio indisponível' });
      } else {
        // Arquivo de texto/pdf: lê conteúdo do arquivo como texto
        try {
          conteudo = fs.readFileSync(req.file.path, 'utf8');
          tipo = tipo || (mt.includes('pdf') ? 'pdf' : 'texto');
        } catch {
          conteudo = `[arquivo: ${req.file.originalname}] — conteúdo não pôde ser lido como texto`;
          tipo = tipo || 'pdf';
        }
        // Mantém arquivo em disco pra referência
      }
    }

    if (!conteudo || !conteudo.trim()) {
      return res.status(400).json({ error: 'conteudo obrigatorio (ou envie um arquivo)' });
    }

    tipo = tipo || 'texto';

    const row = {
      categoria,
      titulo: titulo.trim(),
      conteudo: conteudo.trim(),
      tipo,
      ativo: true,
      arquivo_path: req.file && fs.existsSync(req.file.path) ? req.file.path : null,
    };

    const { data, error } = await supabase
      .from('treinamento')
      .insert(row)
      .select()
      .single();
    if (error) throw error;

    log.info('treinamento criado', { id: data.id, categoria, titulo });
    res.status(201).json({ ok: true, item: data });
  } catch (err) {
    log.error('treinamento POST / falhou', { err: err.message });
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// PATCH /api/treinamento/:id
// Atualiza campos parcialmente (incluindo ativo: true/false)
// ============================================================
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { categoria, titulo, conteudo, tipo, ativo } = req.body || {};

    const patch = {};
    if (categoria !== undefined) {
      if (!CATEGORIAS_VALIDAS.includes(categoria)) {
        return res.status(400).json({ error: `categoria inválida. Use: ${CATEGORIAS_VALIDAS.join(', ')}` });
      }
      patch.categoria = categoria;
    }
    if (titulo !== undefined) patch.titulo = titulo.trim();
    if (conteudo !== undefined) patch.conteudo = conteudo.trim();
    if (tipo !== undefined) patch.tipo = tipo;
    if (ativo !== undefined) patch.ativo = Boolean(ativo);

    if (!Object.keys(patch).length) {
      return res.status(400).json({ error: 'Nenhum campo para atualizar' });
    }

    patch.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('treinamento')
      .update(patch)
      .eq('id', id)
      .select()
      .single();
    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Não encontrado' });

    log.info('treinamento atualizado', { id, patch: Object.keys(patch) });
    res.json({ ok: true, item: data });
  } catch (err) {
    if (err.code === 'PGRST116') return res.status(404).json({ error: 'Não encontrado' });
    log.error('treinamento PATCH /:id falhou', { err: err.message });
    res.status(500).json({ error: err.message });
  }
});

// ============================================================
// DELETE /api/treinamento/:id
// ============================================================
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Verifica existência e pega arquivo_path antes de deletar
    const { data: existing, error: fetchErr } = await supabase
      .from('treinamento')
      .select('id, titulo, arquivo_path')
      .eq('id', id)
      .single();
    if (fetchErr || !existing) return res.status(404).json({ error: 'Não encontrado' });

    const { error } = await supabase
      .from('treinamento')
      .delete()
      .eq('id', id);
    if (error) throw error;

    // Remove arquivo em disco se existir
    if (existing.arquivo_path && fs.existsSync(existing.arquivo_path)) {
      fs.unlink(existing.arquivo_path, () => {});
    }

    log.info('treinamento deletado', { id, titulo: existing.titulo });
    res.json({ ok: true, deletado: id });
  } catch (err) {
    log.error('treinamento DELETE /:id falhou', { err: err.message });
    res.status(500).json({ error: err.message });
  }
});

export default router;
