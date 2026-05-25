/** E-E-A-T copy: testimonials, FAQs, programme details. Update testimonials with real parent permission only. */

export const founder = {
  name: 'Masande Dudula',
  title: 'Founder',
  foundedYear: 2020,
  image: '/Masande.jpg',
  paragraphs: [
    'Masande Dudula founded Ilithiyana Academics in 2020 to give South African learners access to consistent, high-quality online tutoring without the friction of PDF forms and scattered WhatsApp threads.',
    'He leads tutor allocation, parent communication, and the career guidance programme. His focus is practical operations: small groups, clear schedules, and systems that scale as enrolment grows across all nine provinces.',
    'Ilithiyana operates as a registered South African company. Masande works directly with families during onboarding and keeps the programme affordable while maintaining structured academic support.',
  ],
} as const;

/** Add entries only with written parent/guardian permission. Section hidden when empty. */
export const testimonials: {
  quote: string;
  attribution: string;
  province?: string;
  grade?: string;
}[] = [];

export const parentExperience = [
  {
    title: '30-minute onboarding',
    description:
      'Every new family receives a guided onboarding call: how Google Meet classes work, how to access session links, and what to expect in the first month.',
  },
  {
    title: 'Term progress reports',
    description:
      'Tutors provide term reports showing where your child improved, where they still struggle, and what to focus on next term — so progress is visible, not guessed.',
  },
  {
    title: 'Agreed weekly schedule',
    description:
      'Session days and times are set with your tutor around the school calendar. Package A includes eight lesson hours per month in small groups (1:3).',
  },
  {
    title: 'Career guidance included',
    description:
      'Weekly Monday career sessions cover university applications, subject choices, bursaries, and life-after-school planning — included in your subscription, not an add-on.',
  },
] as const;

export const subjectDetails = [
  {
    name: 'Pure Maths',
    grades: 'Grades 6–12',
    summary:
      'Build confidence in algebra, functions, trigonometry, and exam technique. Ideal for learners falling behind in class or preparing for mid-year and final exams.',
  },
  {
    name: 'Physical Science',
    grades: 'Grades 10–12',
    summary:
      'Support for Physics and Chemistry concepts on the CAPS FET curriculum — problem-solving, past-paper style practice, and understanding theory step by step.',
  },
  {
    name: 'Natural Sciences',
    grades: 'Grades 6–9',
    summary:
      'Foundation-phase and senior-phase science before learners specialise — helps bridge primary school science into high school Physical Science and Life Sciences.',
  },
  {
    name: 'Life Sciences',
    grades: 'Grades 10–12',
    summary:
      'Focused help on CAPS Life Sciences content, terminology, and exam readiness for learners aiming to improve marks or secure university entrance requirements.',
  },
  {
    name: 'English',
    grades: 'Grades 6–12',
    summary:
      'Reading, writing, comprehension, and literature skills — supports learners who need clearer expression and stronger results in English Home Language or First Additional Language contexts.',
  },
] as const;

export const subjectsNotOffered = [
  'Accounting',
  'Geography',
  'History',
  'CAT',
  'Afrikaans',
  'Business Studies',
] as const;

export const careerGuidance = {
  intro:
    'Career guidance is built into every Ilithiyana Academics subscription. Sessions run weekly on Mondays and help learners connect school work to real next steps.',
  topics: [
    'University and college applications (CAO, institutional requirements)',
    'Choosing subjects for Grades 10–12 and FET pathways',
    'Bursaries, NSFAS, and financial aid awareness',
    'Trades, TVET, and alternatives to traditional university routes',
    'Study skills and planning for exam seasons',
  ],
  resources: [
    {
      label: 'Department of Higher Education & Training',
      href: 'https://www.dhet.gov.za/',
    },
    {
      label: 'NSFAS (student funding)',
      href: 'https://www.nsfas.org.za/',
    },
    {
      label: 'Careers Portal (SA)',
      href: 'https://www.careersportal.co.za/',
    },
  ],
} as const;

export const faqs = [
  {
    question: 'How much does tutoring cost?',
    answer:
      'Package A is R1,000 per month for eight hours of lessons plus career guidance. Package B is R175 per lesson for exam-focused support, with career guidance included.',
  },
  {
    question: 'Is this one-on-one tutoring?',
    answer:
      'Sessions are small groups with a maximum of three learners per tutor (1:3). Your child is heard every session — it is not a large classroom.',
  },
  {
    question: 'Can we join from outside Gauteng?',
    answer:
      'Yes. Classes are fully online on Google Meet. Families across all nine provinces can apply, as long as you have a device and internet.',
  },
  {
    question: 'Which subjects do you offer?',
    answer:
      'Pure Maths, Physical Science, Natural Sciences, Life Sciences, and English for Grades 6–12. We do not offer Accounting, Geography, History, Afrikaans, CAT, or Business Studies.',
  },
  {
    question: 'R1,000 per month feels expensive — what am I getting?',
    answer:
      'You receive eight hours of small-group tutoring plus weekly career guidance. At roughly R250 per hour, private one-on-one tutoring would cost about R2,000 for the same hours — without career support or a managed programme.',
  },
  {
    question: 'We have never done online classes. How does it work?',
    answer:
      'After you apply and pay, your family gets a 30-minute onboarding session. We walk you through Google Meet, session links, the 1:3 group format, and how to reach us between lessons.',
  },
  {
    question: 'Can we pause or stop during school holidays?',
    answer:
      'Package A is billed monthly. You can pause when tutoring is not needed — there is no full-year lock-in. Speak to us before your billing date if your schedule changes.',
  },
  {
    question: 'Do you support IEB or Cambridge?',
    answer:
      'Our programme is built for the CAPS curriculum (Grades 6–12). IEB and Cambridge families have different needs — contact us to discuss whether Ilithiyana is the right fit today.',
  },
  {
    question: 'How do I know my child is improving?',
    answer:
      'Tutors issue term reports with clear feedback on strengths, gaps, and focus areas for the next term. Parents can also discuss progress directly with the team via email, phone, or WhatsApp.',
  },
  {
    question: 'Are payments secure?',
    answer:
      'Yes. Enrolment payments are processed through PayFast, a trusted South African payment gateway. We do not store card details on our website.',
  },
] as const;

export const policyLastUpdated = '25 May 2026';
