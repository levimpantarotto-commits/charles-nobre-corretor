// routes/imoveis.js — Charles Neural System
// Express Router para catálogo de imóveis (Charles próprios + importados da Rokni).
//
// Banco: SQLite via better-sqlite3 (síncrono).
// Campos imagens e caracteristicas: TEXT JSON serializado.
//
// Uso no server principal:
//   import Database from 'better-sqlite3';
//   import criarRotaImoveis from './routes/imoveis.js';
//   const db = new Database(process.env.DB_PATH || './charles.db');
//   app.use('/api', criarRotaImoveis(db));
//
// DDL mínimo esperado (rodar 1x):
//   CREATE TABLE IF NOT EXISTS imoveis (
//     id TEXT PRIMARY KEY,
//     titulo TEXT NOT NULL,
//     descricao TEXT,
//     tipo TEXT,
//     transacao TEXT DEFAULT 'venda',
//     cidade TEXT,
//     bairro TEXT,
//     endereco TEXT,
//     preco REAL,
//     quartos INTEGER,
//     suites INTEGER,
//     banheiros INTEGER,
//     vagas INTEGER,
//     area_total REAL,
//     area_construida REAL,
//     imagens TEXT DEFAULT '[]',        -- JSON serializado
//     caracteristicas TEXT DEFAULT '[]',-- JSON serializado
//     origem TEXT DEFAULT 'charles',    -- 'charles' | 'rokni'
//     rokni_id TEXT,
//     ativo INTEGER DEFAULT 1,
//     created_at TEXT DEFAULT (datetime('now')),
//     updated_at TEXT DEFAULT (datetime('now'))
//   );

import { Router } from 'express';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { log } from '../lib/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROKNI_PATH = path.resolve(__dirname, '../scripts/rokni_imoveis.json');

// ---------------------------------------------------------------------------
// Helpers internos
// ---------------------------------------------------------------------------

function parseJSON(val, fallback = null) {
  if (val === null || val === undefined) return fallback;
  if (typeof val === 'object') return val;
  try {
    return JSON.parse(val);
  } catch {
    return fallback;
  }
}

function serializeJSON(val) {
  if (typeof val === 'string') return val;
  return JSON.stringify(val ?? []);
}

function imagemCapa(imagens) {
  if (!Array.isArray(imagens) || !imagens.length) return null;
  const img = imagens[0];
  if (typeof img === 'string') return img;
  return img?.large || img?.medium || img?.url || null;
}

// Hidrata campos JSON e adiciona imagem_capa em um row da listagem.
function hidratarListagem(row) {
  const imagens = parseJSON(row.imagens, []);
  const caracteristicas = parseJSON(row.caracteristicas, []);
  return { ...row, imagens, caracteristicas, imagem_capa: imagemCapa(imagens) };
}

// Monta string WHERE + array de params a partir de um objeto de filtros.
function buildWhere(filtros) {
  const conds = ['ativo = 1'];
  const params = [];

  if (filtros.tipo) {
    conds.push('LOWER(tipo) = LOWER(?)');
    params.push(filtros.tipo);
  }
  if (filtros.cidade) {
    conds.push('LOWER(cidade) = LOWER(?)');
    params.push(filtros.cidade);
  }
  if (filtros.bairro) {
    conds.push('LOWER(bairro) = LOWER(?)');
    params.push(filtros.bairro);
  }
  if (filtros.preco_min !== undefined && filtros.preco_min !== '') {
    conds.push('preco >= ?');
    params.push(Number(filtros.preco_min));
  }
  if (filtros.preco_max !== undefined && filtros.preco_max !== '') {
    conds.push('preco <= ?');
    params.push(Number(filtros.preco_max));
  }
  if (filtros.quartos !== undefined && filtros.quartos !== '') {
    conds.push('quartos >= ?');
    params.push(Number(filtros.quartos));
  }
  if (filtros.origem) {
    conds.push('origem = ?');
    params.push(filtros.origem);
  }
  if (filtros.q) {
    const like = `%${filtros.q}%`;
    conds.push(
      '(titulo LIKE ? OR descricao LIKE ? OR bairro LIKE ? OR cidade LIKE ?)'
    );
    params.push(like, like, like, like);
  }

  return { where: conds.join(' AND '), params };
}

// Converte um item do rokni_imoveis.json para o shape da tabela imoveis.
function rokniParaRow(item) {
  return {
    id: randomUUID(),
    titulo: item.titulo || item.title || '',
    descricao: item.descricao || item.description || '',
    tipo: item.tipo || item.type || '',
    transacao: item.transacao || item.intent || 'venda',
    cidade: item.cidade || item.city || '',
    bairro: item.bairro || item.neighborhood || '',
    endereco: item.endereco || item.address || '',
    preco: Number(item.preco || item.price) || 0,
    quartos: Number(item.quartos || item.bedrooms) || 0,
    suites: Number(item.suites || 0),
    banheiros: Number(item.banheiros || item.bathrooms) || 0,
    vagas: Number(item.vagas || item.parking) || 0,
    area_total: Number(item.area_total || item.area) || 0,
    area_construida: Number(item.area_construida || item.built_area) || 0,
    imagens: serializeJSON(item.imagens || item.images || []),
    caracteristicas: serializeJSON(item.caracteristicas || item.features || []),
    origem: 'rokni',
    rokni_id: item.rokni_id || item.id || null,
  };
}

// ---------------------------------------------------------------------------
// Factory: recebe db (better-sqlite3 instance) e retorna o Router.
// ---------------------------------------------------------------------------
export default function criarRotaImoveis(db) {
  const router = Router();

  // -------------------------------------------------------------------------
  // GET /api/imoveis
  // Filtros: tipo, cidade, bairro, preco_min, preco_max, quartos, origem, q
  // Paginação: limit (máx 200, default 50), offset (default 0)
  // -------------------------------------------------------------------------
  router.get('/imoveis', (req, res) => {
    try {
      const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
      const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);

      const { where, params } = buildWhere({
        tipo: req.query.tipo,
        cidade: req.query.cidade,
        bairro: req.query.bairro,
        preco_min: req.query.preco_min,
        preco_max: req.query.preco_max,
        quartos: req.query.quartos,
        origem: req.query.origem,
        q: req.query.q,
      });

      const total = db
        .prepare(`SELECT COUNT(*) AS n FROM imoveis WHERE ${where}`)
        .get(...params).n;

      const rows = db
        .prepare(
          `SELECT
             id, titulo, tipo, transacao, cidade, bairro, preco,
             quartos, suites, banheiros, vagas, area_total,
             imagens, caracteristicas, origem, rokni_id, created_at
           FROM imoveis
           WHERE ${where}
           ORDER BY created_at DESC
           LIMIT ? OFFSET ?`
        )
        .all(...params, limit, offset);

      res.json({
        ok: true,
        total,
        limit,
        offset,
        data: rows.map(hidratarListagem),
      });
    } catch (err) {
      log.error('imoveis.list falhou', { err: err.message });
      res.status(500).json({ error: err.message });
    }
  });

  // -------------------------------------------------------------------------
  // GET /api/imoveis/stats
  // Contagens por tipo, cidade, origem + métricas de preço.
  // ATENÇÃO: rota estática antes de /:id para o Express não interceptar.
  // -------------------------------------------------------------------------
  router.get('/imoveis/stats', (_req, res) => {
    try {
      const porTipo = db
        .prepare(
          `SELECT tipo, COUNT(*) AS total FROM imoveis WHERE ativo = 1 GROUP BY tipo ORDER BY total DESC`
        )
        .all();

      const porCidade = db
        .prepare(
          `SELECT cidade, COUNT(*) AS total FROM imoveis WHERE ativo = 1 GROUP BY cidade ORDER BY total DESC`
        )
        .all();

      const porOrigem = db
        .prepare(
          `SELECT origem, COUNT(*) AS total FROM imoveis WHERE ativo = 1 GROUP BY origem ORDER BY total DESC`
        )
        .all();

      const precos = db
        .prepare(
          `SELECT
             ROUND(AVG(preco), 2) AS preco_medio,
             MIN(preco) AS preco_min,
             MAX(preco) AS preco_max,
             COUNT(*) AS total_ativos
           FROM imoveis
           WHERE ativo = 1 AND preco > 0`
        )
        .get();

      res.json({
        ok: true,
        por_tipo: porTipo,
        por_cidade: porCidade,
        por_origem: porOrigem,
        precos,
      });
    } catch (err) {
      log.error('imoveis.stats falhou', { err: err.message });
      res.status(500).json({ error: err.message });
    }
  });

  // -------------------------------------------------------------------------
  // GET /api/imoveis/:id — detalhe completo
  // -------------------------------------------------------------------------
  router.get('/imoveis/:id', (req, res) => {
    try {
      const row = db
        .prepare(`SELECT * FROM imoveis WHERE id = ?`)
        .get(req.params.id);

      if (!row) {
        return res.status(404).json({ error: 'Imóvel não encontrado' });
      }

      res.json({ ok: true, data: hidratarListagem(row) });
    } catch (err) {
      log.error('imoveis.get falhou', { id: req.params.id, err: err.message });
      res.status(500).json({ error: err.message });
    }
  });

  // -------------------------------------------------------------------------
  // POST /api/imoveis — criar imóvel (admin)
  // -------------------------------------------------------------------------
  router.post('/imoveis', (req, res) => {
    try {
      const body = req.body || {};

      const campos = [
        'titulo', 'descricao', 'tipo', 'transacao', 'cidade', 'bairro',
        'endereco', 'preco', 'quartos', 'suites', 'banheiros', 'vagas',
        'area_total', 'area_construida', 'imagens', 'caracteristicas',
        'origem', 'rokni_id',
      ];

      const obrigatorios = ['titulo'];
      for (const campo of obrigatorios) {
        if (!body[campo]) {
          return res.status(400).json({ error: `Campo obrigatório ausente: ${campo}` });
        }
      }

      const id = body.id || randomUUID();
      const agora = new Date().toISOString();

      const row = {
        id,
        titulo: body.titulo,
        descricao: body.descricao || '',
        tipo: body.tipo || '',
        transacao: body.transacao || 'venda',
        cidade: body.cidade || '',
        bairro: body.bairro || '',
        endereco: body.endereco || '',
        preco: Number(body.preco) || 0,
        quartos: Number(body.quartos) || 0,
        suites: Number(body.suites) || 0,
        banheiros: Number(body.banheiros) || 0,
        vagas: Number(body.vagas) || 0,
        area_total: Number(body.area_total) || 0,
        area_construida: Number(body.area_construida) || 0,
        imagens: serializeJSON(body.imagens),
        caracteristicas: serializeJSON(body.caracteristicas),
        origem: body.origem || 'charles',
        rokni_id: body.rokni_id || null,
        ativo: 1,
        created_at: agora,
        updated_at: agora,
      };

      db.prepare(
        `INSERT INTO imoveis
           (id, titulo, descricao, tipo, transacao, cidade, bairro, endereco,
            preco, quartos, suites, banheiros, vagas, area_total, area_construida,
            imagens, caracteristicas, origem, rokni_id, ativo, created_at, updated_at)
         VALUES
           ($id, $titulo, $descricao, $tipo, $transacao, $cidade, $bairro, $endereco,
            $preco, $quartos, $suites, $banheiros, $vagas, $area_total, $area_construida,
            $imagens, $caracteristicas, $origem, $rokni_id, $ativo, $created_at, $updated_at)`
      ).run(row);

      log.info('Imóvel criado', { id, titulo: row.titulo, origem: row.origem });
      res.status(201).json({ ok: true, data: hidratarListagem(row) });
    } catch (err) {
      log.error('imoveis.create falhou', { err: err.message });
      res.status(500).json({ error: err.message });
    }
  });

  // -------------------------------------------------------------------------
  // PATCH /api/imoveis/:id — atualizar campos parcialmente
  // -------------------------------------------------------------------------
  router.patch('/imoveis/:id', (req, res) => {
    try {
      const { id } = req.params;
      const body = req.body || {};

      const existente = db
        .prepare(`SELECT id FROM imoveis WHERE id = ?`)
        .get(id);

      if (!existente) {
        return res.status(404).json({ error: 'Imóvel não encontrado' });
      }

      const atualizaveis = [
        'titulo', 'descricao', 'tipo', 'transacao', 'cidade', 'bairro',
        'endereco', 'preco', 'quartos', 'suites', 'banheiros', 'vagas',
        'area_total', 'area_construida', 'imagens', 'caracteristicas',
        'origem', 'rokni_id', 'ativo',
      ];

      const setClauses = [];
      const setParams = {};

      for (const campo of atualizaveis) {
        if (campo in body) {
          setClauses.push(`${campo} = $${campo}`);
          if (campo === 'imagens' || campo === 'caracteristicas') {
            setParams[campo] = serializeJSON(body[campo]);
          } else if (['preco', 'quartos', 'suites', 'banheiros', 'vagas', 'area_total', 'area_construida', 'ativo'].includes(campo)) {
            setParams[campo] = Number(body[campo]);
          } else {
            setParams[campo] = body[campo];
          }
        }
      }

      if (!setClauses.length) {
        return res.status(400).json({ error: 'Nenhum campo válido para atualizar' });
      }

      setClauses.push('updated_at = $updated_at');
      setParams.updated_at = new Date().toISOString();
      setParams.id = id;

      db.prepare(
        `UPDATE imoveis SET ${setClauses.join(', ')} WHERE id = $id`
      ).run(setParams);

      const atualizado = db.prepare(`SELECT * FROM imoveis WHERE id = ?`).get(id);
      log.info('Imóvel atualizado', { id });
      res.json({ ok: true, data: hidratarListagem(atualizado) });
    } catch (err) {
      log.error('imoveis.patch falhou', { id: req.params.id, err: err.message });
      res.status(500).json({ error: err.message });
    }
  });

  // -------------------------------------------------------------------------
  // DELETE /api/imoveis/:id — desativa (ativo = 0, não remove fisicamente)
  // -------------------------------------------------------------------------
  router.delete('/imoveis/:id', (req, res) => {
    try {
      const { id } = req.params;

      const existente = db
        .prepare(`SELECT id, ativo FROM imoveis WHERE id = ?`)
        .get(id);

      if (!existente) {
        return res.status(404).json({ error: 'Imóvel não encontrado' });
      }
      if (!existente.ativo) {
        return res.status(409).json({ error: 'Imóvel já está desativado' });
      }

      db.prepare(
        `UPDATE imoveis SET ativo = 0, updated_at = ? WHERE id = ?`
      ).run(new Date().toISOString(), id);

      log.info('Imóvel desativado', { id });
      res.json({ ok: true, id, ativo: false });
    } catch (err) {
      log.error('imoveis.delete falhou', { id: req.params.id, err: err.message });
      res.status(500).json({ error: err.message });
    }
  });

  // -------------------------------------------------------------------------
  // POST /api/imoveis/importar-rokni
  // Lê scripts/rokni_imoveis.json e insere/atualiza registros com origem='rokni'.
  // Usa rokni_id como chave de deduplicação (INSERT OR REPLACE via upsert).
  // -------------------------------------------------------------------------
  router.post('/imoveis/importar-rokni', (req, res) => {
    try {
      if (!fs.existsSync(ROKNI_PATH)) {
        return res.status(404).json({
          error: `Arquivo não encontrado: ${ROKNI_PATH}`,
        });
      }

      let lista;
      try {
        lista = JSON.parse(fs.readFileSync(ROKNI_PATH, 'utf8'));
      } catch (parseErr) {
        return res.status(422).json({
          error: `Erro ao parsear rokni_imoveis.json: ${parseErr.message}`,
        });
      }

      if (!Array.isArray(lista)) {
        return res.status(422).json({ error: 'rokni_imoveis.json deve ser um array' });
      }

      const stmt = db.prepare(
        `INSERT INTO imoveis
           (id, titulo, descricao, tipo, transacao, cidade, bairro, endereco,
            preco, quartos, suites, banheiros, vagas, area_total, area_construida,
            imagens, caracteristicas, origem, rokni_id, ativo, created_at, updated_at)
         VALUES
           ($id, $titulo, $descricao, $tipo, $transacao, $cidade, $bairro, $endereco,
            $preco, $quartos, $suites, $banheiros, $vagas, $area_total, $area_construida,
            $imagens, $caracteristicas, $origem, $rokni_id, 1, $created_at, $updated_at)
         ON CONFLICT(rokni_id) DO UPDATE SET
           titulo          = excluded.titulo,
           descricao       = excluded.descricao,
           tipo            = excluded.tipo,
           transacao       = excluded.transacao,
           cidade          = excluded.cidade,
           bairro          = excluded.bairro,
           endereco        = excluded.endereco,
           preco           = excluded.preco,
           quartos         = excluded.quartos,
           suites          = excluded.suites,
           banheiros       = excluded.banheiros,
           vagas           = excluded.vagas,
           area_total      = excluded.area_total,
           area_construida = excluded.area_construida,
           imagens         = excluded.imagens,
           caracteristicas = excluded.caracteristicas,
           updated_at      = excluded.updated_at
         WHERE rokni_id IS NOT NULL`
      );

      // Para o ON CONFLICT funcionar em rokni_id, é necessário que a tabela tenha
      // UNIQUE(rokni_id) — adicionar se não existir:
      // CREATE UNIQUE INDEX IF NOT EXISTS idx_imoveis_rokni_id ON imoveis(rokni_id) WHERE rokni_id IS NOT NULL;
      try {
        db.prepare(
          `CREATE UNIQUE INDEX IF NOT EXISTS idx_imoveis_rokni_id ON imoveis(rokni_id) WHERE rokni_id IS NOT NULL`
        ).run();
      } catch (_indexErr) {
        // índice já existe ou banco não suporta — ignora
      }

      const agora = new Date().toISOString();
      let inseridos = 0;
      let atualizados = 0;
      let erros = 0;
      const detalheErros = [];

      const importarTodos = db.transaction((items) => {
        for (const item of items) {
          try {
            const row = rokniParaRow(item);
            row.created_at = agora;
            row.updated_at = agora;

            // Verifica se já existe pelo rokni_id pra contar inserção vs atualização
            const jaExiste = row.rokni_id
              ? db.prepare(`SELECT id FROM imoveis WHERE rokni_id = ?`).get(row.rokni_id)
              : null;

            stmt.run(row);

            if (jaExiste) {
              atualizados++;
            } else {
              inseridos++;
            }
          } catch (itemErr) {
            erros++;
            detalheErros.push({
              rokni_id: item?.rokni_id || item?.id || null,
              titulo: item?.titulo || item?.title || null,
              erro: itemErr.message,
            });
          }
        }
      });

      importarTodos(lista);

      log.info('Importação Rokni concluída', {
        total: lista.length,
        inseridos,
        atualizados,
        erros,
      });

      res.json({
        ok: true,
        total: lista.length,
        inseridos,
        atualizados,
        erros,
        detalhe_erros: detalheErros.length ? detalheErros : undefined,
      });
    } catch (err) {
      log.error('imoveis.importar-rokni falhou', { err: err.message });
      res.status(500).json({ error: err.message });
    }
  });

  return router;
}
