import { brand, packages, positioning, subjects, grades } from '@/lib/site-config';
import type { ComparisonRow } from './types';

export const ilithiyanaProfile = {
  name: brand.name,
  model: 'Managed online programme',
  ratio: positioning.ratio,
  pricing: `${packages[0].price} (${packages[0].name}) or ${packages[1].price} (${packages[1].name})`,
  subjects: subjects.join(', '),
  grades: `Grades ${grades[0]}–${grades[grades.length - 1]}`,
  careerGuidance: 'Included weekly in every package',
  geography: 'All 9 provinces — fully online via Google Meet',
  registration: brand.registrationNumber,
  strengths: [
    'Max 3 learners per session — your child is heard every lesson',
    'Career guidance included (university, subjects, bursaries)',
    'Pure Maths, Physical Science, Life Sciences, Natural Sciences, English',
    'Tutor assigned; recurring schedule agreed with your family',
    'Registered Pty Ltd with onboarding for every new family',
  ],
  migrationSteps: [
    'Complete the online application with learner details, grade, and subjects',
    'Upload required documents and pay via PayFast',
    'Attend a 30-minute onboarding — how classes work and how to join Google Meet',
    'Your tutor and weekly slot are confirmed around the school timetable',
  ],
} as const;

export function buildComparisonRows(competitor: {
  name: string;
  model: string;
  pricingSummary: string;
  careerGuidance: string;
  managedProgramme: string;
  sciencesFocus: string;
  onlineNationwide: string;
}): ComparisonRow[] {
  return [
    {
      label: 'Model',
      ilithiyana: ilithiyanaProfile.model,
      competitor: competitor.model,
    },
    {
      label: 'Group size',
      ilithiyana: ilithiyanaProfile.ratio,
      competitor: 'Varies (often 1:1 on marketplaces)',
    },
    {
      label: 'Career guidance',
      ilithiyana: 'Included weekly',
      competitor: competitor.careerGuidance,
    },
    {
      label: 'Sciences + Maths',
      ilithiyana: 'Core offering (CAPS Gr 6–12)',
      competitor: competitor.sciencesFocus,
    },
    {
      label: 'Who runs the programme',
      ilithiyana: 'Ilithiyana assigns tutor & schedule',
      competitor: competitor.managedProgramme,
    },
    {
      label: 'Typical pricing',
      ilithiyana: ilithiyanaProfile.pricing,
      competitor: competitor.pricingSummary,
    },
    {
      label: 'Reach',
      ilithiyana: ilithiyanaProfile.geography,
      competitor: competitor.onlineNationwide,
    },
  ];
}

export const ratingLabels: Record<string, string> = {
  yes: 'Yes',
  no: 'No',
  partial: 'Partial',
  varies: 'Varies',
};

export function ratingToText(
  rating: 'yes' | 'no' | 'partial' | 'varies',
  labels?: { yes?: string; partial?: string; varies?: string },
): string {
  if (rating === 'yes') return labels?.yes ?? ratingLabels.yes;
  if (rating === 'no') return ratingLabels.no;
  if (rating === 'partial') return labels?.partial ?? ratingLabels.partial;
  return labels?.varies ?? ratingLabels.varies;
}
