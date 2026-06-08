import { NextResponse } from 'next/server';
import { supabaseAdmin, hasServiceRole } from '@/lib/supabase-admin';
import { isAuthenticated } from '@/lib/admin-auth';
import { estimateReadingMinutes } from '@/lib/blog';

// ─── Temas de SEO local rotativos (imobiliário Imbituba/Garopaba/Imaruí) ───────
const TEMAS = [
  { city: 'Imbituba', tema: 'Melhores bairros para morar em Imbituba e quanto custa cada um', tags: ['bairros', 'imbituba', 'morar'] },
  { city: 'Imbituba', tema: 'Como financiar imóvel em Imbituba: passo a passo e dicas de aprovação', tags: ['financiamento', 'imbituba', 'compra'] },
  { city: 'Imbituba', tema: 'Vale a pena investir em imóveis em Imbituba? Análise de valorização', tags: ['investimento', 'imbituba', 'valorização'] },
  { city: 'Imbituba', tema: 'Documentos necessários para comprar imóvel em Imbituba SC', tags: ['documentação', 'imbituba', 'compra'] },
  { city: 'Imbituba', tema: 'Praia da Vila, Ibiraquera ou Centro: onde comprar em Imbituba', tags: ['praias', 'imbituba', 'comparativo'] },
  { city: 'Garopaba', tema: 'Por que Garopaba é um dos melhores destinos para comprar imóvel no litoral catarinense', tags: ['garopaba', 'litoral', 'investimento'] },
  { city: 'Garopaba', tema: 'Quanto custa morar em Garopaba: imóveis, custo de vida e qualidade de vida', tags: ['garopaba', 'custo de vida', 'morar'] },
  { city: 'Garopaba', tema: 'Imóveis de alto padrão em Garopaba: o que avaliar antes de comprar', tags: ['garopaba', 'alto padrão', 'compra'] },
  { city: 'Imaruí', tema: 'Terrenos em Imaruí: oportunidade de valorização no litoral sul de SC', tags: ['imaruí', 'terreno', 'investimento'] },
  { city: 'Imaruí', tema: 'Morar em Imaruí: tranquilidade e natureza a poucos minutos de Imbituba', tags: ['imaruí', 'morar', 'qualidade de vida'] },
  { city: null, tema: 'Comprar imóvel na praia: erros comuns e como evitá-los', tags: ['compra', 'praia', 'dicas'] },
  { city: null, tema: 'Casa ou apartamento no litoral: qual a melhor escolha para você', tags: ['comparativo', 'compra', 'litoral'] },
  { city: null, tema: 'Como avaliar se o preço de um imóvel no litoral está justo', tags: ['avaliação', 'preço', 'compra'] },
  { city: null, tema: 'Imóvel para veraneio x moradia fixa: o que considerar no litoral catarinense', tags: ['veraneio', 'investimento', 'litoral'] },
];

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

    const row = {
      slug: slugify(ia.title),
      title: ia.title,
      excerpt: ia.excerpt || null,
      content_md: ia.content_md,
      cover_image: null,
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
