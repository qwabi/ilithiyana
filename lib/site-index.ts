import { competitors } from '@/lib/competitors';

export type SiteIndexLink = {
  href: string;
  label: string;
  description?: string;
};

export type SiteIndexSection = {
  id: string;
  title: string;
  description?: string;
  links: SiteIndexLink[];
};

const competitorComparisonLinks: SiteIndexLink[] = competitors.flatMap((c) => [
  {
    href: `/alternatives/${c.slug}`,
    label: `Alternatives to ${c.name}`,
    description: `Honest guide for parents comparing ${c.name}`,
  },
  {
    href: `/vs/${c.slug}`,
    label: `Ilithiyana vs ${c.name}`,
    description: `Side-by-side comparison`,
  },
]);

/** Human-readable site map — keep in sync with app routes and scripts/generate-sitemap.mjs */
export const siteIndexSections: SiteIndexSection[] = [
  {
    id: 'main',
    title: 'Main site',
    description: 'Public pages for parents and learners.',
    links: [
      { href: '/', label: 'Home', description: 'Online CAPS tutoring overview' },
      { href: '/about', label: 'About', description: 'Founder, programme, and trust' },
      {
        href: '/apply-now',
        label: 'Apply Now',
        description: 'Enrolment application and PayFast checkout',
      },
      { href: '/contact', label: 'Contact', description: 'Email, phone, WhatsApp' },
      {
        href: '/career-guidance',
        label: 'Career Guidance',
        description: 'Weekly sessions included in every package',
      },
    ],
  },
  {
    id: 'resources',
    title: 'Resources & guides',
    links: [
      {
        href: '/resources/subject-choice',
        label: 'Free CAPS Subject Choice Checklist',
        description: 'Email signup for the parent checklist',
      },
      {
        href: '/resources/subject-choice/checklist',
        label: 'Subject choice checklist (printable)',
        description: 'View or print the full checklist',
      },
      {
        href: '/resources/subject-choice/thank-you',
        label: 'Checklist thank you',
        description: 'Shown after requesting the checklist',
      },
      {
        href: '/alternatives',
        label: 'Tutoring alternatives hub',
        description: 'Compare Ilithiyana with other SA options',
      },
      ...competitorComparisonLinks,
    ],
  },
  {
    id: 'legal',
    title: 'Policies',
    links: [
      { href: '/terms', label: 'Terms of Enrolment' },
      { href: '/privacy', label: 'Privacy Policy' },
    ],
  },
  {
    id: 'enrolment',
    title: 'Enrolment flow',
    description: 'Pages reached during or after applying.',
    links: [
      { href: '/apply-now', label: 'Start application' },
      {
        href: '/apply-now/success',
        label: 'Application success',
        description: 'After a successful submission',
      },
      {
        href: '/apply-now/complete',
        label: 'Application complete',
        description: 'Final step confirmation',
      },
      {
        href: '/apply-now/cancelled',
        label: 'Payment cancelled',
        description: 'If PayFast checkout is cancelled',
      },
      {
        href: '/payment/return',
        label: 'Payment return',
        description: 'PayFast redirect handler',
      },
      { href: '/welcome', label: 'Welcome', description: 'Post-enrolment welcome' },
    ],
  },
  {
    id: 'account',
    title: 'Parent dashboard',
    description: 'Sign in required — for enrolled families.',
    links: [
      { href: '/login', label: 'Login' },
      { href: '/dashboard', label: 'Dashboard home' },
      { href: '/dashboard/children', label: 'Children' },
      { href: '/dashboard/children/add', label: 'Add a child' },
      { href: '/dashboard/add-child', label: 'Add child (alternate route)' },
      { href: '/dashboard/subscriptions', label: 'Subscriptions' },
      { href: '/dashboard/reports', label: 'School reports' },
      {
        href: '/dashboard/reports/[learner_id]',
        label: 'Reports per learner',
        description: 'Replace [learner_id] with your child’s ID',
      },
      {
        href: '/dashboard/reports/[learner_id]/add',
        label: 'Add report for learner',
      },
      {
        href: '/dashboard/reports/[learner_id]/upload',
        label: 'Upload report',
      },
      {
        href: '/dashboard/reports/confirm/[report_id]',
        label: 'Confirm report OCR',
        description: 'Replace [report_id] after upload',
      },
      { href: '/dashboard/schedules', label: 'Class schedules' },
      {
        href: '/dashboard/schedules/[learner_id]',
        label: 'Schedule per learner',
      },
    ],
  },
  {
    id: 'portals',
    title: 'Other portals',
    description: 'Role-specific areas (access varies).',
    links: [
      { href: '/portal/parent', label: 'Parent portal' },
      { href: '/portal/tutor', label: 'Tutor portal' },
    ],
  },
  {
    id: 'admin',
    title: 'Admin',
    description: 'Staff only.',
    links: [
      { href: '/admin/login', label: 'Admin login' },
      { href: '/admin/dashboard', label: 'Admin dashboard' },
      { href: '/admin/dashboard/leads', label: 'Enrolment leads' },
      { href: '/admin/dashboard/applications', label: 'Applications' },
      { href: '/admin/dashboard/classes', label: 'Classes' },
      { href: '/admin/dashboard/subscriptions', label: 'Subscriptions' },
      { href: '/admin/dashboard/timesheets', label: 'Timesheets' },
      {
        href: '/admin/dashboard/submissions/contact',
        label: 'Contact submissions',
      },
      {
        href: '/admin/dashboard/submissions/academics',
        label: 'Academics submissions',
      },
    ],
  },
  {
    id: 'other',
    title: 'Other',
    links: [
      {
        href: '/about-developer',
        label: 'About developer (legacy)',
        description: 'Legacy page — not part of Academics marketing',
      },
      {
        href: '/sitemap.xml',
        label: 'XML sitemap (machines)',
        description: 'For search engines',
      },
    ],
  },
];

export const siteIndexPath = '/site-index' as const;
