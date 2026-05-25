import { brand } from '@/lib/site-config';
import { emailLayout } from '@/lib/email/layout';

function ctaButton(href: string, label: string): string {
  return `<p style="margin:24px 0 0;">
    <a href="${href}" style="display:inline-block;background:#0066cc;color:#ffffff;text-decoration:none;font-weight:600;padding:12px 24px;border-radius:999px;">${label}</a>
  </p>`;
}

export function subjectChoiceChecklistEmail(opts: {
  firstName?: string;
  checklistUrl: string;
  applyUrl: string;
}) {
  const greeting = opts.firstName
    ? `Hi ${opts.firstName},`
    : 'Hi there,';

  const body = `
    <p style="margin:0 0 16px;">${greeting}</p>
    <p style="margin:0 0 16px;">Thanks for requesting the <strong>CAPS Subject Choice Checklist</strong> from ${brand.name}.</p>
    <p style="margin:0 0 16px;">Use it before Grade 10 selection (and to review FET subjects) so your child’s package matches university, TVET, or career goals.</p>
    ${ctaButton(opts.checklistUrl, 'Open your checklist')}
    <p style="margin:24px 0 0;font-size:15px;color:#475569;">You can print or save the page as a PDF from your browser (Print → Save as PDF).</p>
    <p style="margin:24px 0 0;">When you are ready for small-group online tutoring with weekly career guidance included:</p>
    ${ctaButton(opts.applyUrl, 'Apply now')}
    <p style="margin:24px 0 0;font-size:14px;color:#64748b;">You received this because you signed up on our website. Reply to this email if you have questions — we do not share your address with third parties. See our privacy policy on ${brand.siteUrl}/privacy.</p>
  `;

  return {
    subject: `Your CAPS subject choice checklist — ${brand.name}`,
    html: emailLayout(body),
  };
}

export function applicationApprovedEmail(opts: {
  parentName: string;
  learnerName: string;
}) {
  const site =
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || brand.siteUrl;
  const body = `
    <p style="margin:0 0 16px;">Dear ${opts.parentName},</p>
    <p style="margin:0 0 16px;">${opts.learnerName}&apos;s application to ${brand.name} has been approved.</p>
    <p style="margin:0 0 16px;">We will be in touch with onboarding and class scheduling details.</p>
    ${ctaButton(`${site}/dashboard`, 'Parent dashboard')}
  `;
  return {
    subject: `Application approved — ${brand.name}`,
    html: emailLayout(body),
  };
}

export function applicationRejectedEmail(opts: {
  parentName: string;
  learnerName: string;
  reason?: string;
}) {
  const body = `
    <p style="margin:0 0 16px;">Dear ${opts.parentName},</p>
    <p style="margin:0 0 16px;">Thank you for applying to ${brand.name} for ${opts.learnerName}.</p>
    <p style="margin:0 0 16px;">We are unable to approve this application at this time.${opts.reason ? ` Reason: ${opts.reason}` : ''}</p>
    <p style="margin:0;">Please contact us if you have questions.</p>
  `;
  return {
    subject: `Application update — ${brand.name}`,
    html: emailLayout(body),
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
  const body = `
    <p style="margin:0 0 16px;">Dear ${opts.parentName},</p>
    <p style="margin:0 0 16px;">This is a ${opts.overdue ? 'overdue ' : ''}payment reminder for ${opts.learnerName}&apos;s ${opts.packageName} subscription.</p>
    <p style="margin:0 0 16px;"><strong>Amount:</strong> ${opts.amount}<br /><strong>Due:</strong> ${opts.dueDate}</p>
    ${ctaButton(opts.payUrl, 'View dashboard')}
  `;
  return {
    subject: `${opts.overdue ? 'Overdue: ' : ''}Subscription payment reminder — ${brand.name}`,
    html: emailLayout(body),
  };
}
