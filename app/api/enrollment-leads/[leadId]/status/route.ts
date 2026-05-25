import { NextResponse } from 'next/server';
import { createServiceClient, isSupabaseConfigured } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

/** Public status check by lead UUID (short-lived, used after PayFast return). */
export async function GET(
  _request: Request,
  { params }: { params: { leadId: string } }
) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ error: 'Not configured' }, { status: 503 });
  }

  const supabase = createServiceClient();
  const { data: lead, error } = await supabase
    .from('enrollment_leads')
    .select('id, status, converted_application_id')
    .eq('id', params.leadId)
    .maybeSingle();

  if (error || !lead) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({
    leadId: lead.id,
    status: lead.status,
    paid: lead.status === 'paid',
    applicationId: lead.converted_application_id,
  });
}
