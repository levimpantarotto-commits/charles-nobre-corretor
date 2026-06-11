import { NextResponse } from 'next/server';
import { supabaseAdmin, hasServiceRole } from '@/lib/supabase-admin';
import { isAuthenticated } from '@/lib/admin-auth';
import { estimateReadingMinutes } from '@/lib/blog';

// ─── Temas de SEO local — atualizados com dados reais de busca (jun/2026) ────
// Foco em palavras-chave que comprovadamente atraem na região:
// Praia do Rosa (campeã absoluta), investimento/ROI, valorização concreta (12-15% a.a.),
// migração SP/RS, bairros nomeados (Ferrugem, Silveira, Ouvidor, Ibiraquera, Vila Nova).
const TEMAS = [
  // 🌊 PRAIA DO ROSA — palavra-chave nº1 da região
  { city: 'Imbituba', tema: 'Praia do Rosa: como comprar imóvel na praia mais procurada do litoral catarinense', tags: ['praia do rosa', 'imbituba', 'compra'] },
  { city: 'Imbituba', tema: 'Quanto custa um imóvel na Praia do Rosa em 2026? Faixas de preço por tipo', tags: ['praia do rosa', 'preços', 'imbituba'] },
  { city: 'Imbituba', tema: 'Praia do Rosa Norte ou Sul: qual lado é melhor para investir', tags: ['praia do rosa', 'comparativo', 'investimento'] },

  // 💰 ROI / TEMPORADA — argumento concreto de investidor
  { city: null, tema: 'Aluguel de temporada na Praia do Rosa: ROI de 6 a 10% ao ano comprovado', tags: ['temporada', 'roi', 'investimento'] },
  { city: 'Garopaba', tema: 'Como rentabilizar imóvel em Garopaba: temporada, anual ou Airbnb', tags: ['garopaba', 'temporada', 'renda'] },
  { city: null, tema: 'Valorização imobiliária no litoral catarinense: dados reais de 12% a 15% ao ano', tags: ['valorização', 'investimento', 'mercado'] },

  // ✈️ MIGRAÇÃO — público comprador real (vem de fora)
  { city: null, tema: 'Vale a pena sair de São Paulo e investir em imóvel no litoral catarinense', tags: ['migração', 'investimento', 'são paulo'] },
  { city: null, tema: 'Saindo de Porto Alegre para morar em Garopaba ou Imbituba: o que considerar', tags: ['migração', 'gaúchos', 'mudança'] },
  { city: null, tema: 'Trabalhar remoto no litoral de SC: imóveis com fibra óptica e estrutura', tags: ['home office', 'remoto', 'qualidade de vida'] },

  // 🏖️ BAIRROS E PRAIAS POR NOME — busca específica forte
  { city: 'Garopaba', tema: 'Ferrugem ou Silveira: qual praia escolher para comprar imóvel em Garopaba', tags: ['ferrugem', 'silveira', 'comparativo'] },
  { city: 'Garopaba', tema: 'Praia do Ouvidor: o refúgio mais reservado de Garopaba e seus imóveis', tags: ['ouvidor', 'garopaba', 'alto padrão'] },
  { city: 'Imbituba', tema: 'Ibiraquera: a praia que mais valoriza em Imbituba e por quê', tags: ['ibiraquera', 'imbituba', 'valorização'] },
  { city: 'Imbituba', tema: 'Vila Nova em Imbituba: bairro completo para morar o ano todo', tags: ['vila nova', 'imbituba', 'morar'] },
  { city: 'Imbituba', tema: 'Nova Brasília Imbituba: o bairro em maior expansão da cidade', tags: ['nova brasília', 'imbituba', 'expansão'] },

  // 🏗️ INFRAESTRUTURA — argumentos concretos de valorização
  { city: 'Imbituba', tema: 'Porto de Imbituba e o impacto no mercado imobiliário da região', tags: ['porto', 'imbituba', 'economia'] },
  { city: null, tema: 'Investimentos de R$ 350 milhões no litoral sul de SC: o que muda para os imóveis', tags: ['infraestrutura', 'investimento', 'governo'] },

  // 💵 FINANCIAMENTO — campeão absoluto em buscas práticas
  { city: null, tema: 'Como financiar imóvel no litoral de SC: SFH, FGTS e dicas de aprovação', tags: ['financiamento', 'sfh', 'fgts'] },
  { city: null, tema: 'ITBI, escritura e cartório: custos reais além do preço do imóvel em SC', tags: ['custos', 'cartório', 'itbi'] },
  { city: null, tema: 'Minha Casa Minha Vida em Imbituba e Garopaba: como funciona e quem pode usar', tags: ['mcmv', 'financiamento', 'subsídio'] },

  // 🏡 GUIAS PRÁTICOS — buscas frequentes
  { city: null, tema: 'Casa, apartamento ou terreno no litoral: qual a melhor escolha para você', tags: ['comparativo', 'compra', 'estratégia'] },
  { city: null, tema: 'Imóvel para veraneio x moradia fixa: o que considerar no litoral catarinense', tags: ['veraneio', 'moradia', 'investimento'] },
  { city: null, tema: 'Comprar imóvel na planta no litoral de SC: vantagens, riscos e quando vale', tags: ['planta', 'lançamento', 'compra'] },
  { city: null, tema: 'Documentação para comprar imóvel em SC: tudo que você precisa antes de assinar', tags: ['documentação', 'compra', 'segurança'] },

  // 🌴 IMARUÍ — menor demanda mas Charles atua
  { city: 'Imaruí', tema: 'Terrenos em Imaruí: oportunidade de valorização perto de Imbituba', tags: ['imaruí', 'terreno', 'investimento'] },
];

// Busca imagem de capa temática no Pexels (banco grátis)
async function buscarCapa(city, tags) {
  const key = process.env.PEXELS_API_KEY;
  if (!key) return null;
  const t = `${city || ''} ${(tags || []).join(' ')}`.toLowerCase();
  let query = 'beach house ocean view brazil';
  if (t.includes('garopaba')) query = 'beach coastline brazil aerial';
  else if (t.includes('imaru')) query = 'green hills lake countryside';
  else if (t.includes('terreno')) query = 'land plot coastal';
  else if (t.includes('investiment') || t.includes('investir')) query = 'modern beach apartment building';
  else if (t.includes('bairro') || t.includes('morar')) query = 'beachfront neighborhood houses';
  try {
    const res = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=20&orientation=landscape`, {
      headers: { Authorization: key },
    });
    const j = await res.json();
    const fotos = j.photos || [];
    if (!fotos.length) return null;
    // varia a foto pelo segundo atual pra não repetir sempre (sem Math.random no topo)
    const foto = fotos[new Date().getSeconds() % fotos.length];
    return foto.src.large2x || foto.src.large || null;
  } catch {
    return null;
  }
}

function slugify(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim().replace(/\s+/g, '-').replace(/-+/g, '-')
    .slice(0, 80);
}

async function gerarConteudoIA(tema, city) {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error('GROQ_API_KEY ausente no ambiente');

  const regiao = city || 'litoral catarinense (Imbituba, Garopaba e Imaruí)';
  const prompt = `Você é Charles R. Nobre, corretor imobiliário CRECI 37177, especialista no ${regiao} há mais de 12 anos.

Escreva um artigo de blog completo e otimizado para SEO sobre: "${tema}"

REGRAS:
- Conteúdo REAL e útil, escrito por especialista local. Nada genérico.
- 600 a 900 palavras em markdown (use ##, ###, listas, negrito).
- Tom profissional, acolhedor, confiável. Primeira pessoa quando fizer sentido.
- Inclua dados práticos: faixas de preço aproximadas, bairros reais, dicas concretas.
- Termine com um convite sutil para falar com o Charles (sem ser apelativo).
- Otimize para Google: use a palavra-chave principal no título e nos subtítulos.

Retorne APENAS um JSON válido (sem markdown ao redor):
{
  "title": "título chamativo com a palavra-chave (max 70 caracteres)",
  "excerpt": "resumo de 1-2 frases para o card e meta description (max 160 caracteres)",
  "content_md": "o artigo completo em markdown",
  "seo_keywords": ["palavra1", "palavra2", "palavra3"]
}`;

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      response_format: { type: 'json_object' },
      max_tokens: 3000,
      temperature: 0.7,
    }),
  });

  if (!res.ok) throw new Error(`Groq HTTP ${res.status}: ${await res.text()}`);
  const json = await res.json();
  return JSON.parse(json.choices[0].message.content);
}

// POST /api/blog/gerar — gera e publica 1 post novo
// Auth: header x-cron-token (== CRON_SECRET) OU sessão admin autenticada
export async function POST(request) {
  const cronToken = request.headers.get('x-cron-token');
  const viaCron = cronToken && cronToken === process.env.CRON_SECRET;
  const viaAdmin = await isAuthenticated();

  if (!viaCron && !viaAdmin) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  if (!hasServiceRole) {
    return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY ausente' }, { status: 503 });
  }

  try {
    // Buscar slugs já existentes pra escolher tema não repetido
    const { data: existentes } = await supabaseAdmin
      .from('blog_posts')
      .select('title');
    const titulosUsados = new Set((existentes || []).map(p => (p.title || '').toLowerCase()));

    // Escolher tema cujo assunto ainda não foi coberto (rotação)
    const disponiveis = TEMAS.filter(t =>
      ![...titulosUsados].some(usado => usado.includes(t.tema.toLowerCase().slice(0, 30)))
    );
    const pool = disponiveis.length > 0 ? disponiveis : TEMAS;
    // determinístico-ish: usa o count de posts pra avançar na lista (sem Math.random)
    const idx = (existentes?.length || 0) % pool.length;
    const escolhido = pool[idx];

    const ia = await gerarConteudoIA(escolhido.tema, escolhido.city);
    const capa = await buscarCapa(escolhido.city, escolhido.tags);

    const row = {
      slug: slugify(ia.title),
      title: ia.title,
      excerpt: ia.excerpt || null,
      content_md: ia.content_md,
      cover_image: capa,
      tags: escolhido.tags,
      city: escolhido.city,
      author: 'Charles R. Nobre',
      seo_keywords: Array.isArray(ia.seo_keywords) ? ia.seo_keywords : [],
      reading_minutes: estimateReadingMinutes(ia.content_md),
      published: true,
      published_at: new Date().toISOString(),
    };

    const { data, error } = await supabaseAdmin
      .from('blog_posts')
      .insert(row)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });

    return NextResponse.json({
      ok: true,
      post: { id: data.id, slug: data.slug, title: data.title, city: data.city },
    }, { status: 201 });
  } catch (err) {
    console.error('API blog/gerar:', err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
