import { cookies } from 'next/headers';
import { createHmac, timingSafeEqual } from 'crypto';

const COOKIE_NAME = 'ilithiyana_admin_session';

function sign(value: string): string {
  const secret =
    process.env.ADMIN_SESSION_SECRET || 'dev-only-change-in-production';
  return createHmac('sha256', secret).update(value).digest('hex');
}

export async function setAdminSession() {
  const token = sign('admin');
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });
}

export async function clearAdminSession() {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function isAdminAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return false;
  const expected = sign('admin');
  try {
    return timingSafeEqual(Buffer.from(token), Buffer.from(expected));
  } catch {
    return false;
  }
}

export function verifyAdminCredentials(email: string, password: string) {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@ilithiyana.com';
  const adminPassword = process.env.ADMIN_PASSWORD || 'password123';
  return email === adminEmail && password === adminPassword;
}
