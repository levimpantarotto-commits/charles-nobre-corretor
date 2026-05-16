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

// Resume o catalogo em ~10 linhas pra injetar no system prompt
export async function resumoCatalogo() {
  const imoveis = await listarTodos();
  if (imoveis.length === 0) return 'Catalogo vazio.';
  const linhas = imoveis.map((p) => {
    const preco = fmtBRL(p.price);
    const intent = p.intent === 'aluguel' ? 'Aluguel' : 'Venda';
    const area = p.area ? `${p.area}m²` : '';
    return `- [${intent}] ${p.title} — ${preco}${area ? ` · ${area}` : ''} · ${p.neighborhood || p.city || ''}`;
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
  return `https://charlesrnobre.com.br/imovel/${id}`;
}
