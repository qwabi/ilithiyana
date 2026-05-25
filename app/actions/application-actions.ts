'use server';

import {
  initiatePayFastCheckout,
  saveEnrollmentLead,
  updateEnrollmentLead,
} from '@/lib/enrollment-leads';
import { isPayfastConfigured } from '@/lib/payfast';
import { provisionParentAccount } from '@/lib/parent-auth';
import { createServiceClient, isSupabaseConfigured } from '@/lib/supabase/server';
import { enrollmentInputSchema } from '@/lib/validations/enrollment';

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type ResumeEnrollmentLead = {
  leadId: string;
  parentFirstName: string;
  parentLastName: string;
  parentAddress: string;
  parentPhone: string;
  parentEmail: string;
  preferredContact: 'email' | 'whatsapp';
  province: string;
  learnerFirstName: string;
  learnerLastName: string;
  dateOfBirth: string;
  schoolName: string;
  grade: number;
  subjects: string[];
  packageId: string;
  schedule: Record<string, unknown>;
};

export async function loadEnrollmentLeadForResume(
  leadId: string
): Promise<{ ok: true; data: ResumeEnrollmentLead } | { ok: false; error: string }> {
  if (!UUID_RE.test(leadId)) {
    return { ok: false, error: 'Invalid application reference.' };
  }

  if (!isSupabaseConfigured()) {
    return { ok: false, error: 'Enrolment is temporarily unavailable.' };
  }

  const supabase = createServiceClient();
  const { data: lead, error } = await supabase
    .from('enrollment_leads')
    .select('*')
    .eq('id', leadId)
    .maybeSingle();

  if (error || !lead) {
    return { ok: false, error: 'Application not found.' };
  }

  if (lead.status !== 'awaiting_payment') {
    return {
      ok: false,
      error:
        'This application has already been processed. Sign in to your dashboard or contact us for help.',
    };
  }

  if (lead.lead_type !== 'initial') {
    return {
      ok: false,
      error: 'Please complete payment from your parent dashboard for this learner.',
    };
  }

  return {
    ok: true,
    data: {
      leadId: lead.id,
      parentFirstName: lead.parent_first_name,
      parentLastName: lead.parent_last_name,
      parentAddress: lead.parent_address ?? '',
      parentPhone: lead.parent_phone,
      parentEmail: lead.parent_email,
      preferredContact:
        lead.preferred_contact === 'whatsapp' ? 'whatsapp' : 'email',
      province: lead.province,
      learnerFirstName: lead.learner_first_name,
      learnerLastName: lead.learner_last_name,
      dateOfBirth: lead.learner_date_of_birth,
      schoolName: lead.learner_school_name,
      grade: lead.learner_grade,
      subjects: (lead.subjects as string[]) ?? [],
      packageId: lead.package_id,
      schedule: (lead.schedule as Record<string, unknown>) ?? {},
    },
  };
}

export type EnrollmentPaymentResult =
  | {
      success: true;
      leadId: string;
      processUrl: string;
      fields: Record<string, string>;
    }
  | { success: false; message: string };

export async function startEnrollmentWithPayment(
  raw: unknown
): Promise<EnrollmentPaymentResult> {
  const parsed = enrollmentInputSchema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.errors[0];
    return {
      success: false,
      message: first?.message ?? 'Please check the form and try again.',
    };
  }

  const data = parsed.data;

  if (!isSupabaseConfigured()) {
    return {
      success: false,
      message:
        'Enrolment is temporarily unavailable. Please email info@ilithiyana.co.za or WhatsApp us.',
    };
  }

  const supabase = createServiceClient();
  const { data: existing } = await supabase
    .from('enrollment_leads')
    .select('id, status, lead_type')
    .eq('id', data.leadId)
    .maybeSingle();

  const isResume =
    existing?.status === 'awaiting_payment' && existing.lead_type === 'initial';

  if (!isResume && data.parentPassword.length < 8) {
    return {
      success: false,
      message: 'Password must be at least 8 characters.',
    };
  }

  let leadId: string;

  if (isResume) {
    const updated = await updateEnrollmentLead(data);
    if ('error' in updated) {
      return { success: false, message: updated.error };
    }
    leadId = updated.leadId;

    if (data.parentPassword.length >= 8) {
      try {
        await provisionParentAccount({
          email: data.parentEmail,
          firstName: data.parentFirstName,
          lastName: data.parentLastName,
          phone: data.parentPhone,
          province: data.province,
          preferredContact: data.preferredContact,
          password: data.parentPassword,
        });
      } catch (e) {
        console.error('createParentAuthAtEnrollment (resume):', e);
      }
    }
  } else {
    const saved = await saveEnrollmentLead(data);
    if ('error' in saved) {
      return { success: false, message: saved.error };
    }
    leadId = saved.leadId;

    try {
      await provisionParentAccount({
        email: data.parentEmail,
        firstName: data.parentFirstName,
        lastName: data.parentLastName,
        phone: data.parentPhone,
        province: data.province,
        preferredContact: data.preferredContact,
        password: data.parentPassword,
      });
    } catch (e) {
      console.error('createParentAuthAtEnrollment:', e);
      return {
        success: false,
        message:
          'Could not create your parent account. If you already enrolled before, sign in and add a child from your dashboard.',
      };
    }
  }

  if (!isPayfastConfigured()) {
    return {
      success: false,
      message:
        'Your details were saved, but online payment is not configured. We will contact you shortly.',
    };
  }

  const checkout = await initiatePayFastCheckout(leadId);
  if ('error' in checkout) {
    return { success: false, message: checkout.error };
  }

  return {
    success: true,
    leadId,
    processUrl: checkout.processUrl,
    fields: checkout.fields,
  };
}

export async function submitApplication(raw: unknown) {
  const result = await startEnrollmentWithPayment(raw);
  if (!result.success) {
    return { success: false as const, message: result.message };
  }
  return {
    success: true as const,
    applicationId: result.leadId,
  };
}
