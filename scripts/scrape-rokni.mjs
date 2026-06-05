/**
 * scrape-rokni.mjs
 * Puxa todos os imóveis à venda da Rokni via API Tecimob (x-domain auth)
 * Salva em scripts/rokni_imoveis.json
 *
 * Uso: node scripts/scrape-rokni.mjs
 */

import { writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_FILE = join(__dirname, 'rokni_imoveis.json');

const LIMIT = 21;
const HEADERS = {
  'x-domain': 'rokni.com.br',
  'Accept': 'application/json',
  'Origin': 'https://rokni.com.br',
  'Referer': 'https://rokni.com.br/comprar/imoveis',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
};

function apiUrl(offset) {
  return (
    'https://api-sites2.gerenciarimoveis-cf.com.br/api/properties' +
    `?custom_query=card&sort=-created_at%2Cid&offset=${offset}&limit=${LIMIT}` +
    '&with_grouped_condos=true&filter%5Btransaction%5D=1' +
    '&filter%5Bby_area%5D%5Bname%5D=total_area' +
    '&filter%5Bby_area%5D%5Bmeasure%5D=m%C2%B2' +
    '&include=subtype.type%2Cuser&with_title=true'
  );
}

async function fetchPage(offset) {
  const res = await fetch(apiUrl(offset), { headers: HEADERS });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  return res.json();
}

function parsePreco(raw) {
  return Number((raw || '0').replace('R$','').replace(/\./g,'').replace(',','.').trim());
}

function extrairCidade(formatted) {
  if (!formatted) return 'Imbituba';
  const m = formatted.match(/- ([^/]+)\//);
  return m ? m[1].trim() : 'Imbituba';
}

function extrairBairro(formatted) {
  if (!formatted) return '';
  const m = formatted.match(/^(.+?) - /);
  return m ? m[1].trim() : '';
}

async function fetchDetail(id) {
  const url =
    `https://api-sites2.gerenciarimoveis-cf.com.br/api/properties/${id}` +
    '?include=subtype.type,user,characteristics';
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const j = await res.json();
  return j.data || j;
}

function mapImovel(card, detail) {
  const p = detail || card;

  // Áreas
  const areas = p.areas || {};
  const areaPrivativa  = areas.private_area?.value   ? Number(areas.private_area.value)   : null;
  const areaConstruida = areas.built_area?.value      ? Number(areas.built_area.value)     : null;
  const areaTotal      = areas.total_area?.value      ? Number(areas.total_area.value)     :
                         areas.ground_total_area?.value ? Number(areas.ground_total_area.value) : null;
  const terrenoFrente  = areas.front_ground?.value    || null;
  const terrenoFundo   = areas.back_ground?.value     || null;
  const terrenoDir     = areas.right_ground?.value    || null;
  const terrenoEsq     = areas.left_ground?.value     || null;

  // Cômodos
  const rooms = p.rooms || {};
  const garagem_coberta = rooms.garage?.extra?.is_covered?.value || false;

  // Garagem box
  const garagem_box = rooms.garage?.extra?.has_box_in_garage?.value || false;

  // Características
  const caracteristicas = (p.characteristics || []).map(c => c.title);

  // Descrição — remove HTML
  const descHtml = p.description || '';
  const descTexto = descHtml.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

  return {
    rokni_id:           card.id,
    titulo:             p.title_formatted || p.meta_title || '',
    preco:              parsePreco(p.price),
    transacao:          'venda',
    cidade:             extrairCidade(p.address?.formatted),
    bairro:             extrairBairro(p.address?.formatted),
    endereco:           p.address?.formatted || '',
    tipo:               p.subtype?.type?.title || '',
    subtipo:            p.subtype?.title || '',
    // Cômodos
    quartos:            rooms.bedroom?.value  || 0,
    suites:             rooms.suite?.value    || 0,
    banheiros:          rooms.bathroom?.value || 0,
    vagas:              rooms.garage?.value   || 0,
    garagem_coberta,
    garagem_box,
    // Áreas
    area_privativa:     areaPrivativa,
    area_construida:    areaConstruida,
    area_total:         areaTotal,
    terreno_frente:     terrenoFrente,
    terreno_fundo:      terrenoFundo,
    terreno_direita:    terrenoDir,
    terreno_esquerda:   terrenoEsq,
    // Financeiro
    aceita_financiamento: !!p.is_financeable,
    aceita_mcmv:          !!p.is_financeable_mcmv,
    condominio:           p.condominium_price || null,
    // Situação
    escriturado:        !!p.is_deeded,
    matriculado:        !!p.is_property_titled,
    esquina:            !!p.is_corner,
    permuta:            !!p.is_exchangeable,
    stripe:             p.stripe_text || null,
    // Localização (aproximada)
    latitude:           p.maps?.latitude  || null,
    longitude:          p.maps?.longitude || null,
    // Descrição
    descricao:          descTexto,
    caracteristicas,
    // Imagens
    imagens:            (card.images || p.images || []).map(img => ({
                          large:  img.file_url?.large  || null,
                          medium: img.file_url?.medium || null,
                        })),
    imagem_capa:        (card.images || p.images || [])[0]?.file_url?.large || null,
    // URLs e origem
    url_rokni:          `https://rokni.com.br/${p.url || card.url}`,
    origem:             'rokni',
  };
}

(async () => {
  console.log('🚀 Scraper Rokni iniciado');

  // Página 1 — descobre total
  console.log('📦 Página 1...');
  const first = await fetchPage(1);
  const total      = first?.meta?.pagination?.total      || 0;
  const totalPages = first?.meta?.pagination?.total_pages || 1;
  console.log(`   ✅ ${total} imóveis | ${totalPages} páginas`);

  const all = [...(first?.data || [])];
  console.log(`   +${first?.data?.length || 0} (acumulado: ${all.length})`);

  // Demais páginas
  for (let p = 2; p <= totalPages; p++) {
    const offset = p; // offset = número da página
    console.log(`📦 Página ${p}/${totalPages}...`);
    try {
      const result = await fetchPage(offset);
      const items  = result?.data || [];
      all.push(...items);
      console.log(`   +${items.length} (acumulado: ${all.length})`);
      await new Promise(r => setTimeout(r, 300));
    } catch (err) {
      console.error(`   ❌ Erro: ${err.message}`);
    }
  }

  // Busca detalhes de cada imóvel (descrição, suítes, áreas, financiamento, etc.)
  console.log(`\n🔍 Buscando detalhes de ${all.length} imóveis...`);
  const detailed = [];
  for (let i = 0; i < all.length; i++) {
    const card = all[i];
    try {
      const detail = await fetchDetail(card.id);
      detailed.push(mapImovel(card, detail));
      if ((i + 1) % 10 === 0 || i === all.length - 1)
        console.log(`   ${i + 1}/${all.length} concluídos`);
      await new Promise(r => setTimeout(r, 200));
    } catch (err) {
      console.error(`   ❌ Erro no detalhe ${card.id}: ${err.message}`);
      detailed.push(mapImovel(card, null)); // fallback sem detalhe
    }
  }

  writeFileSync(OUTPUT_FILE, JSON.stringify(detailed, null, 2), 'utf8');

  console.log(`\n✅ ${detailed.length} imóveis salvos em ${OUTPUT_FILE}`);

  // Preview
  const s = detailed[0];
  if (s) {
    console.log('\n📋 Amostra:');
    console.log(`   Título:  ${s.titulo}`);
    console.log(`   Preço:   R$ ${s.preco.toLocaleString('pt-BR')}`);
    console.log(`   Tipo:    ${s.tipo} | ${s.quartos} qts | ${s.area_total}m²`);
    console.log(`   Local:   ${s.bairro}, ${s.cidade}`);
    console.log(`   Fotos:   ${s.imagens.length} imagens`);
    console.log(`   URL:     ${s.url_rokni}`);
  }

  // Estatísticas
  const cidades = {};
  const tipos   = {};
  detailed.forEach(i => {
    cidades[i.cidade] = (cidades[i.cidade] || 0) + 1;
    tipos[i.tipo]     = (tipos[i.tipo]     || 0) + 1;
  });
  console.log('\n📊 Por cidade:', JSON.stringify(cidades));
  console.log('📊 Por tipo:  ', JSON.stringify(tipos));
})().catch(e => {
  console.error('❌ ERRO FATAL:', e.message);
  process.exit(1);
});
