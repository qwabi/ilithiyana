import { createServiceClient } from '@/lib/supabase/server';
import type { PreferredContactMethod } from '@/lib/types/database';

export type EnsureParentRowInput = {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  province: string;
  address?: string | null;
  preferredContact?: PreferredContactMethod | null;
};

/** Ensures a `parents` row exists and is linked to the auth profile (profiles.id = userId). */
export async function ensureParentRowLinkedToProfile(
  input: EnsureParentRowInput
): Promise<{ parentId: string } | { error: string }> {
  const supabase = createServiceClient();
  const email = input.email.trim().toLowerCase();
  const preferred =
    input.preferredContact === 'whatsapp' ? 'whatsapp' : 'email';

  const { data: existing, error: lookupError } = await supabase
    .from('parents')
    .select('id, profile_id')
    .eq('email', email)
    .maybeSingle();

  if (lookupError) {
    console.error('ensureParentRowLinkedToProfile lookup:', lookupError);
    return { error: lookupError.message };
  }

  if (existing) {
    if (existing.profile_id && existing.profile_id !== input.userId) {
      return {
        error:
          'A parent record for this email is linked to a different account.',
      };
    }

    if (!existing.profile_id) {
      const { error: linkError } = await supabase
        .from('parents')
        .update({
          profile_id: input.userId,
          phone: input.phone,
          province: input.province,
          preferred_contact: preferred,
          first_name: input.firstName,
          last_name: input.lastName,
          address: input.address ?? null,
        })
        .eq('id', existing.id);

      if (linkError) {
        console.error('ensureParentRowLinkedToProfile link:', linkError);
        return { error: linkError.message };
      }
    }

    return { parentId: existing.id };
  }

  const { data: created, error: insertError } = await supabase
    .from('parents')
    .insert({
      profile_id: input.userId,
      first_name: input.firstName,
      last_name: input.lastName,
      email,
      phone: input.phone,
      address: input.address ?? null,
      province: input.province,
      preferred_contact: preferred,
    })
    .select('id')
    .single();

  if (insertError || !created) {
    console.error('ensureParentRowLinkedToProfile insert:', insertError);
    return { error: insertError?.message ?? 'Could not create parent profile' };
  }

  return { parentId: created.id as string };
}

/** Dashboard fallback: build parent row from profiles when apply-time link was missed. */
export async function ensureParentRowFromAuthUser(
  userId: string,
  email: string
): Promise<{ parentId: string } | { error: string }> {
  const supabase = createServiceClient();
  const normalized = email.trim().toLowerCase();

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, role, full_name, phone, province, preferred_contact')
    .eq('id', userId)
    .maybeSingle();

  if (profileError) {
    console.error('ensureParentRowFromAuthUser profile:', profileError);
    return { error: profileError.message };
  }

  if (!profile) {
    return { error: 'Profile record not found' };
  }

  if (profile.role !== 'parent') {
    return { error: 'Account is not a parent role' };
  }

  const fullName = (profile.full_name ?? '').trim();
  const parts = fullName.split(/\s+/).filter(Boolean);
  const firstName = parts[0] ?? 'Parent';
  const lastName = parts.slice(1).join(' ') || '—';

  return ensureParentRowLinkedToProfile({
    userId,
    email: normalized,
    firstName,
    lastName,
    phone: profile.phone ?? '',
    province: profile.province ?? 'Gauteng',
    preferredContact: profile.preferred_contact,
  });
}
