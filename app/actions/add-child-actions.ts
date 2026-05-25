'use server';

import {
  initiateAddChildCheckout,
  saveAddChildLead,
} from '@/lib/enrollment-leads';
import { isPayfastConfigured } from '@/lib/payfast';
import { getParentDashboard } from '@/lib/parent-dashboard';
import { isSupabaseConfigured } from '@/lib/supabase/server';
import { addChildInputSchema } from '@/lib/validations/add-child';

export type AddChildPaymentResult =
  | {
      success: true;
      leadId: string;
      processUrl: string;
      fields: Record<string, string>;
    }
  | { success: false; message: string };

export async function startAddChildPayment(
  raw: unknown
): Promise<AddChildPaymentResult> {
  const parsed = addChildInputSchema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.errors[0];
    return {
      success: false,
      message: first?.message ?? 'Please check the form and try again.',
    };
  }

  if (!isSupabaseConfigured()) {
    return { success: false, message: 'Service unavailable.' };
  }

  const session = await getParentDashboard();
  if (!session) {
    return { success: false, message: 'Please sign in again.' };
  }

  const saved = await saveAddChildLead(parsed.data, session.parent.id);
  if ('error' in saved) {
    return { success: false, message: saved.error };
  }

  if (!isPayfastConfigured()) {
    return {
      success: false,
      message: 'Online payment is not configured. Contact us to complete enrolment.',
    };
  }

  const checkout = await initiateAddChildCheckout(saved.leadId);
  if ('error' in checkout) {
    return { success: false, message: checkout.error };
  }

  return {
    success: true,
    leadId: saved.leadId,
    processUrl: checkout.processUrl,
    fields: checkout.fields,
  };
}
