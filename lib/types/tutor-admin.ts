import type { TimesheetStatus } from '@/lib/types/database';

export type TutorVettingStatus =
  | 'pending'
  | 'documents_submitted'
  | 'approved'
  | 'rejected'
  | 'suspended';

export type TutorDocumentType =
  | 'id_document'
  | 'qualification'
  | 'cv'
  | 'contract'
  | 'other';

export type TutorDocumentStatus = 'pending' | 'verified' | 'rejected';

export interface TutorProfileRow {
  tutor_id: string;
  vetting_status: TutorVettingStatus;
  bio: string | null;
  qualifications: string | null;
  phone: string | null;
  province: string | null;
  bank_account_holder: string | null;
  bank_name: string | null;
  bank_account_number: string | null;
  bank_branch_code: string | null;
  applied_at: string;
  vetted_at: string | null;
  vetted_by: string | null;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface TutorProfileWithTutor extends TutorProfileRow {
  tutors: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    subjects: string[];
    session_rate_cents: number;
    profile_id: string | null;
  } | null;
}

export interface TutorDocumentRow {
  id: string;
  tutor_id: string;
  document_type: TutorDocumentType;
  storage_path: string;
  file_name: string | null;
  mime_type: string | null;
  status: TutorDocumentStatus;
  notes: string | null;
  uploaded_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
}

export interface AdminProfileRow {
  profile_id: string;
  title: string | null;
  can_approve_tutors: boolean;
  can_approve_timesheets: boolean;
  can_manage_applications: boolean;
  can_manage_payments: boolean;
  created_at: string;
  updated_at: string;
}

export interface TimesheetSessionRow {
  id: string;
  timesheet_id: string;
  session_date: string;
  class_id: string | null;
  subject: string | null;
  learner_count: number;
  duration_minutes: number;
  amount_cents: number | null;
  notes: string | null;
  created_at: string;
}

export interface TimesheetWithSessions {
  id: string;
  tutor_id: string;
  month_period: string;
  period_start: string | null;
  period_end: string | null;
  sessions_count: number;
  amount_cents: number;
  status: TimesheetStatus;
  notes: string | null;
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
  tutors?: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
  } | null;
  timesheet_sessions?: TimesheetSessionRow[];
}

export interface TutorAdminFilters {
  vettingStatus?: TutorVettingStatus;
  limit?: number;
  offset?: number;
}
