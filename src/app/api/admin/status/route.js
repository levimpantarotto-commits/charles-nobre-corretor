import { NextResponse } from 'next/server';
import { isAuthenticated } from '@/lib/admin-auth';

export async function GET() {
  return NextResponse.json({ authenticated: await isAuthenticated() });
}
