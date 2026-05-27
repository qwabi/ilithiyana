'use server';

import { redirect } from 'next/navigation';
import { z } from 'zod';
import {
  createServiceClient,
  isSupabaseConfigured,
} from '@/lib/supabase/server';
import {
  sendSubjectChoiceChecklistEmail,
  isEmailConfigured,
} from '@/lib/email';
import { SUBJECT_CHOICE_MAGNET } from '@/lib/lead-magnets';

const checklistInputSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  firstName: z
    .string()
    .max(80)
    .optional()
    .transform((v) => (v?.trim() ? v.trim() : undefined)),
});

export type ChecklistFormState = {
  success: boolean;
  message?: string;
};

export async function requestSubjectChoiceChecklist(
  _prev: ChecklistFormState,
  formData: FormData
): Promise<ChecklistFormState> {
  const parsed = checklistInputSchema.safeParse({
    email: formData.get('email'),
    firstName: formData.get('firstName') || undefined,
  });

  if (!parsed.success) {
    const first = parsed.error.errors[0];
    return {
      success: false,
      message: first?.message ?? 'Please check the form and try again.',
    };
  }

  const { email, firstName } = parsed.data;
  const normalizedEmail = email.toLowerCase();

  if (isSupabaseConfigured()) {
    try {
      const supabase = createServiceClient();
      const emailResult = await sendSubjectChoiceChecklistEmail({
        to: normalizedEmail,
        firstName,
      });

      const { error: insertError } = await supabase
        .from('prospective_leads')
        .insert({
          email: normalizedEmail,
          first_name: firstName ?? null,
          source: SUBJECT_CHOICE_MAGNET.source,
          magnet_slug: SUBJECT_CHOICE_MAGNET.slug,
          resend_message_id:
            emailResult.ok && 'id' in emailResult ? emailResult.id : null,
          email_sent_at:
            emailResult.ok && !('skipped' in emailResult) ? new Date().toISOString() : null,
        });

      if (insertError) {
        console.error('prospective_leads insert:', insertError);
      }

      if (!emailResult.ok && !('skipped' in emailResult)) {
        return {
          success: false,
          message:
            'We saved your request but could not send the email. Open the checklist from the link below or contact us.',
        };
      }

      if ('skipped' in emailResult && emailResult.skipped) {
        console.warn(
          'Resend not configured — lead stored without email for',
          normalizedEmail
        );
      }
    } catch (err) {
      console.error('requestSubjectChoiceChecklist:', err);
      return {
        success: false,
        message:
          'Something went wrong. Please try again or email info@ilithiyana.co.za.',
      };
    }
  } else if (!isEmailConfigured()) {
    return {
      success: false,
      message:
        'Sign-up is temporarily unavailable. Please email info@ilithiyana.co.za for the checklist.',
    };
  } else {
    const emailResult = await sendSubjectChoiceChecklistEmail({
      to: normalizedEmail,
      firstName,
    });
    if (!emailResult.ok) {
      return {
        success: false,
        message: 'Could not send the checklist email. Please try again.',
      };
    }
  }

  redirect(SUBJECT_CHOICE_MAGNET.thankYouPath);
}
