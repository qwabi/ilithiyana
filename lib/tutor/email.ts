import { brand } from '@/lib/site-config';
import { emailLayout } from '@/lib/email/templates/layout';
import { sendEmail } from '@/lib/email';

function siteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || brand.siteUrl;
}

export function tutorApplicationReceivedEmail(opts: {
  tutorName: string;
}) {
  return {
    subject: `Application received — ${brand.name} tutor programme`,
    html: emailLayout({
      headline: 'Application received',
      bodyHtml: `<p>Dear ${opts.tutorName},</p>
<p>Thank you for applying to tutor with <strong>${brand.name}</strong>.</p>
<p>Our team will review your documents and qualifications. You will receive another email once vetting is complete — usually within <strong>3–5 working days</strong>.</p>
<p>You can check your application status anytime from your tutor portal.</p>`,
      ctaLabel: 'View application status',
      ctaHref: `${siteUrl()}/tutor/vetting`,
    }),
  };
}

export async function sendTutorApplicationReceivedEmail(opts: {
  to: string;
  tutorName: string;
}) {
  const tpl = tutorApplicationReceivedEmail({ tutorName: opts.tutorName });
  return sendEmail({ to: opts.to, subject: tpl.subject, html: tpl.html });
}
