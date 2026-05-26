'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { StatusBadge } from '@/components/portal/StatusBadge';
import { formatSubjectLabels } from '@/lib/curriculum/learner-subjects';
import type {
  AdminTutorListRow,
  IncompleteTutorProspectRow,
} from '@/lib/tutor/actions';

const ALL = '__all__';

const statusFilterOptions: { value: string; label: string }[] = [
  { value: ALL, label: 'All statuses' },
  { value: 'pending', label: 'Pending vetting' },
  { value: 'documents_submitted', label: 'Documents submitted' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'suspended', label: 'Suspended' },
];

const adminCard = 'rounded-xl border-[0.5px] border-border bg-white shadow-sm';

function countByStatus(rows: AdminTutorListRow[]) {
  const counts: Record<string, number> = {};
  for (const row of rows) {
    counts[row.vetting_status] = (counts[row.vetting_status] ?? 0) + 1;
  }
  return counts;
}

export function TutorsAdminPanel({
  tutors,
  prospects,
  initialError,
}: {
  tutors: AdminTutorListRow[];
  prospects: IncompleteTutorProspectRow[];
  initialError?: string;
}) {
  const [statusFilter, setStatusFilter] = useState<string>(ALL);

  const statusCounts = useMemo(() => countByStatus(tutors), [tutors]);

  const filtered = useMemo(() => {
    if (statusFilter === ALL) return tutors;
    return tutors.filter((t) => t.vetting_status === statusFilter);
  }, [tutors, statusFilter]);

  const awaitingVetting =
    (statusCounts.pending ?? 0) + (statusCounts.documents_submitted ?? 0);

  if (initialError) {
    return <p className='text-sm text-destructive'>{initialError}</p>;
  }

  return (
    <div className='space-y-8'>
      <div className='flex flex-wrap gap-3 text-sm'>
        <span className='rounded-full bg-muted px-3 py-1'>
          {tutors.length} registered
        </span>
        <span className='rounded-full bg-amber-100 px-3 py-1 text-amber-900'>
          {awaitingVetting} awaiting vetting
        </span>
        <span className='rounded-full bg-emerald-100 px-3 py-1 text-emerald-900'>
          {statusCounts.approved ?? 0} approved
        </span>
        <span className='rounded-full bg-muted px-3 py-1'>
          {prospects.length} incomplete signup
        </span>
      </div>

      <div className='flex flex-wrap items-center gap-3'>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className='h-10 w-[220px] rounded-lg border border-input bg-white text-sm'>
            <SelectValue placeholder='Filter by status' />
          </SelectTrigger>
          <SelectContent>
            {statusFilterOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {statusFilter !== ALL ? (
          <button
            type='button'
            className='text-sm text-primary hover:underline'
            onClick={() => setStatusFilter(ALL)}
          >
            Clear filter
          </button>
        ) : null}
      </div>

      <div className='overflow-hidden rounded-xl border border-border bg-white shadow-sm'>
        <table className='w-full text-left text-sm'>
          <thead className='border-b bg-muted/50'>
            <tr>
              <th className='px-4 py-3 font-medium'>Tutor</th>
              <th className='px-4 py-3 font-medium'>Status</th>
              <th className='px-4 py-3 font-medium'>Province</th>
              <th className='px-4 py-3 font-medium'>Subjects</th>
              <th className='px-4 py-3 font-medium'>Applied</th>
              <th className='px-4 py-3 font-medium'>Onboarding</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className='px-4 py-10 text-center text-muted-foreground'
                >
                  No tutors match this filter.
                </td>
              </tr>
            ) : (
              filtered.map((tutor) => (
                <tr
                  key={tutor.id}
                  className='border-b last:border-0 hover:bg-muted/30'
                >
                  <td className='px-4 py-3'>
                    <Link
                      href={`/admin/dashboard/tutors/${tutor.id}`}
                      className='font-medium text-foreground hover:text-primary'
                    >
                      {tutor.first_name} {tutor.last_name}
                    </Link>
                    <p className='text-xs text-muted-foreground'>{tutor.email}</p>
                  </td>
                  <td className='px-4 py-3'>
                    <StatusBadge status={tutor.vetting_status} />
                  </td>
                  <td className='px-4 py-3 text-muted-foreground'>
                    {tutor.province ?? '—'}
                  </td>
                  <td className='px-4 py-3 text-muted-foreground'>
                    {formatSubjectLabels(tutor.subjects, 3).join(', ') || '—'}
                  </td>
                  <td className='px-4 py-3 text-muted-foreground'>
                    {tutor.applied_at
                      ? format(new Date(tutor.applied_at), 'dd MMM yyyy')
                      : '—'}
                  </td>
                  <td className='px-4 py-3'>
                    {tutor.vetting_status === 'approved' ? (
                      tutor.onboarding_complete ? (
                        <span className='text-emerald-700'>Complete</span>
                      ) : (
                        <span className='text-amber-700'>Pending</span>
                      )
                    ) : (
                      <span className='text-muted-foreground'>—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {prospects.length > 0 ? (
        <Card className={adminCard}>
          <CardHeader>
            <CardTitle className='text-base'>Prospective tutors</CardTitle>
            <p className='text-sm text-muted-foreground'>
              Started tutor signup (auth account exists) but have not completed
              registration. They will appear in the table above once signup
              finishes.
            </p>
          </CardHeader>
          <CardContent className='overflow-x-auto p-0 pb-2'>
            <table className='w-full text-left text-sm'>
              <thead className='border-b bg-muted/30'>
                <tr>
                  <th className='px-4 py-3 font-medium'>Name</th>
                  <th className='px-4 py-3 font-medium'>Email</th>
                  <th className='px-4 py-3 font-medium'>Province</th>
                  <th className='px-4 py-3 font-medium'>Started</th>
                </tr>
              </thead>
              <tbody>
                {prospects.map((p) => (
                  <tr key={p.profile_id} className='border-b last:border-0'>
                    <td className='px-4 py-3'>{p.full_name ?? '—'}</td>
                    <td className='px-4 py-3 text-muted-foreground'>
                      {p.email ?? '—'}
                    </td>
                    <td className='px-4 py-3 text-muted-foreground'>
                      {p.province ?? '—'}
                    </td>
                    <td className='px-4 py-3 text-muted-foreground'>
                      {format(new Date(p.created_at), 'dd MMM yyyy')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
