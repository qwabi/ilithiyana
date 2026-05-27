import { NextResponse } from 'next/server';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import {
  createServerSupabaseClient,
  createServiceClient,
} from '@/lib/supabase/server';
import { formatCents } from '@/lib/parent-dashboard-utils';
import { brand } from '@/lib/site-config';

export const runtime = 'nodejs';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  const { paymentId } = await params;
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const service = createServiceClient();
  const { data: parent } = await service
    .from('parents')
    .select('id, first_name, last_name, email')
    .eq('profile_id', user.id)
    .maybeSingle();

  if (!parent) {
    return NextResponse.json({ error: 'Parent not found' }, { status: 404 });
  }

  let payment = (
    await service
      .from('payments')
      .select('*')
      .eq('id', paymentId)
      .eq('parent_id', parent.id)
      .maybeSingle()
  ).data;

  if (!payment) {
    const { data: candidate } = await service
      .from('payments')
      .select('*, learners ( parent_id )')
      .eq('id', paymentId)
      .maybeSingle();

    const learnerParent = (
      candidate?.learners as { parent_id: string } | null
    )?.parent_id;
    if (candidate && learnerParent === parent.id) {
      payment = candidate;
    }
  }

  if (!payment || payment.status !== 'complete') {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const pdf = await PDFDocument.create();
  const page = pdf.addPage([595, 420]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const blue = rgb(0, 0.25, 0.5);

  let y = 380;
  page.drawText(brand.name, { x: 50, y, size: 18, font: bold, color: blue });
  y -= 28;
  page.drawText('Payment receipt', { x: 50, y, size: 14, font: bold });
  y -= 24;
  page.drawText(`Receipt ID: ${payment.id}`, { x: 50, y, size: 10, font });
  y -= 16;
  page.drawText(`Billed to: ${parent.first_name} ${parent.last_name}`, {
    x: 50,
    y,
    size: 10,
    font,
  });
  y -= 16;
  page.drawText(
    `Date: ${new Date(payment.paid_at ?? payment.created_at).toLocaleString('en-ZA')}`,
    { x: 50, y, size: 10, font }
  );
  y -= 16;
  page.drawText(`Amount: ${formatCents(payment.amount_cents)}`, {
    x: 50,
    y,
    size: 12,
    font: bold,
  });
  y -= 16;
  if (payment.payfast_payment_id) {
    page.drawText(`PayFast ref: ${payment.payfast_payment_id}`, {
      x: 50,
      y,
      size: 10,
      font,
    });
  }

  const bytes = await pdf.save();

  return new NextResponse(Buffer.from(bytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="receipt-${payment.id.slice(0, 8)}.pdf"`,
    },
  });
}
