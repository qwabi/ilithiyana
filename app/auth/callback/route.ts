import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse, type NextRequest } from 'next/server';

/** OAuth / magic-link callback — exchanges code for session and ensures parent profile. */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  let next = searchParams.get('next') ?? '/dashboard';

  if (!next.startsWith('/')) {
    next = '/dashboard';
  }

  if (!code) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent('Missing auth code')}`
    );
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent('Auth is not configured')}`
    );
  }

  const cookieStore = cookies();
  const supabase = createServerClient(url, key, {
    cookies: {
      async getAll() {
        return (await cookieStore).getAll();
      },
      async setAll(cookiesToSet) {
        const store = await cookieStore;
        cookiesToSet.forEach(({ name, value, options }) =>
          store.set(name, value, options)
        );
      },
    },
  });

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(error.message)}`
    );
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    const meta = user.user_metadata as { full_name?: string } | undefined;
    const fullName =
      typeof meta?.full_name === 'string' && meta.full_name.trim()
        ? meta.full_name.trim()
        : user.email?.split('@')[0] ?? 'Parent';

    await supabase.from('profiles').upsert(
      {
        id: user.id,
        role: 'parent',
        email: user.email ?? '',
        full_name: fullName,
      },
      { onConflict: 'id' }
    );
  }

  return NextResponse.redirect(`${origin}${next}`);
}
