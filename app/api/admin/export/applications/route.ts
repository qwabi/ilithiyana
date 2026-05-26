import { NextResponse } from 'next/server';
import { exportApplications } from '@/app/actions/applications-admin';
import { authorizeAdminRequest } from '@/lib/admin-api-auth';
import type { ApplicationFilters } from '@/lib/types/database';

export const dynamic = 'force-dynamic';

function toCsv(rows: Record<string, string | number>[]): string {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const escape = (v: string | number) => {
    const s = String(v ?? '');
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };
  const lines = [
    headers.join(','),
    ...rows.map((row) => headers.map((h) => escape(row[h] ?? '')).join(',')),
  ];
  return lines.join('\n');
}

export async function GET(request: Request) {
  const auth = await authorizeAdminRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: auth.status });
  }

  const url = new URL(request.url);
  const filters: ApplicationFilters = {
    status: (url.searchParams.get('status') as ApplicationFilters['status']) || undefined,
    province: url.searchParams.get('province') || undefined,
    packageId: url.searchParams.get('packageId') || undefined,
    subject: url.searchParams.get('subject') || undefined,
    fromDate: url.searchParams.get('fromDate') || undefined,
    toDate: url.searchParams.get('toDate') || undefined,
  };

  const gradeParam = url.searchParams.get('grade');
  if (gradeParam) filters.grade = Number(gradeParam);

  const { rows, error } = await exportApplications(filters);
  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  const format = url.searchParams.get('format') ?? 'csv';
  if (format === 'json') {
    return NextResponse.json({ rows });
  }

  const csv = toCsv(rows);
  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="applications-export.csv"`,
    },
  });
}
