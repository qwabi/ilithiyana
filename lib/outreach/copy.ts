import { brand, contact, onboardingStartPath, packages, positioning } from '@/lib/site-config';
import { canonicalUrl, siteDescription } from '@/lib/seo';

export type OutreachContactStatus =
  | 'new'
  | 'contacted'
  | 'replied'
  | 'not_interested';

export const outreachStatusLabels: Record<OutreachContactStatus, string> = {
  new: 'New',
  contacted: 'Contacted',
  replied: 'Replied',
  not_interested: 'Not interested',
};

/** Snapshot of public offer copy for admin outreach drafts. */
export const outreachOfferSummary = {
  brandName: brand.name,
  tagline: brand.tagline,
  siteUrl: brand.siteUrl,
  applyUrl: canonicalUrl(onboardingStartPath),
  whatsapp: contact.whatsapp,
  contactEmail: contact.email,
  ratio: positioning.ratio,
  pricing: {
    perLesson: packages.find((p) => p.id === 'package-b')?.price ?? 'R175/lesson',
    monthly: packages.find((p) => p.id === 'package-a')?.price ?? 'R1,000/month',
  },
  description: siteDescription,
} as const;

export type OutreachEmailTemplateId = 'cold_parent' | 'warm_intro_ask';

export type OutreachEmailTemplate = {
  id: OutreachEmailTemplateId;
  label: string;
  description: string;
  subject: string;
  body: string;
};

function applyPlaceholders(
  text: string,
  vars: { firstName?: string; mutualName?: string }
): string {
  const first = vars.firstName?.trim() || 'there';
  const mutual = vars.mutualName?.trim() || '[mutual name]';
  return text
    .replaceAll('{{firstName}}', first)
    .replaceAll('{{mutualName}}', mutual);
}

const coldParentSubject =
  'Small-group online tutoring for Grades 6–12 (from R175/lesson)';

const coldParentBody = `Hi {{firstName}},

I'm reaching out from ${brand.name} — we offer online tutoring for Grades 6–12 in Mathematics, Sciences, Technology, and English (HL/FAL).

What makes us a bit different:
• Small groups only (${positioning.ratio}) so your child actually gets attention
• Pay per lesson from ${outreachOfferSummary.pricing.perLesson}, or ${outreachOfferSummary.pricing.monthly} with career guidance included
• Sessions run online — times are agreed with your tutor around the school schedule

If you'd like to see whether it's a fit, you can apply here (takes a few minutes):
${outreachOfferSummary.applyUrl}

Or reply to this email / WhatsApp us if you prefer a quick chat first.

Kind regards,
${brand.name}
${contact.email}
${contact.phone}`;

const warmIntroSubject = `Quick intro? ${brand.name} tutoring for Grades 6–12`;

const warmIntroBody = `Hi {{mutualName}},

Hope you're well. I'm working on parent outreach for ${brand.name} (online tutoring, Grades 6–12, max 3 learners per tutor).

Would you be open to introducing me to a parent you think might benefit? Happy to send a short blurb you can forward.

Forwardable blurb:
---
${brand.name} offers small-group online tutoring for Grades 6–12 (${positioning.ratio}). Lessons from ${outreachOfferSummary.pricing.perLesson}; career guidance included. Apply: ${outreachOfferSummary.applyUrl}
---

No pressure if it's not your crowd — appreciate you either way.

Thanks,
[Your name]
${brand.name}`;

export function getOutreachEmailTemplates(vars?: {
  firstName?: string;
  mutualName?: string;
}): OutreachEmailTemplate[] {
  const v = vars ?? {};
  return [
    {
      id: 'cold_parent',
      label: 'Direct — parent',
      description: 'Cold email to a parent contact',
      subject: coldParentSubject,
      body: applyPlaceholders(coldParentBody, v),
    },
    {
      id: 'warm_intro_ask',
      label: 'Warm intro ask',
      description: 'Ask someone in your network to introduce you',
      subject: warmIntroSubject,
      body: applyPlaceholders(warmIntroBody, v),
    },
  ];
}
