export type ApplicationStatus = 'pending' | 'approved' | 'rejected';
export type OcrStatus = 'pending' | 'processing' | 'complete' | 'failed';
export type AllocationStatus =
  | 'pending_report'
  | 'pending_confirmation'
  | 'allocating'
  | 'enrolled'
  | 'waitlisted'
  | 'manual';
export type ClassBand = 'A' | 'B' | 'C' | 'D';
export type LevelChangeSeverity = 'watch' | 'urgent' | 'positive';
export type SubscriptionStatus =
  | 'paid'
  | 'active'
  | 'pending'
  | 'overdue'
  | 'cancelled';
export type PreferredContactMethod = 'email' | 'whatsapp';
export type EnrollmentLeadType = 'initial' | 'add_child';
export type OnboardingStep =
  | 'account'
  | 'children'
  | 'payment'
  | 'setup'
  | 'reports'
  | 'complete';
export type OnboardingPaymentStatus = 'pending' | 'complete' | 'cancelled';
export type LearnerStatus = 'active' | 'paused' | 'inactive';
export type TimesheetStatus = 'draft' | 'submitted' | 'approved' | 'rejected';
export type TutorVettingStatus = 'pending' | 'approved' | 'rejected';
export type TutorDocumentType =
  | 'id_document'
  | 'qualification'
  | 'cv'
  | 'police_clearance'
  | 'other';
export type PaymentStatus = 'pending' | 'complete' | 'failed' | 'cancelled';
export type EnrollmentLeadStatus =
  | 'awaiting_payment'
  | 'paid'
  | 'cancelled'
  | 'failed';
export type UserRole = 'admin' | 'parent' | 'tutor' | 'learner';

export interface ProspectiveLeadRow {
  id: string;
  email: string;
  first_name: string | null;
  source: string;
  magnet_slug: string;
  resend_message_id: string | null;
  email_sent_at: string | null;
  created_at: string;
}

export interface ProfileRow {
  id: string;
  role: UserRole;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  province: string | null;
  preferred_contact: PreferredContactMethod | null;
  created_at: string;
}

export interface ParentRow {
  id: string;
  profile_id: string | null;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  address: string | null;
  province: string;
  preferred_contact: PreferredContactMethod | null;
  created_at: string;
}

export interface LearnerRow {
  id: string;
  parent_id: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  school_name: string;
  grade: number;
  level: string | null;
  /** Curriculum subject ids — see `lib/curriculum/subjects.ts`. */
  subjects: string[];
  status: LearnerStatus;
  created_at: string;
}

export interface ApplicationRow {
  id: string;
  parent_id: string | null;
  learner_id: string | null;
  status: ApplicationStatus;
  allocation_status?: AllocationStatus | null;
  province: string;
  subjects: string[];
  package_id: string;
  schedule: ApplicationSchedule;
  report_url: string | null;
  report_storage_path: string | null;
  payment_proof_url: string | null;
  parent_snapshot: ParentSnapshot;
  learner_snapshot: LearnerSnapshot;
  created_at: string;
  updated_at: string;
}

export interface ApplicationSchedule {
  availableDays?: Record<string, boolean>;
  timeSlots?: Record<string, { start: string; end: string }>;
  [key: string]: unknown;
}

export interface ParentSnapshot extends Record<string, unknown> {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address?: string;
}

export interface LearnerSnapshot extends Record<string, unknown> {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  schoolName: string;
  grade: number;
  level?: string;
}

export interface ApplicationWithRelations extends ApplicationRow {
  parents: ParentRow | null;
  learners: LearnerRow | null;
}

export interface SubscriptionRow {
  id: string;
  learner_id: string;
  parent_id: string | null;
  package_id: string;
  status: SubscriptionStatus;
  amount_cents: number;
  period_start: string | null;
  period_end: string | null;
  billing_date: string | null;
  next_billing_date: string | null;
  payfast_token: string | null;
  cycles_completed: number;
  next_reminder_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionWithLearner extends SubscriptionRow {
  learners: Pick<
    LearnerRow,
    'id' | 'first_name' | 'last_name' | 'grade' | 'school_name'
  > | null;
}

export interface TutorRow {
  id: string;
  profile_id: string | null;
  first_name: string;
  last_name: string;
  email: string;
  subjects: string[];
  session_rate_cents: number;
  created_at: string;
}

export interface TutorProfileRow {
  id: string;
  tutor_id: string;
  phone: string | null;
  id_number: string | null;
  bio: string | null;
  province: string | null;
  grades_taught: number[];
  vetting_status: TutorVettingStatus;
  vetting_notes: string | null;
  reviewed_at: string | null;
  reviewed_by: string | null;
  onboarding_complete: boolean;
  created_at: string;
  updated_at: string;
}

export interface TutorDocumentRow {
  id: string;
  tutor_id: string;
  document_type: TutorDocumentType;
  storage_path: string;
  file_name: string | null;
  uploaded_at: string;
}

export interface TimesheetSessionRow {
  id: string;
  timesheet_id: string;
  session_date: string;
  learner_id: string | null;
  class_id: string | null;
  subject: string | null;
  duration_minutes: number;
  notes: string | null;
  created_at: string;
}

export interface AdminProfileRow {
  id: string;
  full_name: string | null;
  email: string;
  is_active: boolean;
  created_at: string;
}

export interface TutorWithProfileRow extends TutorRow {
  tutor_profiles: TutorProfileRow | null;
}

export interface TutorTimesheetWithSessions extends TutorTimesheetRow {
  timesheet_sessions: TimesheetSessionRow[];
}

export interface TutorTimesheetRow {
  id: string;
  tutor_id: string;
  month_period: string;
  sessions_count: number;
  amount_cents: number;
  status: TimesheetStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface TutorTimesheetWithTutor extends TutorTimesheetRow {
  tutors: Pick<TutorRow, 'id' | 'first_name' | 'last_name' | 'email'> | null;
}

export interface PaymentRow {
  id: string;
  subscription_id: string | null;
  application_id: string | null;
  parent_id: string | null;
  learner_id: string | null;
  gateway_ref: string | null;
  payfast_payment_id: string | null;
  amount_cents: number;
  status: PaymentStatus;
  paid_at: string | null;
  itn_payload: Record<string, unknown> | null;
  created_at: string;
}

export interface ClassRow {
  id: string;
  learner_id: string | null;
  tutor_id: string | null;
  subject: string;
  grade: number;
  level: string | null;
  band?: ClassBand | null;
  subject_code?: string | null;
  max_enrollment?: number;
  class_label?: string | null;
  schedule: string | null;
  meet_link: string | null;
  is_active?: boolean;
  created_at: string;
}

export interface LearnerReportRow {
  id: string;
  learner_id: string;
  application_id: string | null;
  uploaded_by: string | null;
  file_url: string | null;
  file_type: string;
  term: string;
  academic_year: number;
  ocr_status: OcrStatus;
  ocr_raw_text: string | null;
  ocr_completed_at: string | null;
  confirmed: boolean;
  confirmed_at: string | null;
  confirmed_by: string | null;
  uploaded_at: string;
  notes: string | null;
}

export interface ReportExtractionRow {
  id: string;
  report_id: string;
  subject_name_raw: string;
  subject_name_clean: string | null;
  percentage: number | null;
  level: number | null;
  band: ClassBand | null;
  term: string | null;
  confidence: number | null;
  needs_review: boolean;
  is_offered: boolean;
  parent_corrected: boolean;
  original_percentage: number | null;
  created_at: string;
}

export interface LearnerSubjectLevelRow {
  id: string;
  learner_id: string;
  subject: string;
  level: number;
  band: ClassBand;
  percentage: number | null;
  term: string;
  academic_year: number;
  source_report_id: string | null;
  confirmed_at: string;
  created_at: string;
}

export interface ContactMessageRow {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  message: string;
  created_at: string;
}

export interface PackageRow {
  id: string;
  name: string;
  description: string;
  price_cents: number;
  billing_type: 'recurring' | 'once_off';
  sessions_per_month: number | null;
  career_guidance_hours: number;
  max_subjects: number;
  is_active: boolean;
}

export interface ClassSessionRow {
  id: string;
  class_id: string;
  scheduled_at: string;
  happened: boolean;
  cancelled: boolean;
  notes: string | null;
}

export interface EnrollmentLeadRow {
  id: string;
  status: EnrollmentLeadStatus;
  lead_type: EnrollmentLeadType;
  parent_id: string | null;
  preferred_contact: PreferredContactMethod | null;
  learner_level: string | null;
  proof_url: string | null;
  parent_first_name: string;
  parent_last_name: string;
  parent_email: string;
  parent_phone: string;
  parent_address: string | null;
  province: string;
  learner_first_name: string;
  learner_last_name: string;
  learner_date_of_birth: string;
  learner_school_name: string;
  learner_grade: number;
  subjects: string[];
  package_id: string;
  schedule: ApplicationSchedule;
  report_url: string | null;
  report_storage_path: string | null;
  amount_cents: number;
  payfast_payment_id: string | null;
  converted_parent_id: string | null;
  converted_application_id: string | null;
  created_at: string;
  paid_at: string | null;
}

export type EnrollmentLeadFilters = {
  status?: EnrollmentLeadStatus | '';
  province?: string;
  package_id?: string;
};

/** Filters for admin application list (Wave 1 CRM). */
export interface ApplicationFilters {
  status?: ApplicationStatus;
  province?: string;
  grade?: number;
  subject?: string;
  packageId?: string;
  fromDate?: string;
  toDate?: string;
  limit?: number;
  offset?: number;
}

export interface SubscriptionFilters {
  status?: SubscriptionStatus;
  packageId?: string;
  learnerId?: string;
  limit?: number;
  offset?: number;
}

export interface TimesheetFilters {
  status?: TimesheetStatus;
  tutorId?: string;
  monthPeriod?: string;
  limit?: number;
  offset?: number;
}

/** RPC `submit_application` arguments (snake_case for supabase-js). */
export interface SubmitApplicationRpcArgs {
  p_parent: ParentSnapshot;
  p_learner: LearnerSnapshot;
  p_province: string;
  p_subjects: string[];
  p_package_id: string;
  p_schedule: ApplicationSchedule;
  p_report_url?: string | null;
  p_payment_proof_url?: string | null;
}

/** RPC `submit_contact_message` arguments. */
export interface SubmitContactMessageRpcArgs {
  p_name: string;
  p_email: string;
  p_phone?: string | null;
  p_message: string;
}
