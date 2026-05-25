import type { Metadata } from 'next';
import { ChecklistDocument } from '@/app/components/lead-magnet/ChecklistDocument';
import { pageMetadata } from '@/lib/seo';
import { SUBJECT_CHOICE_MAGNET } from '@/lib/lead-magnets';

export const metadata: Metadata = pageMetadata({
  title: 'CAPS Subject Choice Checklist (Printable)',
  description:
    'Printable CAPS subject choice checklist for Grades 8–12 — FET planning, Pure Maths pathways, and South African career resources.',
  path: SUBJECT_CHOICE_MAGNET.checklistPath,
});

export default function SubjectChoiceChecklistPage() {
  return (
    <div className='bg-white'>
      <ChecklistDocument />
    </div>
  );
}
