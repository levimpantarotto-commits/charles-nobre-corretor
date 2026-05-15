// Helper pra registrar atividade no banco. Best-effort, não falha em caller.
import { supabaseAdmin, hasServiceRole } from '@/lib/supabase-admin';

export async function logActivity({ agent = 'admin', level = 'info', message, context }) {
  if (!hasServiceRole) return;
  try {
    await supabaseAdmin.from('activity_log').insert({
      agent,
      level,
      message,
      context: context ?? null,
    });
  } catch (err) {
    console.warn('logActivity falhou:', err.message);
  }
}
