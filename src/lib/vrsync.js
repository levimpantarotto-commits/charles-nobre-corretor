// Mapper de property canonica -> bloco XML <Imovel> no padrao VRSync,
// aceito por OLX Imoveis Pro, ZAP, Viva Real, ImovelWeb, Chaves na Mao.
//
// Schema usado: VRSync 4.0 (root <Carga><Imoveis>).
// Doc de referencia: https://vrsync.com.br/integracao (e variantes ZAP/OLX).

const TIPO_CATEGORIA = {
  Apartamento: 'Apartamento Padrão',
  Casa: 'Casa Padrão',
  Cobertura: 'Apartamento Cobertura',
  Terreno: 'Terreno Padrão',
  Prédio: 'Prédio Inteiro',
};

function escapeXml(text) {
  if (text == null) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function tag(name, value) {
  if (value === null || value === undefined || value === '') return '';
  return `<${name}>${escapeXml(value)}</${name}>`;
}

function cdata(name, value) {
  if (!value) return '';
  const clean = String(value).replace(/]]>/g, ']]]]><![CDATA[>');
  return `<${name}><![CDATA[${clean}]]></${name}>`;
}

// Heuristicas pra extrair contagens do array features (frageis, melhorar com colunas dedicadas).
export function parseFeatures(features) {
  const result = { dormitorios: 0, suites: 0, banheiros: 0, vagas: 0, mobiliado: false };
  if (!Array.isArray(features)) return result;

  const txt = features.join(' | ').toLowerCase();

  // Suites primeiro (vamos usar pra calcular dormitorios)
  const suiteMatch = txt.match(/(\d+)\s*su[ií]te/);
  if (suiteMatch) result.suites = parseInt(suiteMatch[1], 10);
  else if (/su[ií]te/.test(txt)) result.suites = 1;

  // Padrao "X suite(s) + Y quarto(s)" => dormitorios = X + Y
  const combo = txt.match(/(\d+)\s*su[ií]te[s]?\s*\+\s*(\d+)\s*quarto/);
  if (combo) {
    result.dormitorios = parseInt(combo[1], 10) + parseInt(combo[2], 10);
  } else {
    // "3 dormitorios" ou "3 quartos" (em geral inclui as suites)
    const dormMatch = txt.match(/(\d+)\s*(dormit[oó]rio|quarto)/);
    if (dormMatch) result.dormitorios = parseInt(dormMatch[1], 10);
    else result.dormitorios = result.suites; // fallback: pelo menos as suites
  }

  const banhoMatch = txt.match(/(\d+)\s*banheir/);
  if (banhoMatch) result.banheiros = parseInt(banhoMatch[1], 10);
  else result.banheiros = result.suites + (txt.includes('banheiro social') ? 1 : 0);

  const vagaMatch = txt.match(/(\d+)\s*vaga/);
  if (vagaMatch) result.vagas = parseInt(vagaMatch[1], 10);
  else if (/garagem|vaga coberta/.test(txt)) result.vagas = 1;

  result.mobiliado = /mobiliad/.test(txt);

  return result;
}

export function propertyToVRSyncXml(p, opts = {}) {
  const baseUrl = (opts.baseUrl || '').replace(/\/$/, '');
  const counts = parseFeatures(p.features);

  const isAluguel = p.intent === 'aluguel';
  const finalidade = isAluguel ? 'Residencial' : 'Residencial';

  const fotos = (Array.isArray(p.images) ? p.images : [])
    .map((url, i) => {
      const absUrl = /^https?:\/\//.test(url) ? url : `${baseUrl}${url}`;
      return [
        '      <Foto>',
        `        <NomeArquivo>img${String(i + 1).padStart(2, '0')}.jpg</NomeArquivo>`,
        `        <URLArquivo>${escapeXml(absUrl)}</URLArquivo>`,
        `        <Principal>${i === 0 ? '1' : '0'}</Principal>`,
        '      </Foto>',
      ].join('\n');
    })
    .join('\n');

  const tipoImovel = p.type || 'Apartamento';
  const subTipoImovel = TIPO_CATEGORIA[tipoImovel] || `${tipoImovel} Padrão`;

  const lines = [
    '  <Imovel>',
    `    ${tag('CodigoImovel', p.id)}`,
    `    ${tag('TipoImovel', tipoImovel)}`,
    `    ${tag('SubTipoImovel', subTipoImovel)}`,
    `    ${tag('CategoriaImovel', isAluguel ? 'Locacao' : 'Venda')}`,
    `    ${tag('Finalidade', finalidade)}`,
    isAluguel
      ? `    ${tag('PrecoLocacao', p.price)}`
      : `    ${tag('PrecoVenda', p.price)}`,
    `    ${tag('UF', p.state || 'SC')}`,
    `    ${tag('Cidade', p.city)}`,
    `    ${tag('Bairro', p.neighborhood)}`,
    `    ${tag('AreaUtil', p.area ?? '')}`,
    `    ${tag('AreaTotal', p.area ?? '')}`,
    `    ${tag('QtdDormitorios', counts.dormitorios || '')}`,
    `    ${tag('QtdSuites', counts.suites || '')}`,
    `    ${tag('QtdBanheiros', counts.banheiros || '')}`,
    `    ${tag('QtdVagas', counts.vagas || '')}`,
    `    ${tag('Mobiliado', counts.mobiliado ? '1' : '0')}`,
    `    ${cdata('TituloAnuncio', p.title)}`,
    `    ${cdata('Observacao', p.description)}`,
    fotos ? '    <Fotos>' : '',
    fotos,
    fotos ? '    </Fotos>' : '',
    '  </Imovel>',
  ].filter(Boolean);

  return lines.join('\n');
}

export function buildVRSyncFeed(properties, opts = {}) {
  const cliente = opts.cliente || 'Charles R. Nobre Consultoria Imobiliaria';
  const creci = opts.creci || '37177';
  const email = opts.email || '';
  const items = (properties || [])
    .filter((p) => p && p.id)
    .map((p) => propertyToVRSyncXml(p, opts))
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<Carga>
  <Cliente>
    ${tag('NomeCliente', cliente)}
    ${tag('CRECI', creci)}
    ${tag('Email', email)}
  </Cliente>
  <Imoveis>
${items}
  </Imoveis>
</Carga>`;
}
