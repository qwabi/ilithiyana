import { createServiceClient } from '@/lib/supabase/server';
import { provisionParentAccount } from '@/lib/parent-auth';
import { sendEmail } from '@/lib/email';
import {
  applicationReceivedEmail,
  childAddedEmail,
  paymentConfirmedEmail,
} from '@/lib/email/templates';
import { formatCents } from '@/lib/parent-dashboard-utils';
import { persistManualReportForLearner } from '@/lib/reports/persist-manual-report';
import { assignLearnerToClassGroups } from '@/lib/class-enrollments';
import {
  normalizeSubjectIds,
  subjectIdsToTutoringNames,
} from '@/lib/curriculum/learner-subjects';

export type FulfillPaymentResult =
  | { ok: true; alreadyPaid?: boolean; applicationId?: string }
  | { ok: false; error: string };

/** Runs the same post-payment steps as a successful PayFast ITN (without signature check). */
export async function fulfillPaidEnrollmentLead(
  leadId: string,
  opts?: { payfastPaymentId?: string }
): Promise<FulfillPaymentResult> {
  const supabase = createServiceClient();

  const { data: lead, error: leadError } = await supabase
    .from('enrollment_leads')
    .select('*')
    .eq('id', leadId)
    .maybeSingle();

  if (leadError || !lead) {
    return { ok: false, error: 'Lead not found' };
  }

  if (lead.status === 'paid' && lead.converted_application_id) {
    return {
      ok: true,
      alreadyPaid: true,
      applicationId: lead.converted_application_id as string,
    };
  }

  if (lead.status !== 'awaiting_payment') {
    return {
      ok: false,
      error: `Lead status is "${lead.status}", expected awaiting_payment`,
    };
  }

  const isAddChild = lead.lead_type === 'add_child';
  const rpcName = isAddChild
    ? 'convert_add_child_lead'
    : 'convert_paid_enrollment_lead';

  const { data: result, error } = await supabase.rpc(rpcName, {
    p_lead_id: leadId,
    p_payfast_payment_id: opts?.payfastPaymentId ?? 'dev-local',
    p_itn_payload: { source: 'local_dev' },
    p_payfast_token: '',
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  const payload = result as Record<string, unknown>;

  if (!isAddChild && payload.parent_id) {
    try {
      await provisionParentAccount({
        email: String(payload.parent_email ?? lead.parent_email),
        firstName: String(payload.parent_first_name ?? lead.parent_first_name),
        lastName: String(payload.parent_last_name ?? lead.parent_last_name),
        phone: lead.parent_phone,
        province: String(payload.province ?? lead.province),
        preferredContact: lead.preferred_contact,
        parentId: String(payload.parent_id),
      });
    } catch (e) {
      console.error('Auth link error:', e);
      return {
        ok: false,
        error:
          e instanceof Error ? e.message : 'Could not link parent auth profile',
      };
    }
  }

  const parentEmail = String(payload.parent_email ?? lead.parent_email);
  const parentName = String(payload.parent_first_name ?? 'Parent');
  const learnerName = `${payload.learner_first_name ?? lead.learner_first_name} ${payload.learner_last_name ?? lead.learner_last_name}`;

  try {
    if (isAddChild) {
      const tpl = applicationReceivedEmail({ parentName, learnerName });
      await sendEmail({ to: parentEmail, subject: tpl.subject, html: tpl.html });
      const added = childAddedEmail({ parentName, learnerName });
      await sendEmail({ to: parentEmail, subject: added.subject, html: added.html });
    } else {
      const confirmed = paymentConfirmedEmail({
        parentName,
        amount: formatCents(lead.amount_cents as number),
        date: new Date().toLocaleDateString('en-ZA'),
      });
      await sendEmail({
        to: parentEmail,
        subject: confirmed.subject,
        html: confirmed.html,
      });
    }
  } catch (e) {
    console.warn('fulfillPaidEnrollmentLead: email skipped', e);
  }

  const applicationId = String(payload.application_id ?? '');
  if (applicationId) {
    const { data: appRow } = await supabase
      .from('applications')
      .select('learner_id')
      .eq('id', applicationId)
      .maybeSingle();

    if (appRow?.learner_id) {
      const { data: learnerRow } = await supabase
        .from('learners')
        .select('grade, level')
        .eq('id', appRow.learner_id)
        .maybeSingle();

      const leadSubjectIds = normalizeSubjectIds(
        (lead.subjects as string[] | null) ?? [],
        learnerRow.grade
      );
      const tutoringSubjects = subjectIdsToTutoringNames(leadSubjectIds);
      if (learnerRow && tutoringSubjects.length > 0) {
        try {
          await assignLearnerToClassGroups(
            supabase,
            appRow.learner_id,
            learnerRow.grade,
            learnerRow.level,
            tutoringSubjects
          );
        } catch (e) {
          console.error('assignLearnerToClassGroups:', e);
        }
      }

      const schedule = lead.schedule as {
        manualReport?: {
          term: string;
          academicYear: number;
          rows: { subjectId: string; percentage: number }[];
        };
      } | null;

      const manual = schedule?.manualReport;
      if (manual?.rows?.length) {
        console.info(
          'fulfillPaidEnrollmentLead: report path=manual',
          { leadId, learnerId: appRow.learner_id, rowCount: manual.rows.length }
        );
        const { data: parentRow } = await supabase
          .from('parents')
          .select('profile_id')
          .eq('id', lead.parent_id as string)
          .maybeSingle();

        if (parentRow?.profile_id) {
          void persistManualReportForLearner({
            learnerId: appRow.learner_id,
            term: manual.term,
            academicYear: manual.academicYear,
            rows: manual.rows,
            confirmedByProfileId: parentRow.profile_id as string,
          }).catch(console.error);
        }
      } else {
        await supabase
          .from('applications')
          .update({ allocation_status: 'pending_report' })
          .eq('id', applicationId);
        await supabase
          .from('learners')
          .update({ allocation_status: 'pending_report' })
          .eq('id', appRow.learner_id);
      }
    }
  }

  return { ok: true, applicationId: applicationId || undefined };
}
