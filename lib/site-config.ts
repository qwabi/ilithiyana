/** Single source of truth for Ilithiyana Academics public copy and form options. */

export const brand = {
  name: 'Ilithiyana Academics',
  legalName: 'Ilithiyana (Pty) Ltd',
  registrationNumber: '2020/652431/07',
  siteUrl: 'https://ilithiyana.co.za',
  tagline: 'Online tutoring for Grades 6–12',
} as const;

export const contact = {
  email: 'info@ilithiyana.co.za',
  phone: '065 031 0714',
  phoneTel: '+27650310714',
  whatsapp: 'https://wa.me/27650310714',
} as const;

export const subjects = [
  'Pure Maths',
  'Natural Sciences',
  'Life Sciences',
  'English',
  'Physical Science',
] as const;

export type Subject = (typeof subjects)[number];

export const grades = [6, 7, 8, 9, 10, 11, 12] as const;

export const provinces = [
  'Eastern Cape',
  'Free State',
  'Gauteng',
  'KwaZulu-Natal',
  'Limpopo',
  'Mpumalanga',
  'Northern Cape',
  'North West',
  'Western Cape',
] as const;

export const packages = [
  {
    id: 'package-a',
    name: 'Package A',
    price: 'R1,000/month',
    amountCents: 100000,
    features: [
      'Eight (8) hours of lessons for any offered subject',
      'Four (4) hours of personalized career guidance',
    ],
  },
  {
    id: 'package-b',
    name: 'Package B',
    price: 'R175/lesson',
    amountCents: 17500,
    features: [
      'Pay per lesson — ideal for exam preparation',
      'Four (4) hours of personalized career guidance',
    ],
  },
] as const;

export const sessionInfo =
  '1 hour per session. Package A includes eight (8) lesson hours per month. Day and times are agreed with your tutor based on the school schedule.';

export const positioning = {
  ratio: '1 tutor : 3 learners',
  intake: 'Applications are open throughout the year.',
} as const;

/** Parent enrolment wizard entry (replaces legacy `/apply-now`). */
export const onboardingStartPath = '/onboarding/account' as const;

/** Parent dashboard sign-in (Supabase email + password). */
export const parentLoginPath = '/login' as const;

/** Tutor portal sign-up and sign-in. */
export const tutorSignupPath = '/tutor/signup' as const;
export const tutorLoginPath = '/tutor/login' as const;

/** Marketing page for prospective tutors. */
export const becomeTutorPath = '/become-a-tutor' as const;

export const navLinks = [
  { href: '/', label: 'Home' },
  { href: '/about', label: 'About' },
  { href: onboardingStartPath, label: 'Apply Now' },
  { href: '/contact', label: 'Contact' },
] as const;

export const footerSections = [
  {
    title: 'Explore',
    links: [
      { href: '/', label: 'Home' },
      { href: '/about', label: 'About' },
      { href: '/contact', label: 'Contact' },
    ],
  },
  {
    title: 'Enrol',
    links: [
      { href: onboardingStartPath, label: 'Apply Now' },
      { href: parentLoginPath, label: 'Log in' },
    ],
  },
  {
    title: 'Tutors',
    links: [
      { href: becomeTutorPath, label: 'Become a Tutor' },
      { href: tutorLoginPath, label: 'Tutor login' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { href: '/alternatives', label: 'Compare Tutoring Options' },
      { href: '/resources/subject-choice', label: 'Free Subject Checklist' },
      { href: '/career-guidance', label: 'Career Guidance' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { href: '/terms', label: 'Terms of Enrolment' },
      { href: '/privacy', label: 'Privacy Policy' },
      { href: '/site-index', label: 'Site Index' },
    ],
  },
] as const;
