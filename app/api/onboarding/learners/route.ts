import { NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/server';
import { isValidSessionId } from '@/lib/onboarding/sessions';
import { loadSessionForRequestHttp } from '@/lib/onboarding/api-auth';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('sessionId')?.trim() ?? '';

  if (!isValidSessionId(sessionId)) {
    return NextResponse.json({ error: 'Invalid session id' }, { status: 400 });
  }

  const loaded = await loadSessionForRequestHttp(sessionId);
  if (!loaded.ok) return loaded.response;

  const session = loaded.session;
  if (!session.learner_ids.length) {
    return NextResponse.json({ learners: [] });
  }

  const supabase = createServiceClient();
  const { data: learners, error } = await supabase
    .from('learners')
    .select('id, first_name, last_name, grade, school_name, subjects, date_of_birth')
    .in('id', session.learner_ids);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const ordered = session.learner_ids
    .map((id) => learners?.find((l) => l.id === id))
    .filter(Boolean);

  return NextResponse.json({ learners: ordered });
}
