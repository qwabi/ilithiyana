import { NextResponse } from 'next/server';
import { listTimesheetsWithSessions } from '@/app/actions/timesheets';
import { authorizeAdminRequest } from '@/lib/admin-api-auth';
import type { TimesheetFilters } from '@/lib/types/database';

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
  const filters: TimesheetFilters = {
    status: (url.searchParams.get('status') as TimesheetFilters['status']) || undefined,
    tutorId: url.searchParams.get('tutorId') || undefined,
    monthPeriod: url.searchParams.get('monthPeriod') || undefined,
    limit: 5000,
    offset: 0,
  };

  const { data, error } = await listTimesheetsWithSessions(filters);
  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  const rows = data.map((row) => {
    const tutor = row.tutors as {
      first_name: string;
      last_name: string;
      email: string;
    } | null;
    return {
      id: row.id,
      month_period: row.month_period,
      status: row.status,
      sessions_count: row.sessions_count,
      amount_cents: row.amount_cents,
      tutor_name: tutor ? `${tutor.first_name} ${tutor.last_name}` : '',
      tutor_email: tutor?.email ?? '',
      submitted_at: row.submitted_at ?? row.created_at,
    };
  });

  const format = url.searchParams.get('format') ?? 'csv';
  if (format === 'json') {
    return NextResponse.json({ rows });
  }

  return new NextResponse(toCsv(rows), {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="timesheets-export.csv"`,
    },
  });
}
