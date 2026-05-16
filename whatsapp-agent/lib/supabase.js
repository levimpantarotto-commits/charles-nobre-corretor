// Cliente Supabase com SERVICE_ROLE (bypassa RLS).
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  throw new Error('Faltou SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY no .env');
}

export const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
});

// Normaliza telefone pra E.164 sem espacos/parenteses
// "(48) 99945-9527" => "5548999459527" (Evolution API espera sem +)
export function normalizePhone(raw) {
  if (!raw) return null;
  let digits = String(raw).replace(/\D/g, '');
  if (!digits) return null;
  // Se nao tem DDI, assume Brasil
  if (digits.length === 10 || digits.length === 11) digits = '55' + digits;
  return digits;
}

// Helper: registra mensagem no DB (inbound ou outbound).
export async function saveMessage({ phone, direction, body, leadId, evolutionMessageId, mediaUrl, status, agentResponse, meta }) {
  const row = {
    phone,
    direction,
    body,
    lead_id: leadId || null,
    evolution_message_id: evolutionMessageId || null,
    media_url: mediaUrl || null,
    status: status || (direction === 'in' ? 'received' : 'sent'),
    agent_response: !!agentResponse,
    meta: meta || {},
  };

  const { data, error } = await supabase
    .from('whatsapp_messages')
    .insert(row)
    .select()
    .single();

  if (error) {
    // dedup por evolution_message_id e silencioso
    if (error.code === '23505') return null;
    throw error;
  }
  return data;
}

// Atualiza status whatsapp do lead + last_whatsapp_at
export async function touchLead(leadId, patch = {}) {
  if (!leadId) return null;
  const update = { last_whatsapp_at: new Date().toISOString(), ...patch };
  const { data, error } = await supabase
    .from('leads')
    .update(update)
    .eq('id', leadId)
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Busca lead por telefone (E.164 ou variantes). Cria se nao existe.
export async function findOrCreateLeadByPhone(phone, defaults = {}) {
  // tenta multiplas variantes do numero
  const variants = [phone];
  if (phone.startsWith('55')) variants.push(phone.slice(2));

  const { data: found } = await supabase
    .from('leads')
    .select('*')
    .or(variants.map((v) => `phone.ilike.%${v}%`).join(','))
    .limit(1);

  if (found && found.length > 0) return found[0];

  const { data: created, error } = await supabase
    .from('leads')
    .insert({
      name: defaults.name || phone,
      phone,
      source: defaults.source || 'whatsapp',
      status: 'novo',
      whatsapp_status: 'respondido',
    })
    .select()
    .single();
  if (error) throw error;
  return created;
}

// Pega historico recente da conversa (ultimas N mensagens) pro contexto do LLM
export async function getRecentMessages(phone, limit = 12) {
  const { data, error } = await supabase
    .from('whatsapp_messages')
    .select('direction, body, created_at')
    .eq('phone', phone)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data || []).reverse(); // ordem cronologica pro LLM
}
