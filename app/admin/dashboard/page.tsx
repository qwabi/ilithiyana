import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  GraduationCap,
  Users,
  UserCheck,
  Clock,
  CreditCard,
  Banknote,
  UserPlus,
} from 'lucide-react';
import { AdminShell } from '@/app/components/admin/AdminShell';
import { getDashboardKpis } from '@/app/actions/admin-actions';

const adminCard =
  'h-full rounded-xl border-[0.5px] border-border bg-white shadow-sm transition-shadow hover:shadow-md';

function formatZar(cents: number) {
  return `R ${(cents / 100).toLocaleString('en-ZA', { minimumFractionDigits: 2 })}`;
}

export default async function AdminDashboard() {
  const kpis = await getDashboardKpis();

  const cards = [
    {
      name: 'Active learners',
      value: kpis.activeLearners,
      description: 'Enrolled and active',
      icon: Users,
      href: '/admin/dashboard/learners',
    },
    {
      name: 'Pending applications',
      value: kpis.pendingApplications,
      description: 'Awaiting review',
      icon: GraduationCap,
      href: '/admin/dashboard/applications',
    },
    {
      name: 'Tutors awaiting vetting',
      value: kpis.tutorsAwaitingVetting,
      description: 'Pending review — see all tutors',
      icon: UserCheck,
      href: '/admin/dashboard/tutors',
    },
    {
      name: 'Pending timesheets',
      value: kpis.pendingTimesheets,
      description: 'Submitted, not approved',
      icon: Clock,
      href: '/admin/dashboard/timesheets',
    },
    {
      name: 'Overdue subscriptions',
      value: kpis.overdueSubscriptions,
      description: 'Billing follow-up',
      icon: CreditCard,
      href: '/admin/dashboard/subscriptions',
    },
    {
      name: 'Revenue (30 days)',
      value: formatZar(kpis.revenueCents30d),
      description: 'Completed payments',
      icon: Banknote,
      href: '/admin/dashboard/payments',
    },
    {
      name: 'Prospective parents',
      value: kpis.awaitingPaymentLeads,
      description: 'Awaiting payment',
      icon: UserPlus,
      href: '/admin/dashboard/leads',
    },
  ];

  return (
    <AdminShell
      title='Admin dashboard'
      description='Ilithiyana Academics — operations overview and quick links.'
    >
      <div className='grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'>
        {cards.map((type) => (
          <Link key={type.name} href={type.href}>
            <Card className={adminCard}>
              <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                <CardTitle className='text-sm font-semibold text-foreground'>
                  {type.name}
                </CardTitle>
                <type.icon className='h-4 w-4 text-primary' />
              </CardHeader>
              <CardContent>
                <div className='text-2xl font-bold text-foreground'>
                  {type.value}
                </div>
                <p className='text-xs text-muted-foreground'>{type.description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </AdminShell>
  );
}
