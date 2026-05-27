/** CAPS subject choice checklist — shared by landing page, printable view, and email. */

import { subjectsNotOffered } from '@/lib/trust-content';

export const checklistIntro =
  'Use this checklist before Grade 10 subject selection (and to review FET choices). It is built for the South African CAPS curriculum.';

export const gradePathways = [
  {
    grades: 'Grades 6–9',
    title: 'Foundation phase & senior phase',
    points: [
      'Natural Sciences in Grades 6–9 supports later Physical Science or Life Sciences in FET.',
      'Strong Pure Maths in senior phase makes Physical Science and many university paths easier.',
      'English skills affect every subject — address gaps early, not only in matric.',
    ],
  },
  {
    grades: 'Grade 10–12 (FET)',
    title: 'Choosing your FET package',
    points: [
      'Pure Maths + Physical Science is required for most engineering, medicine, and physical science degrees.',
      'Life Sciences pairs well with Pure Maths for health sciences — confirm university subject requirements.',
      'Check whether your target course needs Maths Literacy vs Pure Maths before you lock subjects.',
    ],
  },
] as const;

export const decisionChecklist = [
  'Download or print your child’s latest report card.',
  'List 2–3 possible paths after school (university, TVET, trade, gap year with a plan).',
  'Write down target courses or careers and look up their minimum subject requirements.',
  'Confirm the school’s recommended FET subject package with the Life Orientation or HOD teacher.',
  'Check that Pure Maths / Physical Science / Life Sciences align with those requirements.',
  'Book time to discuss subject choices with your child — not only the night before selection.',
  'If you need structured tutoring or career guidance, compare programmes that include both.',
] as const;

export const externalResources = [
  {
    label: 'Department of Higher Education & Training',
    href: 'https://www.dhet.gov.za/',
  },
  { label: 'NSFAS (student funding)', href: 'https://www.nsfas.org.za/' },
  {
    label: 'Careers Portal (South Africa)',
    href: 'https://www.careersportal.co.za/',
  },
] as const;

export const subjectsNotOfferedNote = `Ilithiyana Academics does not tutor: ${subjectsNotOffered.join(', ')}. Plan alternative support if your child needs those subjects.`;
