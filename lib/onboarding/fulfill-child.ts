import { normalizeSubjectIds } from '@/lib/curriculum/learner-subjects';
import { createServiceClient } from '@/lib/supabase/server';
import { ensureLearnerClassEnrollments } from '@/lib/reports/enroll-from-manual-report';
import { packageAmountCents } from '@/lib/payfast';
import type { OnboardingSessionRow, PackageSelectionSlot } from '@/lib/onboarding/sessions';

export type SaveChildInput = {
  sessionId: string;
  learnerSlot: number;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  schoolName: string;
  grade: number;
  subjects: string[];
  schedule: Record<string, unknown>;
  level?: string | null;
};

export type SaveChildResult =
  | { ok: true; learnerId: string; created: boolean }
  | { ok: false; error: string };

async function persistSlotLearnerId(
  sessionId: string,
  slot: number,
  learnerId: string,
  selections: PackageSelectionSlot[]
) {
  const supabase = createServiceClient();
  const updated = selections.map((p) =>
    p.learner_slot === slot ? { ...p, learner_id: learnerId } : p
  );

  const { data: session } = await supabase
    .from('onboarding_sessions')
    .select('learner_ids')
    .eq('id', sessionId)
    .single();

  const ids = new Set([
    ...((session?.learner_ids as string[]) ?? []),
    learnerId,
  ]);

  await supabase
    .from('onboarding_sessions')
    .update({
      package_selections: updated,
      learner_ids: [...ids],
    })
    .eq('id', sessionId);

  await supabase.rpc('attach_onboarding_learner', {
    p_session_id: sessionId,
    p_learner_id: learnerId,
  });
}

export async function fulfillOnboardingChild(
  session: OnboardingSessionRow,
  input: SaveChildInput
): Promise<SaveChildResult> {
  if (session.payment_status !== 'complete' || !session.parent_id) {
    return { ok: false, error: 'Complete payment before adding child profiles.' };
  }

  const slotPkg = session.package_selections.find(
    (p) => p.learner_slot === input.learnerSlot
  );
  if (!slotPkg) {
    return { ok: false, error: 'Invalid child slot.' };
  }

  const parentId = session.parent_id;
  const subjectIds = normalizeSubjectIds(input.subjects, input.grade);
  if (!subjectIds.length) {
    return { ok: false, error: 'Select at least one subject.' };
  }
  const schoolName = input.schoolName.trim() || 'TBC';
  const schedule =
    input.schedule && Object.keys(input.schedule).length > 0
      ? input.schedule
      : { availableDays: {}, timeSlots: {}, preferredDays: [] };

  if (slotPkg.learner_id) {
    const supabase = createServiceClient();
    const { error: learnerError } = await supabase
      .from('learners')
      .update({
        first_name: input.firstName.trim(),
        last_name: input.lastName.trim(),
        date_of_birth: input.dateOfBirth,
        school_name: schoolName,
        grade: input.grade,
        subjects: subjectIds,
        level: input.level ?? null,
      })
      .eq('id', slotPkg.learner_id)
      .eq('parent_id', parentId);

    if (learnerError) {
      console.error('fulfillOnboardingChild update learner:', learnerError);
      return { ok: false, error: 'Could not update child profile.' };
    }

    await supabase
      .from('applications')
      .update({
        subjects: subjectIds,
        schedule,
        learner_snapshot: {
          firstName: input.firstName,
          lastName: input.lastName,
          dateOfBirth: input.dateOfBirth,
          schoolName,
          grade: String(input.grade),
          level: input.level ?? null,
        },
      })
      .eq('learner_id', slotPkg.learner_id);

    try {
      await ensureLearnerClassEnrollments({
        supabase,
        learnerId: slotPkg.learner_id,
        grade: input.grade,
        level: input.level ?? null,
        subjects: subjectIds,
        context: 'onboarding:fulfillChild:update',
      });
    } catch (e) {
      console.error('fulfillOnboardingChild enroll (update):', e);
    }

    return { ok: true, learnerId: slotPkg.learner_id, created: false };
  }

  const created = await createLearnerBundle(
    session,
    slotPkg,
    { ...input, subjects: subjectIds },
    parentId,
    schoolName,
    schedule
  );

  if (created.ok) {
    await persistSlotLearnerId(
      session.id,
      input.learnerSlot,
      created.learnerId,
      session.package_selections
    );

    const supabase = createServiceClient();
    try {
      await ensureLearnerClassEnrollments({
        supabase,
        learnerId: created.learnerId,
        grade: input.grade,
        level: input.level ?? null,
        subjects: subjectIds,
        context: 'onboarding:fulfillChild:create',
      });
    } catch (e) {
      console.error('fulfillOnboardingChild enroll (create):', e);
    }
  }

  return created;
}

async function createLearnerBundle(
  session: OnboardingSessionRow,
  slotPkg: PackageSelectionSlot,
  input: SaveChildInput,
  parentId: string,
  schoolName: string,
  schedule: Record<string, unknown>
): Promise<SaveChildResult> {
  const supabase = createServiceClient();
  const amountCents = packageAmountCents(slotPkg.package_id);
  const paymentRef = session.payment_ref ?? session.id;

  const parentJson = {
    firstName: session.parent_first_name,
    lastName: session.parent_last_name,
    email: session.email,
    phone: session.parent_phone,
  };

  const learnerJson = {
    firstName: input.firstName,
    lastName: input.lastName,
    dateOfBirth: input.dateOfBirth,
    schoolName,
    grade: String(input.grade),
    level: input.level ?? null,
  };

  const { data: learner, error: learnerError } = await supabase
    .from('learners')
    .insert({
      parent_id: parentId,
      first_name: input.firstName.trim(),
      last_name: input.lastName.trim(),
      date_of_birth: input.dateOfBirth,
      school_name: schoolName,
      grade: input.grade,
      level: input.level ?? null,
      subjects: input.subjects,
      status: 'active',
    })
    .select('id')
    .single();

  if (learnerError || !learner) {
    console.error('fulfillOnboardingChild insert learner:', learnerError);
    return { ok: false, error: 'Could not create child profile.' };
  }

  const learnerId = learner.id as string;

  const { data: app, error: appError } = await supabase
    .from('applications')
    .insert({
      parent_id: parentId,
      learner_id: learnerId,
      status: 'approved',
      province: session.province ?? 'Gauteng',
      subjects: input.subjects,
      package_id: slotPkg.package_id,
      schedule,
      parent_snapshot: parentJson,
      learner_snapshot: learnerJson,
    })
    .select('id')
    .single();

  if (appError || !app) {
    console.error('fulfillOnboardingChild insert app:', appError);
    return { ok: false, error: 'Could not create application.' };
  }

  const { data: sub, error: subError } = await supabase
    .from('subscriptions')
    .insert({
      learner_id: learnerId,
      parent_id: parentId,
      package_id: slotPkg.package_id,
      status: 'active',
      amount_cents: amountCents,
      period_start: new Date().toISOString().slice(0, 10),
      billing_date: new Date().toISOString().slice(0, 10),
    })
    .select('id')
    .single();

  if (subError || !sub) {
    console.error('fulfillOnboardingChild insert sub:', subError);
    return { ok: false, error: 'Could not create subscription.' };
  }

  const { error: payError } = await supabase.from('payments').insert({
    subscription_id: sub.id,
    application_id: app.id,
    parent_id: parentId,
    learner_id: learnerId,
    gateway_ref: paymentRef,
    payfast_payment_id: paymentRef,
    amount_cents: amountCents,
    status: 'complete',
    paid_at: new Date().toISOString(),
  });

  if (payError) {
    console.error('fulfillOnboardingChild insert payment:', payError);
  }

  return { ok: true, learnerId, created: true };
}
