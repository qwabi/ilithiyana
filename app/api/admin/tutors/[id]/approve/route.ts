import { NextResponse } from 'next/server';
import { updateTutorVettingStatus } from '@/app/actions/tutors';
import { authorizeAdminRequest } from '@/lib/admin-api-auth';

export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await authorizeAdminRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: auth.status });
  }

  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as {
    reviewedBy?: string;
  };

  const result = await updateTutorVettingStatus(id, 'approved', {
    reviewedBy: body.reviewedBy,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true, tutorId: id, status: 'approved' });
}
