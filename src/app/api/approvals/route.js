import { NextResponse } from 'next/server';
import { supabaseAdmin, hasServiceRole } from '@/lib/supabase-admin';
import { isAuthenticated } from '@/lib/admin-auth';

export async function GET(request) {
  if (!(await isAuthenticated())) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  if (!hasServiceRole) return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY ausente' }, { status: 503 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') || 'pending';

  const { data, error } = await supabaseAdmin
    .from('approvals')
    .select('*')
    .eq('status', status)
    .order('created_at', { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}
