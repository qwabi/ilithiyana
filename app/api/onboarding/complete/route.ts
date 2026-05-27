import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createServiceClient } from '@/lib/supabase/server';
import { loadSessionForRequestHttp } from '@/lib/onboarding/api-auth';
import { mergeCompletedSteps } from '@/lib/onboarding/steps';
import { resolveLearnerSubjectIds } from '@/lib/curriculum/learner-subjects';
import { allocationLog } from '@/lib/allocation-log';
import { ensureLearnerClassEnrollments } from '@/lib/reports/enroll-from-manual-report';

const bodySchema = z.object({
  sessionId: z.string().uuid(),
  reportsAdded: z.boolean().optional(),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
    }

    const loaded = await loadSessionForRequestHttp(parsed.data.sessionId);
    if (!loaded.ok) return loaded.response;

    const session = loaded.session;
    const steps = mergeCompletedSteps(
      session.completed_steps,
      'reports',
      'complete'
    );

    const supabase = createServiceClient();
    const { error } = await supabase
      .from('onboarding_sessions')
      .update({
        current_step: 'complete',
        completed_steps: steps,
        reports_added: parsed.data.reportsAdded ?? session.reports_added,
      })
      .eq('id', parsed.data.sessionId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const learnerIds = (session.learner_ids as string[]) ?? [];
    allocationLog('onboarding/complete:enrollment_pass', {
      sessionId: parsed.data.sessionId,
      learnerCount: learnerIds.length,
      reportsAdded: parsed.data.reportsAdded ?? session.reports_added,
    });

    if (learnerIds.length > 0) {
      const { data: learners } = await supabase
        .from('learners')
        .select('id, grade, level, subjects')
        .in('id', learnerIds);

      for (const learner of learners ?? []) {
        const subjectIds = resolveLearnerSubjectIds(
          (learner.subjects as string[]) ?? [],
          Number(learner.grade)
        );
        if (!subjectIds.length) {
          allocationLog('onboarding/complete:skip_no_subjects', {
            learnerId: learner.id,
            grade: learner.grade,
          });
          continue;
        }
        try {
          await ensureLearnerClassEnrollments({
            supabase,
            learnerId: learner.id as string,
            grade: Number(learner.grade),
            level: (learner.level as string | null) ?? null,
            subjects: subjectIds,
            context: 'onboarding:complete',
          });
        } catch (e) {
          allocationLog('onboarding/complete:enroll_error', {
            learnerId: learner.id,
            error: e instanceof Error ? e.message : String(e),
          });
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('POST /api/onboarding/complete', e);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
