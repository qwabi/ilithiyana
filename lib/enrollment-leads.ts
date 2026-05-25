import { createServiceClient, isSupabaseConfigured } from '@/lib/supabase/server';
import { packages, brand } from '@/lib/site-config';
import { buildPayfastReturnUrls } from '@/lib/payfast-return-urls';
import {
  buildPayfastFormFields,
  getProcessUrl,
  isPayfastConfigured,
  packageAmountCents,
  packageItemName,
  payfastBillingDateToday,
} from '@/lib/payfast';
import type { EnrollmentInput } from '@/lib/validations/enrollment';
import type { EnrollmentLeadStatus } from '@/lib/types/database';

export async function saveEnrollmentLead(
  data: EnrollmentInput
): Promise<{ leadId: string } | { error: string }> {
  if (!isSupabaseConfigured()) {
    return { error: 'Database is not configured.' };
  }

  const amountCents = packageAmountCents(data.packageId);
  const supabase = createServiceClient();

  const { data: row, error } = await supabase
    .from('enrollment_leads')
    .insert({
      id: data.leadId,
      status: 'awaiting_payment' satisfies EnrollmentLeadStatus,
      parent_first_name: data.parentFirstName,
      parent_last_name: data.parentLastName,
      parent_email: data.parentEmail.toLowerCase(),
      parent_phone: data.parentPhone,
      parent_address: data.parentAddress,
      province: data.province,
      learner_first_name: data.learnerFirstName,
      learner_last_name: data.learnerLastName,
      learner_date_of_birth: data.dateOfBirth,
      learner_school_name: data.schoolName,
      learner_grade: data.grade,
      subjects: data.subjects,
      package_id: data.packageId,
      schedule: data.schedule,
      report_storage_path: data.reportStoragePath,
      report_url: data.reportUrl ?? null,
      preferred_contact: data.preferredContact ?? 'email',
      lead_type: 'initial',
      amount_cents: amountCents,
    })
    .select('id')
    .single();

  if (error || !row) {
    console.error('saveEnrollmentLead error:', error);
    return { error: 'Could not save your enrolment details. Please try again.' };
  }

  return { leadId: row.id as string };
}

export async function updateEnrollmentLead(
  data: EnrollmentInput
): Promise<{ leadId: string } | { error: string }> {
  if (!isSupabaseConfigured()) {
    return { error: 'Database is not configured.' };
  }

  const amountCents = packageAmountCents(data.packageId);
  const supabase = createServiceClient();

  const { data: row, error } = await supabase
    .from('enrollment_leads')
    .update({
      parent_first_name: data.parentFirstName,
      parent_last_name: data.parentLastName,
      parent_email: data.parentEmail.toLowerCase(),
      parent_phone: data.parentPhone,
      parent_address: data.parentAddress,
      province: data.province,
      learner_first_name: data.learnerFirstName,
      learner_last_name: data.learnerLastName,
      learner_date_of_birth: data.dateOfBirth,
      learner_school_name: data.schoolName,
      learner_grade: data.grade,
      subjects: data.subjects,
      package_id: data.packageId,
      schedule: data.schedule,
      report_storage_path: data.reportStoragePath,
      report_url: data.reportUrl ?? null,
      preferred_contact: data.preferredContact ?? 'email',
      amount_cents: amountCents,
    })
    .eq('id', data.leadId)
    .eq('status', 'awaiting_payment')
    .select('id')
    .maybeSingle();

  if (error || !row) {
    console.error('updateEnrollmentLead error:', error);
    return { error: 'Could not update your application. Please try again.' };
  }

  return { leadId: row.id as string };
}

export async function initiatePayFastCheckout(leadId: string): Promise<
  | { processUrl: string; fields: Record<string, string> }
  | { error: string }
> {
  if (!isPayfastConfigured()) {
    return { error: 'Online payment is not configured yet. Please contact us.' };
  }

  if (!isSupabaseConfigured()) {
    return { error: 'Database is not configured.' };
  }

  const supabase = createServiceClient();
  const { data: lead, error } = await supabase
    .from('enrollment_leads')
    .select('*')
    .eq('id', leadId)
    .maybeSingle();

  if (error || !lead) {
    return { error: 'Enrolment record not found.' };
  }

  const pkg = packages.find((p) => p.id === lead.package_id);
  const urls = buildPayfastReturnUrls({
    applicationId: lead.id,
    packageId: lead.package_id,
    learnerFirstName: lead.learner_first_name,
  });

  const itemName = `${brand.name} — ${packageItemName(lead.package_id)} — ${lead.learner_first_name}`;

  const fields = buildPayfastFormFields({
    paymentId: lead.id,
    amountCents: lead.amount_cents,
    itemName,
    itemDescription: pkg?.price ?? 'Tutoring package',
    email: lead.parent_email,
    nameFirst: lead.parent_first_name,
    nameLast: lead.parent_last_name,
    cellNumber: lead.parent_phone,
    returnUrl: urls.returnUrl,
    cancelUrl: urls.cancelUrl,
    customStr1: lead.id,
    customStr2: lead.package_id,
    subscription:
      lead.package_id === 'package-a'
        ? {
            subscriptionType: '1',
            frequency: '3',
            cycles: '0',
            billingDate: payfastBillingDateToday(),
          }
        : undefined,
  });

  return { processUrl: getProcessUrl(), fields };
}

export async function saveAddChildLead(
  data: import('@/lib/validations/add-child').AddChildInput,
  parentId: string
): Promise<{ leadId: string } | { error: string }> {
  if (!isSupabaseConfigured()) {
    return { error: 'Database is not configured.' };
  }

  const amountCents = packageAmountCents(data.packageId);
  const supabase = createServiceClient();

  const { data: parent } = await supabase
    .from('parents')
    .select('first_name, last_name, email, phone, province')
    .eq('id', parentId)
    .single();

  if (!parent) return { error: 'Parent account not found.' };

  const { data: row, error } = await supabase
    .from('enrollment_leads')
    .insert({
      id: data.leadId,
      status: 'awaiting_payment',
      lead_type: 'add_child',
      parent_id: parentId,
      parent_first_name: parent.first_name,
      parent_last_name: parent.last_name,
      parent_email: parent.email,
      parent_phone: parent.phone,
      province: parent.province,
      learner_first_name: data.learnerFirstName,
      learner_last_name: data.learnerLastName,
      learner_date_of_birth: data.dateOfBirth,
      learner_school_name: data.schoolName,
      learner_grade: data.grade,
      learner_level: data.level,
      subjects: data.subjects,
      package_id: data.packageId,
      schedule: {},
      report_storage_path: data.reportStoragePath,
      report_url: data.reportUrl ?? null,
      proof_url: data.proofUrl ?? null,
      amount_cents: amountCents,
    })
    .select('id')
    .single();

  if (error || !row) {
    console.error('saveAddChildLead error:', error);
    return { error: 'Could not save learner details. Please try again.' };
  }

  return { leadId: row.id as string };
}

export async function initiateAddChildCheckout(leadId: string) {
  if (!isPayfastConfigured() || !isSupabaseConfigured()) {
    return { error: 'Payment is not available.' };
  }

  const supabase = createServiceClient();
  const { data: lead, error } = await supabase
    .from('enrollment_leads')
    .select('*')
    .eq('id', leadId)
    .maybeSingle();

  if (error || !lead) return { error: 'Enrolment record not found.' };

  const pkg = packages.find((p) => p.id === lead.package_id);
  const urls = buildPayfastReturnUrls({
    applicationId: lead.id,
    packageId: lead.package_id,
    learnerFirstName: lead.learner_first_name,
    flow: 'dashboard',
    redirect: '/dashboard/children',
  });

  const itemName = `${brand.name} — ${packageItemName(lead.package_id)} — ${lead.learner_first_name}`;

  const fields = buildPayfastFormFields({
    paymentId: lead.id,
    amountCents: lead.amount_cents,
    itemName,
    itemDescription: pkg?.price ?? 'Tutoring package',
    email: lead.parent_email,
    nameFirst: lead.parent_first_name,
    nameLast: lead.parent_last_name,
    cellNumber: lead.parent_phone,
    returnUrl: urls.returnUrl,
    cancelUrl: urls.cancelUrl,
    customStr1: lead.id,
    customStr2: lead.package_id,
    subscription:
      lead.package_id === 'package-a'
        ? {
            subscriptionType: '1',
            frequency: '3',
            cycles: '0',
            billingDate: payfastBillingDateToday(),
          }
        : undefined,
  });

  return { processUrl: getProcessUrl(), fields };
}
