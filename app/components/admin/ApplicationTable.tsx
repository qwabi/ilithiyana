'use client';

import { useCallback, useState, useTransition } from 'react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  grades,
  packages,
  provinces,
  subjects,
} from '@/lib/site-config';
import type { ApplicationRow, ApplicationStatus } from '@/lib/types/database';
import {
  exportApplicationsCSV,
  getApplicationReportViewUrl,
  listApplications,
  updateApplicationStatus,
  type ApplicationFilters,
} from '@/app/actions/admin-actions';

const ALL = '__all__';

const statusOptions: { value: ApplicationStatus | typeof ALL; label: string }[] =
  [
    { value: ALL, label: 'All statuses' },
    { value: 'pending', label: 'Pending' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
  ];

const adminCard = 'rounded-xl border-[0.5px] border-border bg-white shadow-sm';
const filterTrigger =
  'h-10 w-[180px] rounded-lg border border-input bg-white text-sm';

function packageLabel(packageId: string) {
  return packages.find((p) => p.id === packageId)?.name ?? packageId;
}

function learnerName(app: ApplicationRow) {
  const l = app.learner_snapshot ?? {};
  return [l.firstName, l.lastName].filter(Boolean).join(' ') || '—';
}

function parentName(app: ApplicationRow) {
  const p = app.parent_snapshot ?? {};
  return [p.firstName, p.lastName].filter(Boolean).join(' ') || '—';
}

function learnerGrade(app: ApplicationRow) {
  const g = app.learner_snapshot?.grade;
  return g != null ? String(g) : '—';
}

interface ApplicationTableProps {
  initialApplications: ApplicationRow[];
  initialError?: string;
}

export function ApplicationTable({
  initialApplications,
  initialError,
}: ApplicationTableProps) {
  const [applications, setApplications] =
    useState<ApplicationRow[]>(initialApplications);
  const [error, setError] = useState(initialError ?? null);
  const [filters, setFilters] = useState<ApplicationFilters>({});
  const [isPending, startTransition] = useTransition();
  const [openingReportId, setOpeningReportId] = useState<string | null>(null);

  const openReport = useCallback(async (applicationId: string) => {
    setOpeningReportId(applicationId);
    try {
      const result = await getApplicationReportViewUrl(applicationId);
      if (result.url) {
        window.open(result.url, '_blank', 'noopener,noreferrer');
      } else {
        toast.error(result.error ?? 'Could not open school report.');
      }
    } finally {
      setOpeningReportId(null);
    }
  }, []);

  const applyFilters = useCallback((next: ApplicationFilters) => {
    startTransition(async () => {
      const result = await listApplications(next);
      setApplications(result.data);
      setError(result.error ?? null);
    });
  }, []);

  const setFilter = <K extends keyof ApplicationFilters>(
    key: K,
    value: ApplicationFilters[K]
  ) => {
    const next = { ...filters, [key]: value || undefined };
    setFilters(next);
    applyFilters(next);
  };

  const handleExport = async () => {
    const { csv, error: exportError } = await exportApplicationsCSV(filters);
    if (exportError || !csv) {
      toast.error(exportError ?? 'Nothing to export');
      return;
    }
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `applications-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success('CSV downloaded');
  };

  const handleStatus = async (id: string, status: 'approved' | 'rejected') => {
    const result = await updateApplicationStatus(id, status);
    if (!result.ok) {
      toast.error(result.error ?? 'Update failed');
      return;
    }
    toast.success(`Application ${status}`);
    applyFilters(filters);
  };

  return (
    <div className='space-y-6'>
      <div className='flex flex-wrap items-end gap-3 rounded-xl border-[0.5px] border-border bg-[hsl(var(--light-blue)/0.06)] p-4'>
        <FilterSelect
          label='Province'
          value={filters.province ?? ALL}
          onValueChange={(v) =>
            setFilter('province', v === ALL ? undefined : v)
          }
          options={[
            { value: ALL, label: 'All provinces' },
            ...provinces.map((p) => ({ value: p, label: p })),
          ]}
        />
        <FilterSelect
          label='Grade'
          value={filters.grade ?? ALL}
          onValueChange={(v) => setFilter('grade', v === ALL ? undefined : v)}
          options={[
            { value: ALL, label: 'All grades' },
            ...grades.map((g) => ({
              value: String(g),
              label: `Grade ${g}`,
            })),
          ]}
        />
        <FilterSelect
          label='Subject'
          value={filters.subject ?? ALL}
          onValueChange={(v) =>
            setFilter('subject', v === ALL ? undefined : v)
          }
          options={[
            { value: ALL, label: 'All subjects' },
            ...subjects.map((s) => ({ value: s, label: s })),
          ]}
        />
        <FilterSelect
          label='Package'
          value={filters.package_id ?? ALL}
          onValueChange={(v) =>
            setFilter('package_id', v === ALL ? undefined : v)
          }
          options={[
            { value: ALL, label: 'All packages' },
            ...packages.map((p) => ({ value: p.id, label: p.name })),
          ]}
        />
        <FilterSelect
          label='Status'
          value={filters.status ?? ALL}
          onValueChange={(v) =>
            setFilter(
              'status',
              v === ALL ? undefined : (v as ApplicationStatus)
            )
          }
          options={statusOptions.map((o) => ({
            value: o.value,
            label: o.label,
          }))}
        />
        <Button
          variant='outline'
          onClick={handleExport}
          disabled={isPending}
          className='h-10 border-[0.5px]'
        >
          Export CSV
        </Button>
      </div>

      {(error || initialError) && (
        <p className='text-sm text-destructive' role='alert'>
          {error ?? initialError}
        </p>
      )}

      {isPending && applications.length === 0 ? (
        <p className='text-sm text-muted-foreground'>Loading applications…</p>
      ) : null}

      {!isPending && applications.length === 0 ? (
        <p className='text-sm text-muted-foreground'>No applications found.</p>
      ) : null}

      <div className='grid gap-4'>
        {applications.map((app) => (
          <Card key={app.id} className={adminCard}>
            <CardHeader className='pb-2'>
              <div className='flex flex-wrap items-start justify-between gap-2'>
                <div>
                  <CardTitle className='text-lg font-semibold text-foreground'>
                    {learnerName(app)}
                  </CardTitle>
                  <p className='text-sm text-muted-foreground'>
                    Parent: {parentName(app)} · Grade {learnerGrade(app)} ·{' '}
                    {app.province}
                  </p>
                </div>
                <StatusBadge status={app.status} />
              </div>
              <p className='text-xs text-muted-foreground'>
                Applied {format(new Date(app.created_at), 'dd MMM yyyy HH:mm')}
              </p>
            </CardHeader>
            <CardContent className='space-y-3 text-sm'>
              <p>
                <span className='font-medium text-foreground'>Subjects:</span>{' '}
                {(app.subjects ?? []).join(', ') || '—'}
              </p>
              <p>
                <span className='font-medium text-foreground'>Package:</span>{' '}
                {packageLabel(app.package_id)}
              </p>
              <p>
                <span className='font-medium text-foreground'>Parent contact:</span>{' '}
                {String(app.parent_snapshot?.email ?? '—')}
                {app.parent_snapshot?.phone
                  ? ` · ${String(app.parent_snapshot.phone)}`
                  : ''}
              </p>
              <div className='flex flex-wrap gap-2'>
                {app.report_storage_path || app.report_url ? (
                  <Button
                    variant='ghost'
                    size='sm'
                    className='h-8'
                    type='button'
                    disabled={openingReportId === app.id}
                    onClick={() => openReport(app.id)}
                  >
                    {openingReportId === app.id
                      ? 'Opening…'
                      : 'School report'}
                  </Button>
                ) : null}
                {app.payment_proof_url ? (
                  <Button variant='ghost' size='sm' asChild className='h-8'>
                    <a
                      href={app.payment_proof_url}
                      target='_blank'
                      rel='noopener noreferrer'
                    >
                      Payment proof
                    </a>
                  </Button>
                ) : null}
              </div>
              {app.status === 'pending' ? (
                <div className='flex gap-2 border-t border-border/80 pt-3'>
                  <Button
                    size='sm'
                    className='bg-primary hover:bg-primary/90'
                    onClick={() => handleStatus(app.id, 'approved')}
                  >
                    Approve
                  </Button>
                  <Button
                    size='sm'
                    variant='ghost'
                    className='text-destructive hover:bg-destructive/10 hover:text-destructive'
                    onClick={() => handleStatus(app.id, 'rejected')}
                  >
                    Reject
                  </Button>
                </div>
              ) : null}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: ApplicationStatus }) {
  const styles =
    status === 'approved'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
      : status === 'rejected'
        ? 'border-red-200 bg-red-50 text-red-800'
        : 'border-amber-200 bg-amber-50 text-amber-800';

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium capitalize',
        styles
      )}
    >
      {status}
    </span>
  );
}

function FilterSelect({
  label,
  value,
  onValueChange,
  options,
}: {
  label: string;
  value: string;
  onValueChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className='space-y-1'>
      <span className='text-xs font-medium text-muted-foreground'>{label}</span>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger className={filterTrigger}>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((opt) => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
