// Consulta o catalogo de imoveis do Charles no Supabase pra contextualizar respostas.
import { supabase } from './supabase.js';

const fmtBRL = (n) =>
  Number(n).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 });

export async function listarTodos() {
  const { data, error } = await supabase
    .from('properties')
    .select('id, title, intent, price, city, neighborhood, type, area, features')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

// Resume o catalogo pra injetar no system prompt.
// Inclui o ID curto (8 chars) pra o LLM saber referenciar o link correto.
export async function resumoCatalogo() {
  const imoveis = await listarTodos();
  if (imoveis.length === 0) return 'Catalogo vazio.';
  const linhas = imoveis.map((p) => {
    const preco = fmtBRL(p.price);
    const intent = p.intent === 'aluguel' ? 'Aluguel' : 'Venda';
    const area = p.area ? `${p.area}m²` : '';
    const bairro = p.neighborhood || p.city || '';
    return `- id=${p.id} · [${intent}] ${p.title} — ${preco}${area ? ` · ${area}` : ''} · ${bairro}`;
  });
  return linhas.join('\n');
}

// Busca imoveis por keyword simples (pra usar em respostas direcionadas)
export async function buscar(query) {
  if (!query || query.length < 3) return [];
  const { data } = await supabase
    .from('properties')
    .select('id, title, intent, price, city, neighborhood, type, area, features, description')
    .or(`title.ilike.%${query}%,description.ilike.%${query}%,neighborhood.ilike.%${query}%`)
    .limit(5);
  return data || [];
}

export function linkImovel(id) {
  return `https://www.charlesrnobre.com.br/imoveis/${id}`;
}

// Busca 1 imovel pelo UUID. Usado pra destacar imovel do anuncio Meta Ads atual.
export async function imovelPorId(id) {
  if (!id) return null;
  const { data, error } = await supabase
    .from('properties')
    .select('id, title, intent, price, city, neighborhood, type, area, features, description')
    .eq('id', id)
    .single();
  if (error || !data) return null;
  return data;
}

export function formatarImovelDestaque(p) {
  if (!p) return null;
  const preco = fmtBRL(p.price);
  const intent = p.intent === 'aluguel' ? 'Aluguel' : 'Venda';
  const area = p.area ? `${p.area}m²` : '';
  const bairro = p.neighborhood || p.city || '';
  const link = linkImovel(p.id);
  return `id=${p.id} · ${p.title} · [${intent}] ${preco}${area ? ` · ${area}` : ''} · ${bairro}\nLink: ${link}`;
}
