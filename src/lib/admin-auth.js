import { cookies } from 'next/headers';

export const ADMIN_COOKIE = 'charles_admin_session';

function timingSafeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

export function verifyCredentials(email, pass) {
  const accounts = [
    { email: process.env.ADMIN_LEVI_EMAIL, pass: process.env.ADMIN_LEVI_PASS },
    { email: process.env.ADMIN_CHARLES_EMAIL, pass: process.env.ADMIN_CHARLES_PASS },
  ].filter((a) => a.email && a.pass);

  return accounts.some(
    (a) => timingSafeEqual(email, a.email) && timingSafeEqual(pass, a.pass)
  );
}

export async function isAuthenticated() {
  const token = process.env.ADMIN_SESSION_TOKEN;
  if (!token) return false;
  const store = await cookies();
  const cookie = store.get(ADMIN_COOKIE);
  return Boolean(cookie?.value) && timingSafeEqual(cookie.value, token);
}
