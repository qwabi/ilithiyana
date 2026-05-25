import { subjects as offeredSubjects } from '@/lib/site-config';

/** Maps OCR / report labels to site-config subject names and short codes. */
const NORMALIZE_MAP: Record<string, string> = {
  maths: 'Pure Maths',
  mathematics: 'Pure Maths',
  'pure maths': 'Pure Maths',
  'pure mathematics': 'Pure Maths',
  wiskunde: 'Pure Maths',
  'phys sci': 'Physical Science',
  'physical science': 'Physical Science',
  'physical sciences': 'Physical Science',
  'fisiese wetenskappe': 'Physical Science',
  'life sci': 'Life Sciences',
  'life science': 'Life Sciences',
  'life sciences': 'Life Sciences',
  lewenswetenskappe: 'Life Sciences',
  eng: 'English',
  'eng fal': 'English',
  'english hl': 'English',
  'english fal': 'English',
  english: 'English',
  'nat sci': 'Natural Sciences',
  'natural science': 'Natural Sciences',
  'natural sciences': 'Natural Sciences',
};

export const SUBJECT_CODES: Record<string, string> = {
  'Pure Maths': 'Maths',
  'Physical Science': 'PhySci',
  'Life Sciences': 'LifeSci',
  English: 'English',
  'Natural Sciences': 'NatSci',
};

export function normalizeSubjectName(raw: string): {
  clean: string;
  isOffered: boolean;
  subjectCode: string | null;
} {
  const key = raw.trim().toLowerCase();
  const clean = NORMALIZE_MAP[key] ?? raw.trim();
  const isOffered = (offeredSubjects as readonly string[]).includes(clean);
  const subjectCode = isOffered ? (SUBJECT_CODES[clean] ?? clean.replace(/\s+/g, '')) : null;
  return { clean, isOffered, subjectCode };
}

export function offeredSubjectOptions(): string[] {
  return [...offeredSubjects];
}
