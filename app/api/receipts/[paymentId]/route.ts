import { NextResponse } from 'next/server';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { formatCents } from '@/lib/parent-dashboard-utils';
import { brand } from '@/lib/site-config';

export const runtime = 'nodejs';

export async function GET(
  _request: Request,
  { params }: { params: { paymentId: string } }
) {
  const supabase = createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: payment, error } = await supabase
    .from('payments')
    .select('*')
    .eq('id', params.paymentId)
    .maybeSingle();

  if (error || !payment || payment.status !== 'complete') {
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
      'Content-Disposition': `attachment; filename="receipt-${payment.id.slice(0, 8)}.pdf"`,
    },
  });
}
