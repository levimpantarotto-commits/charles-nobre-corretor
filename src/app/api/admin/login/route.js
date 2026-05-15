import { NextResponse } from 'next/server';
import { ADMIN_COOKIE, verifyCredentials } from '@/lib/admin-auth';

export async function POST(request) {
  const token = process.env.ADMIN_SESSION_TOKEN;
  if (!token) {
    return NextResponse.json({ error: 'ADMIN_SESSION_TOKEN não configurado no servidor' }, { status: 500 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Payload inválido' }, { status: 400 });
  }

  const { email, pass } = body || {};
  if (!email || !pass) {
    return NextResponse.json({ error: 'Email e senha obrigatórios' }, { status: 400 });
  }

  if (!verifyCredentials(email, pass)) {
    return NextResponse.json({ error: 'Credenciais inválidas' }, { status: 401 });
  }

  const res = NextResponse.json({ success: true });
  res.cookies.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 dias
  });
  return res;
}
