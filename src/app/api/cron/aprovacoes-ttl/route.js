import { NextResponse } from 'next/server';
import { supabaseAdmin, hasServiceRole } from '@/lib/supabase-admin';

export async function POST(req) {
  try {
    const token = req.headers.get('x-cron-token');
    if (!token || token !== process.env.CRON_SECRET) {
      return NextResponse.json({ erro: 'Não autorizado' }, { status: 401 });
    }
    if (!hasServiceRole) {
      return NextResponse.json({ erro: 'SUPABASE_SERVICE_ROLE_KEY ausente' }, { status: 503 });
    }

    const agora = new Date().toISOString();

    const { data, error } = await supabaseAdmin
      .from('approvals')
      .update({ status: 'expirada', expirada_em: agora })
      .eq('status', 'pendente')
      .lt('expira_em', agora)
      .select('id');

    if (error) {
      console.error('Erro expirando aprovações:', error);
      return NextResponse.json({ erro: error.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, expiradas: (data || []).length });
  } catch (e) {
    console.error('Erro no cron/aprovacoes-ttl:', e);
    return NextResponse.json({ erro: e.message || String(e) }, { status: 500 });
  }
}
