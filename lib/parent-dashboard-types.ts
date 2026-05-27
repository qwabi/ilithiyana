import type {
  ApplicationRow,
  ClassRow,
  ClassSessionRow,
  LearnerRow,
  PackageRow,
  ParentRow,
  PaymentRow,
  ProfileRow,
  SubscriptionRow,
  TutorRow,
} from '@/lib/types/database';

export type DashboardSession = {
  profile: ProfileRow | null;
  parent: ParentRow;
  learners: LearnerRow[];
  applications: ApplicationRow[];
  subscriptions: (SubscriptionRow & { package?: PackageRow | null })[];
  payments: PaymentRow[];
  classes: (ClassRow & {
    tutors?: Pick<TutorRow, 'first_name' | 'last_name'> | null;
  })[];
  sessions: (ClassSessionRow & {
    classes?: ClassRow & {
      tutors?: Pick<TutorRow, 'first_name' | 'last_name'> | null;
    };
  })[];
  packages: PackageRow[];
  pendingReportConfirmations: {
    reportId: string;
    learnerId: string;
    learnerName: string;
    ocrStatus: string;
  }[];
};
