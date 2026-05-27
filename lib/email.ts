import { Resend } from 'resend';
import { brand, contact } from '@/lib/site-config';

function getResend() {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  return new Resend(apiKey);
}

function fromAddress() {
  return (
    process.env.RESEND_FROM_EMAIL ??
    `${brand.name} <${contact.email}>`
  );
}

export function isEmailConfigured() {
  return Boolean(process.env.RESEND_API_KEY);
}

export async function sendEmail(opts: {
  to: string;
  subject: string;
  html: string;
}) {
  const resend = getResend();
  if (!resend) {
    console.warn('Resend not configured; skipping email:', opts.subject);
    return { ok: false as const, skipped: true };
  }

  const { data, error } = await resend.emails.send({
    from: fromAddress(),
    to: opts.to,
    subject: opts.subject,
    html: opts.html,
  });

  if (error) {
    console.error('Resend error:', error);
    return { ok: false as const, error: error.message };
  }

  return { ok: true as const, id: data?.id };
}

export async function sendSubjectChoiceChecklistEmail(opts: {
  to: string;
  firstName?: string;
}) {
  const { subjectChoiceChecklistEmail } = await import('@/lib/email/templates');
  const site =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || brand.siteUrl;
  const { leadMagnetChecklistUrl } = await import('@/lib/lead-magnets');

  const tpl = subjectChoiceChecklistEmail({
    firstName: opts.firstName,
    checklistUrl: leadMagnetChecklistUrl(site),
    applyUrl: `${site}/apply-now`,
  });

  return sendEmail({
    to: opts.to,
    subject: tpl.subject,
    html: tpl.html,
  });
}

export async function sendApplicationStatusEmail(opts: {
  to: string;
  parentName: string;
  learnerName: string;
  status: 'approved' | 'rejected';
  rejectionReason?: string;
}) {
  const {
    applicationApprovedEmail,
    applicationRejectedEmail,
  } = await import('@/lib/email/templates');

  const tpl =
    opts.status === 'approved'
      ? applicationApprovedEmail({
          parentName: opts.parentName,
          learnerName: opts.learnerName,
        })
      : applicationRejectedEmail({
          parentName: opts.parentName,
          learnerName: opts.learnerName,
          reason: opts.rejectionReason,
        });

  return sendEmail({ to: opts.to, subject: tpl.subject, html: tpl.html });
}

export async function sendSubscriptionReminderEmail(opts: {
  to: string;
  parentName: string;
  learnerName: string;
  packageName: string;
  amount: string;
  dueDate: string;
  payUrl?: string;
  overdue?: boolean;
}) {
  const { subscriptionReminderEmail } = await import('@/lib/email/templates');
  const site = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || brand.siteUrl;
  const tpl = subscriptionReminderEmail({
    parentName: opts.parentName,
    learnerName: opts.learnerName,
    packageName: opts.packageName,
    amount: opts.amount,
    dueDate: opts.dueDate,
    payUrl: opts.payUrl ?? `${site}/dashboard`,
    overdue: opts.overdue,
  });
  return sendEmail({ to: opts.to, subject: tpl.subject, html: tpl.html });
}

export async function sendTutorVettingEmail(opts: {
  to: string;
  tutorName: string;
  status: 'approved' | 'rejected';
  reason?: string;
}) {
  const {
    tutorVettingApprovedEmail,
    tutorVettingRejectedEmail,
  } = await import('@/lib/email/templates');
  const site =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || brand.siteUrl;

  const tpl =
    opts.status === 'approved'
      ? tutorVettingApprovedEmail({
          tutorName: opts.tutorName,
          portalUrl: `${site}/tutor/dashboard`,
        })
      : tutorVettingRejectedEmail({
          tutorName: opts.tutorName,
          reason: opts.reason,
        });

  return sendEmail({ to: opts.to, subject: tpl.subject, html: tpl.html });
}

export async function sendTimesheetStatusEmail(opts: {
  to: string;
  tutorName: string;
  monthPeriod: string;
  status: 'approved' | 'rejected';
  amountCents?: number;
  notes?: string;
}) {
  const { timesheetApprovedEmail, timesheetRejectedEmail } = await import(
    '@/lib/email/templates'
  );
  const amount =
    opts.amountCents != null
      ? `R${(opts.amountCents / 100).toFixed(2)}`
      : '';

  const tpl =
    opts.status === 'approved'
      ? timesheetApprovedEmail({
          tutorName: opts.tutorName,
          monthPeriod: opts.monthPeriod,
          amount,
        })
      : timesheetRejectedEmail({
          tutorName: opts.tutorName,
          monthPeriod: opts.monthPeriod,
          notes: opts.notes,
        });

  return sendEmail({ to: opts.to, subject: tpl.subject, html: tpl.html });
}

export async function sendTutorApplicationReceivedEmail(opts: {
  to: string;
  tutorName: string;
}) {
  const { tutorApplicationReceivedEmail } = await import('@/lib/email/templates');
  const tpl = tutorApplicationReceivedEmail({ tutorName: opts.tutorName });
  return sendEmail({ to: opts.to, subject: tpl.subject, html: tpl.html });
}
