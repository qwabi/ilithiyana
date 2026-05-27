'use client';

import { useCallback, useState, useTransition } from 'react';
import { format } from 'date-fns';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import {
  formatSubjectLabels,
  resolveLearnerSubjectIds,
} from '@/lib/curriculum/learner-subjects';
import { packages, provinces } from '@/lib/site-config';
import type {
  EnrollmentLeadRow,
  EnrollmentLeadStatus,
} from '@/lib/types/database';
import {
  getEnrollmentLeadReportViewUrl,
  listEnrollmentLeads,
  type EnrollmentLeadFilters,
} from '@/app/actions/admin-actions';

const ALL = '__all__';

const statusOptions: {
  value: EnrollmentLeadStatus | typeof ALL;
  label: string;
}[] = [
  { value: ALL, label: 'All statuses' },
  { value: 'awaiting_payment', label: 'Awaiting payment' },
  { value: 'paid', label: 'Paid' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'failed', label: 'Failed' },
];

const adminCard = 'rounded-xl border-[0.5px] border-border bg-white shadow-sm';
const filterTrigger =
  'h-10 w-[180px] rounded-lg border border-input bg-white text-sm';

function statusBadge(status: EnrollmentLeadStatus) {
  const styles: Record<EnrollmentLeadStatus, string> = {
    awaiting_payment: 'bg-amber-50 text-amber-900 border-amber-200',
    paid: 'bg-emerald-50 text-emerald-900 border-emerald-200',
    cancelled: 'bg-slate-50 text-slate-700 border-slate-200',
    failed: 'bg-red-50 text-red-900 border-red-200',
  };
  const labels: Record<EnrollmentLeadStatus, string> = {
    awaiting_payment: 'Awaiting payment',
    paid: 'Paid',
    cancelled: 'Cancelled',
    failed: 'Failed',
  };
  return (
    <span
      className={cn(
        'inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium',
        styles[status]
      )}
    >
      {labels[status]}
    </span>
  );
}

function packageLabel(packageId: string) {
  return packages.find((p) => p.id === packageId)?.name ?? packageId;
}

function formatCents(cents: number) {
  return `R${(cents / 100).toFixed(2)}`;
}

interface EnrollmentLeadsTableProps {
  initialLeads: EnrollmentLeadRow[];
  initialError?: string;
}

export function EnrollmentLeadsTable({
  initialLeads,
  initialError,
}: EnrollmentLeadsTableProps) {
  const [leads, setLeads] = useState<EnrollmentLeadRow[]>(initialLeads);
  const [error, setError] = useState(initialError ?? null);
  const [filters, setFilters] = useState<EnrollmentLeadFilters>({});
  const [isPending, startTransition] = useTransition();
  const [openingReportId, setOpeningReportId] = useState<string | null>(null);

  const openReport = useCallback(async (leadId: string) => {
    setOpeningReportId(leadId);
    try {
      const result = await getEnrollmentLeadReportViewUrl(leadId);
      if (result.url) {
        window.open(result.url, '_blank', 'noopener,noreferrer');
      } else {
        setError(result.error ?? 'Could not open school report.');
      }
    } finally {
      setOpeningReportId(null);
    }
  }, []);

  const applyFilters = useCallback((next: EnrollmentLeadFilters) => {
    startTransition(async () => {
      const result = await listEnrollmentLeads(next);
      setLeads(result.data);
      setError(result.error ?? null);
      setFilters(next);
    });
  }, []);

  return (
    <div className='space-y-6'>
      <div className='flex flex-wrap gap-3'>
        <Select
          value={filters.status || ALL}
          onValueChange={(v) =>
            applyFilters({
              ...filters,
              status: v === ALL ? '' : (v as EnrollmentLeadStatus),
            })
          }
        >
          <SelectTrigger className={filterTrigger}>
            <SelectValue placeholder='Status' />
          </SelectTrigger>
          <SelectContent>
            {statusOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.province || ALL}
          onValueChange={(v) =>
            applyFilters({
              ...filters,
              province: v === ALL ? undefined : v,
            })
          }
        >
          <SelectTrigger className={filterTrigger}>
            <SelectValue placeholder='Province' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All provinces</SelectItem>
            {provinces.map((p) => (
              <SelectItem key={p} value={p}>
                {p}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error && (
        <p className='text-sm text-destructive' role='alert'>
          {error}
        </p>
      )}

      {isPending && (
        <p className='text-sm text-muted-foreground'>Loading leads…</p>
      )}

      <div className='grid gap-4'>
        {leads.length === 0 ? (
          <Card className={adminCard}>
            <CardContent className='py-10 text-center text-muted-foreground'>
              No enrolment leads match your filters.
            </CardContent>
          </Card>
        ) : (
          leads.map((lead) => (
            <Card key={lead.id} className={adminCard}>
              <CardHeader className='flex flex-row flex-wrap items-start justify-between gap-2 pb-2'>
                <div>
                  <CardTitle className='text-base font-semibold'>
                    {[lead.parent_first_name, lead.parent_last_name]
                      .filter(Boolean)
                      .join(' ')}
                  </CardTitle>
                  <p className='text-sm text-muted-foreground'>
                    Learner:{' '}
                    {[lead.learner_first_name, lead.learner_last_name].join(
                      ' '
                    )}{' '}
                    · Grade {lead.learner_grade}
                  </p>
                </div>
                {statusBadge(lead.status)}
              </CardHeader>
              <CardContent className='space-y-2 text-sm'>
                <p>
                  <span className='text-muted-foreground'>Email:</span>{' '}
                  {lead.parent_email}
                </p>
                <p>
                  <span className='text-muted-foreground'>Phone:</span>{' '}
                  {lead.parent_phone}
                </p>
                <p>
                  <span className='text-muted-foreground'>Package:</span>{' '}
                  {packageLabel(lead.package_id)} ({formatCents(lead.amount_cents)})
                </p>
                <p>
                  <span className='text-muted-foreground'>Province:</span>{' '}
                  {lead.province}
                </p>
                <p>
                  <span className='text-muted-foreground'>Subjects:</span>{' '}
                  {formatSubjectLabels(
                    resolveLearnerSubjectIds(
                      lead.subjects ?? [],
                      lead.learner_grade
                    ),
                    lead.learner_grade
                  ).join(', ')}
                </p>
                <p className='text-xs text-muted-foreground'>
                  Created {format(new Date(lead.created_at), 'dd MMM yyyy HH:mm')}
                  {lead.paid_at &&
                    ` · Paid ${format(new Date(lead.paid_at), 'dd MMM yyyy HH:mm')}`}
                </p>
                {lead.converted_application_id && (
                  <p className='text-xs text-muted-foreground'>
                    Application ID: {lead.converted_application_id}
                  </p>
                )}
                {(lead.report_storage_path || lead.report_url) && (
                  <button
                    type='button'
                    onClick={() => openReport(lead.id)}
                    disabled={openingReportId === lead.id}
                    className='inline-block text-left text-primary underline disabled:opacity-50'
                  >
                    {openingReportId === lead.id
                      ? 'Opening report…'
                      : 'View school report'}
                  </button>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
