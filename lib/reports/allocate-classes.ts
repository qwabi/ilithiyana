import { createServiceClient } from '@/lib/supabase/server';
import { enrollLearnerInSubjectBand } from '@/lib/class-enrollments';
import { buildClassLabel, type ClassBand } from '@/lib/reports/nsc';
import { SUBJECT_CODES } from '@/lib/reports/subjects';
import { sendEmail } from '@/lib/email';
import {
  classAllocatedAdminEmail,
  classAllocatedParentEmail,
  classWaitlistAdminEmail,
  classWaitlistParentEmail,
} from '@/lib/email/templates';
import { brand, contact } from '@/lib/site-config';

type ConfirmedLevel = {
  subject: string;
  level: number;
  band: ClassBand;
  percentage: number | null;
};

export async function allocateLearnerToClasses(opts: {
  learnerId: string;
  applicationId: string;
  grade: number;
  enrolledSubjects: string[];
  confirmedLevels: ConfirmedLevel[];
  parentEmail: string;
  parentName: string;
  learnerName: string;
}): Promise<{ enrolled: string[]; waitlisted: string[] }> {
  const supabase = createServiceClient();
  const enrolled: string[] = [];
  const waitlisted: string[] = [];
  const site = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') || brand.siteUrl;

  const levelBySubject = new Map(
    opts.confirmedLevels.map((l) => [l.subject, l])
  );

  for (const subject of opts.enrolledSubjects) {
    const levelRow = levelBySubject.get(subject);
    if (!levelRow) {
      waitlisted.push(subject);
      await supabase.from('class_waitlist').insert({
        learner_id: opts.learnerId,
        application_id: opts.applicationId,
        subject,
        grade: opts.grade,
        band: 'B',
        class_label: `${opts.grade}B-${SUBJECT_CODES[subject] ?? subject}`,
        notes: 'No confirmed level for subject',
      });
      continue;
    }

    const band = levelRow.band;
    const subjectCode = SUBJECT_CODES[subject] ?? subject.replace(/\s+/g, '');
    const classLabel = buildClassLabel(opts.grade, band, subjectCode);

    const { data: catalogClasses } = await supabase
      .from('classes')
      .select('id, max_enrollment, band, subject, grade')
      .is('learner_id', null)
      .eq('grade', opts.grade)
      .eq('band', band)
      .eq('subject', subject)
      .eq('is_active', true);

    let targetClassId: string | null = null;

    for (const cls of catalogClasses ?? []) {
      const { count } = await supabase
        .from('class_enrollments')
        .select('id', { count: 'exact', head: true })
        .eq('class_id', cls.id)
        .eq('status', 'active');

      const current = count ?? 0;
      const max = (cls.max_enrollment as number) ?? 3;
      if (current < max) {
        targetClassId = cls.id;
        break;
      }
    }

    if (!targetClassId) {
      try {
        const { data: learnerLevel } = await supabase
          .from('learners')
          .select('level')
          .eq('id', opts.learnerId)
          .maybeSingle();
        await enrollLearnerInSubjectBand(
          supabase,
          opts.learnerId,
          opts.grade,
          subject,
          band,
          (learnerLevel?.level as string | null) ?? null
        );
        enrolled.push(classLabel);
        continue;
      } catch (fallbackErr) {
        console.error('allocateLearnerToClasses fallback enroll:', fallbackErr);
      }

      waitlisted.push(subject);
      await supabase.from('class_waitlist').insert({
        learner_id: opts.learnerId,
        application_id: opts.applicationId,
        subject,
        grade: opts.grade,
        band,
        class_label: classLabel,
      });

      const adminTpl = classWaitlistAdminEmail({
        learnerName: opts.learnerName,
        classLabel,
      });
      await sendEmail({
        to: process.env.ADMIN_EMAIL ?? contact.email,
        subject: adminTpl.subject,
        html: adminTpl.html,
      }).catch(console.error);

      const parentTpl = classWaitlistParentEmail({
        parentName: opts.parentName,
        learnerName: opts.learnerName,
        subject,
      });
      await sendEmail({
        to: opts.parentEmail,
        subject: parentTpl.subject,
        html: parentTpl.html,
      }).catch(console.error);

      continue;
    }

    const { error: enrollErr } = await supabase.from('class_enrollments').insert({
      learner_id: opts.learnerId,
      class_id: targetClassId,
      status: 'active',
    });

    if (enrollErr) {
      console.error('Enrollment insert error:', enrollErr);
      waitlisted.push(subject);
      continue;
    }

    enrolled.push(classLabel);

    const adminTpl = classAllocatedAdminEmail({
      learnerName: opts.learnerName,
      classLabel,
    });
    await sendEmail({
      to: process.env.ADMIN_EMAIL ?? 'info@ilithiyana.co.za',
      subject: adminTpl.subject,
      html: adminTpl.html,
    }).catch(console.error);

    const parentTpl = classAllocatedParentEmail({
      parentName: opts.parentName,
      learnerName: opts.learnerName,
      classLabel,
      dashboardUrl: `${site}/dashboard`,
    });
    await sendEmail({
      to: opts.parentEmail,
      subject: parentTpl.subject,
      html: parentTpl.html,
    }).catch(console.error);
  }

  const allocationStatus =
    waitlisted.length === 0 && enrolled.length > 0
      ? 'enrolled'
      : enrolled.length > 0
        ? 'waitlisted'
        : 'waitlisted';

  await supabase
    .from('applications')
    .update({ allocation_status: allocationStatus })
    .eq('id', opts.applicationId);

  await supabase
    .from('learners')
    .update({ allocation_status: allocationStatus })
    .eq('id', opts.learnerId);

  return { enrolled, waitlisted };
}
