import { NextResponse } from 'next/server';
import { supabaseAdmin, hasServiceRole } from '@/lib/supabase-admin';
import { isAuthenticated } from '@/lib/admin-auth';
import { logActivity } from '@/lib/activity-log';

const VALID_DECISIONS = new Set(['approved', 'rejected']);

export async function PATCH(request, { params }) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  if (!hasServiceRole) return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY ausente' }, { status: 503 });

  const { id } = await params;
  let body; try { body = await request.json(); } catch { return NextResponse.json({ error: 'Payload inválido' }, { status: 400 }); }

  if (!VALID_DECISIONS.has(body.decision)) {
    return NextResponse.json({ error: 'decision deve ser approved ou rejected' }, { status: 400 });
  }

  const patch = {
    status: body.decision,
    decided_by: body.decided_by || 'admin',
    decided_at: new Date().toISOString(),
  };

  const { data, error } = await supabaseAdmin.from('approvals').update(patch).eq('id', id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  logActivity({
    message: `Aprovação ${body.decision === 'approved' ? 'aprovada' : 'rejeitada'}: ${data.action}`,
    context: { id, agent: data.agent, decision: body.decision },
  });
  return NextResponse.json(data);
}
