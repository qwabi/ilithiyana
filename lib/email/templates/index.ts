import { brand, contact } from '@/lib/site-config';
import { emailLayout } from '@/lib/email/templates/layout';

const siteUrl =
  () =>
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || brand.siteUrl;

export function subjectChoiceChecklistEmail(opts: {
  firstName?: string;
  checklistUrl: string;
  applyUrl: string;
}) {
  const greeting = opts.firstName ? `Hi ${opts.firstName},` : 'Hi there,';
  return {
    subject: `Your CAPS subject choice checklist — ${brand.name}`,
    html: emailLayout({
      headline: 'Your subject choice checklist',
      bodyHtml: `<p>${greeting}</p>
<p>Thanks for requesting the <strong>CAPS Subject Choice Checklist</strong> from ${brand.name}.</p>
<p>Use it before Grade 10 selection (and to review FET subjects) so your child&apos;s package matches university, TVET, or career goals.</p>
<p style="margin:24px 0 0;font-size:15px;color:#475569;">You can print or save the page as a PDF from your browser (Print → Save as PDF).</p>
<p style="margin:24px 0 0;">When you are ready for small-group online tutoring with weekly career guidance included, <a href="${opts.applyUrl}" style="color:#0066cc;font-weight:600;">apply now</a>.</p>
<p style="margin:24px 0 0;font-size:14px;color:#64748b;">You received this because you signed up on our website. Reply to this email if you have questions. See our privacy policy on ${siteUrl()}/privacy.</p>`,
      ctaLabel: 'Open your checklist',
      ctaHref: opts.checklistUrl,
    }),
  };
}

export function welcomeSetPasswordEmail(opts: {
  parentName: string;
  inviteLink: string | null;
}) {
  const linkBlock = opts.inviteLink
    ? `<p>Use the button below to set your password and sign in to your parent dashboard.</p>`
    : `<p>Check your inbox for a separate invite from us to set your password. Then sign in at your dashboard.</p>`;

  return {
    subject: `Welcome to ${brand.name} — set up your account`,
    html: emailLayout({
      headline: `Welcome, ${opts.parentName}`,
      bodyHtml: `<p>Your payment was received and your parent account is ready.</p>${linkBlock}`,
      ctaLabel: opts.inviteLink ? 'Set password & sign in' : undefined,
      ctaHref: opts.inviteLink ?? undefined,
    }),
  };
}

export function applicationReceivedEmail(opts: {
  parentName: string;
  learnerName: string;
}) {
  return {
    subject: `Application received for ${opts.learnerName}`,
    html: emailLayout({
      headline: 'Application received',
      bodyHtml: `<p>Dear ${opts.parentName},</p>
<p>We have received your application and payment for <strong>${opts.learnerName}</strong>.</p>
<p>Our team will review the documents and assign classes within <strong>2–3 working days</strong>. You will receive another email once scheduling is confirmed.</p>`,
      ctaLabel: 'View dashboard',
      ctaHref: `${process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || brand.siteUrl}/dashboard`,
    }),
  };
}

export function paymentConfirmedEmail(opts: {
  parentName: string;
  amount: string;
  date: string;
}) {
  return {
    subject: `Payment confirmed — ${brand.name}`,
    html: emailLayout({
      headline: 'Payment confirmed',
      bodyHtml: `<p>Dear ${opts.parentName},</p>
<p>We confirmed your payment of <strong>${opts.amount}</strong> on ${opts.date}.</p>
<p>You can download receipts from your dashboard billing section.</p>`,
      ctaLabel: 'Open dashboard',
      ctaHref: `${process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || brand.siteUrl}/dashboard`,
    }),
  };
}

export function paymentFailedEmail(opts: {
  parentName: string;
  retryUrl: string;
}) {
  return {
    subject: `Payment failed — ${brand.name}`,
    html: emailLayout({
      headline: 'Payment could not be completed',
      bodyHtml: `<p>Dear ${opts.parentName},</p>
<p>Your recent payment attempt did not succeed. You can try again using the link below, or contact us for help.</p>`,
      ctaLabel: 'Try payment again',
      ctaHref: opts.retryUrl,
    }),
  };
}

export function subscriptionReminderEmail(opts: {
  parentName: string;
  learnerName: string;
  packageName: string;
  amount: string;
  dueDate: string;
  payUrl: string;
  overdue?: boolean;
}) {
  const headline = opts.overdue ? 'Subscription overdue' : 'Payment due in 3 days';
  return {
    subject: `${opts.overdue ? 'Overdue' : 'Reminder'}: ${opts.packageName} — ${brand.name}`,
    html: emailLayout({
      headline,
      bodyHtml: `<p>Dear ${opts.parentName},</p>
<p>${opts.overdue ? 'Your subscription is overdue.' : 'Your next payment is due soon.'} Package: <strong>${opts.packageName}</strong> for <strong>${opts.learnerName}</strong>.</p>
<p>Amount: <strong>${opts.amount}</strong> · Due: <strong>${opts.dueDate}</strong></p>`,
      ctaLabel: 'Pay now',
      ctaHref: opts.payUrl,
    }),
  };
}

export function childAddedEmail(opts: {
  parentName: string;
  learnerName: string;
}) {
  return {
    subject: `Learner added — ${opts.learnerName}`,
    html: emailLayout({
      headline: 'New learner on your account',
      bodyHtml: `<p>Dear ${opts.parentName},</p>
<p><strong>${opts.learnerName}</strong> has been added to your account. We are reviewing the application and will confirm class times shortly.</p>`,
      ctaLabel: 'View dashboard',
      ctaHref: `${process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || brand.siteUrl}/dashboard`,
    }),
  };
}

export function applicationApprovedEmail(opts: {
  parentName: string;
  learnerName: string;
  scheduleSummary?: string;
}) {
  const schedule = opts.scheduleSummary
    ? `<p><strong>Schedule:</strong><br/>${opts.scheduleSummary}</p>`
    : '';
  return {
    subject: `Application approved — ${opts.learnerName}`,
    html: emailLayout({
      headline: 'Application approved',
      bodyHtml: `<p>Dear ${opts.parentName},</p>
<p><strong>${opts.learnerName}</strong>'s application has been approved.</p>${schedule}`,
      ctaLabel: 'View schedule',
      ctaHref: `${process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || brand.siteUrl}/dashboard`,
    }),
  };
}

export function applicationRejectedEmail(opts: {
  parentName: string;
  learnerName: string;
  reason?: string;
}) {
  const reason = opts.reason
    ? `<p><strong>Reason:</strong> ${opts.reason}</p>`
    : '';
  return {
    subject: `Application update — ${opts.learnerName}`,
    html: emailLayout({
      headline: 'Application not approved',
      bodyHtml: `<p>Dear ${opts.parentName},</p>
<p>We were unable to approve the application for <strong>${opts.learnerName}</strong> at this time.</p>${reason}
<p>You may reapply or contact us to discuss alternatives.</p>`,
      ctaLabel: 'Apply again',
      ctaHref: `${process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || brand.siteUrl}/apply-now`,
    }),
  };
}

export function reportOcrCompleteEmail(opts: {
  parentName: string;
  learnerName: string;
  confirmUrl: string;
  ocrFailed?: boolean;
}) {
  const body = opts.ocrFailed
    ? `<p>Dear ${opts.parentName},</p>
<p>We received <strong>${opts.learnerName}</strong>'s school report but could not read it automatically.</p>
<p>Please enter their marks manually on the confirmation page.</p>`
    : `<p>Dear ${opts.parentName},</p>
<p>We have read <strong>${opts.learnerName}</strong>'s school report. Please review the extracted results and confirm they are correct.</p>`;

  return {
    subject: `Confirm ${opts.learnerName}'s school report results`,
    html: emailLayout({
      headline: opts.ocrFailed ? 'Enter report marks' : 'Confirm report results',
      bodyHtml: body,
      ctaLabel: 'Review results',
      ctaHref: opts.confirmUrl,
    }),
  };
}

export function reportUploadedEmail(opts: {
  parentName: string;
  learnerName: string;
  term: string;
  year: number;
}) {
  return {
    subject: `Report uploaded — ${opts.learnerName}`,
    html: emailLayout({
      headline: 'Report received',
      bodyHtml: `<p>Dear ${opts.parentName},</p>
<p>We received <strong>${opts.learnerName}</strong>'s report for ${opts.term} ${opts.year}. We will email you when the results are ready to confirm.</p>`,
      ctaLabel: 'View dashboard',
      ctaHref: `${process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || brand.siteUrl}/dashboard`,
    }),
  };
}

export function missingReportReminderEmail(opts: {
  parentName: string;
  learnerName: string;
  uploadUrl: string;
}) {
  return {
    subject: `Upload ${opts.learnerName}'s school report`,
    html: emailLayout({
      headline: 'School report needed',
      bodyHtml: `<p>Dear ${opts.parentName},</p>
<p>To place <strong>${opts.learnerName}</strong> in the right class, please upload their latest school report.</p>`,
      ctaLabel: 'Upload report',
      ctaHref: opts.uploadUrl,
    }),
  };
}

export function levelChangeAlertEmail(opts: {
  learnerName: string;
  subject: string;
  previousBand: string;
  newBand: string;
  severity: 'watch' | 'urgent' | 'positive';
  term: string;
  year: number;
}) {
  const headline =
    opts.severity === 'urgent'
      ? 'Urgent: significant level drop'
      : opts.severity === 'positive'
        ? 'Level improvement noted'
        : 'Level change to review';
  return {
    subject: `${headline} — ${opts.learnerName} (${opts.subject})`,
    html: emailLayout({
      headline,
      bodyHtml: `<p><strong>${opts.learnerName}</strong>'s ${opts.subject} band changed from <strong>${opts.previousBand}</strong> to <strong>${opts.newBand}</strong> (${opts.term} ${opts.year}).</p>
<p>Please review whether class allocation should be updated.</p>`,
    }),
  };
}

export function classAllocatedAdminEmail(opts: {
  learnerName: string;
  classLabel: string;
}) {
  return {
    subject: `Auto-allocated: ${opts.learnerName} → ${opts.classLabel}`,
    html: emailLayout({
      headline: 'Learner auto-allocated',
      bodyHtml: `<p><strong>${opts.learnerName}</strong> was auto-allocated to <strong>${opts.classLabel}</strong>.</p>`,
    }),
  };
}

export function classAllocatedParentEmail(opts: {
  parentName: string;
  learnerName: string;
  classLabel: string;
  dashboardUrl: string;
}) {
  return {
    subject: `Class placement — ${opts.learnerName}`,
    html: emailLayout({
      headline: 'Class placement confirmed',
      bodyHtml: `<p>Dear ${opts.parentName},</p>
<p><strong>${opts.learnerName}</strong> has been placed in <strong>${opts.classLabel}</strong>. Schedule details will follow within 24 hours.</p>`,
      ctaLabel: 'View dashboard',
      ctaHref: opts.dashboardUrl,
    }),
  };
}

export function classWaitlistAdminEmail(opts: {
  learnerName: string;
  classLabel: string;
}) {
  return {
    subject: `Class needed: ${opts.learnerName} — ${opts.classLabel}`,
    html: emailLayout({
      headline: 'Learner needs a class',
      bodyHtml: `<p><strong>${opts.learnerName}</strong> needs a class: <strong>${opts.classLabel}</strong> (full or not yet created).</p>`,
    }),
  };
}

export function classWaitlistParentEmail(opts: {
  parentName: string;
  learnerName: string;
  subject: string;
}) {
  return {
    subject: `Setting up ${opts.learnerName}'s ${opts.subject} class`,
    html: emailLayout({
      headline: 'Class setup in progress',
      bodyHtml: `<p>Dear ${opts.parentName},</p>
<p>We're setting up <strong>${opts.learnerName}</strong>'s <strong>${opts.subject}</strong> class. We'll confirm within 24 hours.</p>`,
    }),
  };
}

export function reportConfirmReminderEmail(opts: {
  parentName: string;
  learnerName: string;
  confirmUrl: string;
}) {
  return {
    subject: `Reminder: confirm ${opts.learnerName}'s report`,
    html: emailLayout({
      headline: 'Report confirmation pending',
      bodyHtml: `<p>Dear ${opts.parentName},</p>
<p>Please confirm the marks we extracted from <strong>${opts.learnerName}</strong>'s school report so we can finalise class placement.</p>`,
      ctaLabel: 'Confirm results',
      ctaHref: opts.confirmUrl,
    }),
  };
}

export function tutorApplicationReceivedEmail(opts: { tutorName: string }) {
  return {
    subject: `Tutor application received — ${brand.name}`,
    html: emailLayout({
      headline: 'Application received',
      bodyHtml: `<p>Dear ${opts.tutorName},</p>
<p>Thank you for applying to tutor with ${brand.name}. Our team will review your documents and respond within a few working days.</p>`,
    }),
  };
}

export function tutorVettingApprovedEmail(opts: {
  tutorName: string;
  portalUrl: string;
}) {
  return {
    subject: `You're approved to tutor — ${brand.name}`,
    html: emailLayout({
      headline: 'Application approved',
      bodyHtml: `<p>Dear ${opts.tutorName},</p>
<p>Your tutor application has been approved. Sign in to view your schedule and submit timesheets.</p>`,
      ctaLabel: 'Open tutor portal',
      ctaHref: opts.portalUrl,
    }),
  };
}

export function tutorVettingRejectedEmail(opts: {
  tutorName: string;
  reason?: string;
}) {
  const reason = opts.reason
    ? `<p><strong>Note:</strong> ${opts.reason}</p>`
    : '';
  return {
    subject: `Tutor application update — ${brand.name}`,
    html: emailLayout({
      headline: 'Application not approved',
      bodyHtml: `<p>Dear ${opts.tutorName},</p>
<p>We are unable to approve your tutor application at this time.</p>${reason}
<p>You may contact us at ${contact.email} if you have questions.</p>`,
    }),
  };
}

export function timesheetApprovedEmail(opts: {
  tutorName: string;
  monthPeriod: string;
  amount: string;
}) {
  return {
    subject: `Timesheet approved — ${opts.monthPeriod}`,
    html: emailLayout({
      headline: 'Timesheet approved',
      bodyHtml: `<p>Dear ${opts.tutorName},</p>
<p>Your timesheet for <strong>${opts.monthPeriod}</strong> was approved. Amount: <strong>${opts.amount}</strong>.</p>`,
    }),
  };
}

export function timesheetRejectedEmail(opts: {
  tutorName: string;
  monthPeriod: string;
  notes?: string;
}) {
  const notes = opts.notes ? `<p><strong>Notes:</strong> ${opts.notes}</p>` : '';
  return {
    subject: `Timesheet needs revision — ${opts.monthPeriod}`,
    html: emailLayout({
      headline: 'Timesheet not approved',
      bodyHtml: `<p>Dear ${opts.tutorName},</p>
<p>Your timesheet for <strong>${opts.monthPeriod}</strong> was not approved.</p>${notes}
<p>Please sign in to revise and resubmit.</p>`,
    }),
  };
}
