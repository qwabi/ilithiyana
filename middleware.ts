import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createHmac, timingSafeEqual } from 'crypto';
import { updateSession } from '@/lib/supabase/middleware';

const SESSION_COOKIE = 'ilithiyana_admin_session';

function verifySessionToken(token: string): boolean {
  const secret = process.env.ADMIN_SESSION_SECRET || 'dev-secret-change-me';
  const parts = token.split('.');
  if (parts.length !== 2) return false;

  const [payloadB64, sig] = parts;
  let payload: string;
  try {
    payload = Buffer.from(payloadB64, 'base64url').toString('utf8');
  } catch {
    return false;
  }

  const expected = createHmac('sha256', secret).update(payload).digest('hex');

  try {
    const sigBuf = Buffer.from(sig, 'hex');
    const expectedBuf = Buffer.from(expected, 'hex');
    if (sigBuf.length !== expectedBuf.length) return false;
    if (!timingSafeEqual(sigBuf, expectedBuf)) return false;
  } catch {
    return false;
  }

  const [, expiresStr] = payload.split(':');
  const expires = Number(expiresStr);
  if (!expires || Date.now() > expires) return false;

  return true;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const adminToken = request.cookies.get(SESSION_COOKIE)?.value;
  const isAdminAuthed = Boolean(adminToken && verifySessionToken(adminToken));

  if (pathname.startsWith('/admin/dashboard')) {
    if (!isAdminAuthed) {
      const loginUrl = new URL('/admin/login', request.url);
      loginUrl.searchParams.set('from', pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  if (pathname === '/admin/login' && isAdminAuthed) {
    return NextResponse.redirect(new URL('/admin/dashboard', request.url));
  }

  if (pathname.startsWith('/dashboard')) {
    const { supabaseResponse, user } = await updateSession(request);
    if (!user) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('from', pathname);
      return NextResponse.redirect(loginUrl);
    }
    return supabaseResponse;
  }

  if (pathname === '/login') {
    return updateSession(request).then(({ supabaseResponse }) => supabaseResponse);
  }

  if (
    pathname.startsWith('/apply-now/complete') ||
    pathname.startsWith('/auth/callback')
  ) {
    return updateSession(request).then(({ supabaseResponse }) => supabaseResponse);
  }

  const { supabaseResponse } = await updateSession(request);
  return supabaseResponse;
}

export const config = {
  matcher: [
    '/admin/dashboard/:path*',
    '/admin/login',
    '/dashboard/:path*',
    '/login',
    '/apply-now/complete',
    '/auth/callback',
  ],
};
