import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import {
  ADMIN_SESSION_COOKIE,
  verifyAdminSessionToken,
} from '@/lib/admin-session-token';
import { updateSession } from '@/lib/supabase/middleware';

const ONBOARDING_AUTH_REQUIRED_PREFIXES = [
  '/onboarding/setup',
  '/onboarding/reports',
  '/onboarding/complete',
] as const;

const TUTOR_PUBLIC_PATHS = ['/tutor/login', '/tutor/signup'] as const;

function requiresOnboardingAuth(pathname: string): boolean {
  return ONBOARDING_AUTH_REQUIRED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

function isTutorPublicPath(pathname: string): boolean {
  return TUTOR_PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`)
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const adminToken = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  const isAdminAuthed = Boolean(
    adminToken && (await verifyAdminSessionToken(adminToken))
  );

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

  if (pathname.startsWith('/tutor')) {
    if (isTutorPublicPath(pathname)) {
      const { supabaseResponse, user } = await updateSession(request);
      if (user) {
        return NextResponse.redirect(new URL('/tutor', request.url));
      }
      return supabaseResponse;
    }

    const { supabaseResponse, user } = await updateSession(request);
    if (!user) {
      const loginUrl = new URL('/tutor/login', request.url);
      loginUrl.searchParams.set('from', pathname);
      return NextResponse.redirect(loginUrl);
    }
    return supabaseResponse;
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

  if (requiresOnboardingAuth(pathname)) {
    const { supabaseResponse, user } = await updateSession(request);
    if (!user) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('from', pathname);
      return NextResponse.redirect(loginUrl);
    }
    return supabaseResponse;
  }

  if (pathname.startsWith('/onboarding')) {
    return updateSession(request).then(({ supabaseResponse }) => supabaseResponse);
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
    '/admin/:path*',
    '/admin/dashboard/:path*',
    '/admin/login',
    '/tutor/:path*',
    '/dashboard/:path*',
    '/login',
    '/apply-now/complete',
    '/auth/callback',
    '/onboarding/:path*',
  ],
};
