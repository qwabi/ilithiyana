import type { TutorDocumentType } from '@/lib/types/database';

export const TUTOR_DOCUMENTS_BUCKET = 'tutor-documents';

export const TUTOR_SIGNUP_DOCUMENTS: {
  type: TutorDocumentType;
  label: string;
  required: boolean;
}[] = [
  { type: 'id_document', label: 'ID document', required: true },
  { type: 'qualification', label: 'Highest qualification', required: true },
  { type: 'cv', label: 'CV / résumé', required: true },
  { type: 'police_clearance', label: 'Police clearance (if available)', required: false },
];
