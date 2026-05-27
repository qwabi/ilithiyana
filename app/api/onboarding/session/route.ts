import { NextResponse } from 'next/server';
import { loadSessionForRequestHttp } from '@/lib/onboarding/api-auth';
import { isValidSessionId } from '@/lib/onboarding/sessions';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('id')?.trim() ?? '';

  if (!isValidSessionId(sessionId)) {
    return NextResponse.json({ error: 'Invalid session id' }, { status: 400 });
  }

  const loaded = await loadSessionForRequestHttp(sessionId);
  if (!loaded.ok) return loaded.response;

  return NextResponse.json({ session: loaded.session });
}
