import { createServiceClient } from '@/lib/supabase/server';
import { ensureParentRowLinkedToProfile } from '@/lib/parent-profile';
import type { PreferredContactMethod } from '@/lib/types/database';

export type ProvisionParentInput = {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  province: string;
  preferredContact?: PreferredContactMethod | null;
  /** Set after payment conversion; omit when creating auth at application submit. */
  parentId?: string;
  /** When set, creates/updates auth user with password (no invite email). */
  password?: string;
};

export type ProvisionParentResult = {
  userId: string;
  inviteLink: string | null;
  isNewUser: boolean;
};

/** Create or link Supabase Auth user and profile after successful payment. */
export async function provisionParentAccount(
  input: ProvisionParentInput
): Promise<ProvisionParentResult> {
  const supabase = createServiceClient();
  const email = input.email.trim().toLowerCase();
  const fullName = `${input.firstName} ${input.lastName}`.trim();

  let userId: string;
  let isNewUser = false;
  let inviteLink: string | null = null;

  const { data: listData } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 200,
  });
  const existing = listData.users.find(
    (u) => u.email?.toLowerCase() === email
  );

  if (input.password) {
    if (existing) {
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        existing.id,
        {
          password: input.password,
          email_confirm: true,
          user_metadata: { full_name: fullName },
        }
      );
      if (updateError) {
        throw new Error(updateError.message);
      }
      userId = existing.id;
    } else {
      const { data: created, error: createError } =
        await supabase.auth.admin.createUser({
          email,
          password: input.password,
          email_confirm: true,
          user_metadata: { full_name: fullName },
        });
      if (createError || !created.user) {
        throw new Error(createError?.message ?? 'Could not create auth user');
      }
      userId = created.user.id;
      isNewUser = true;
    }
  } else if (existing) {
    userId = existing.id;
  } else {
    const { data: created, error: createError } =
      await supabase.auth.admin.createUser({
        email,
        email_confirm: true,
        user_metadata: { full_name: fullName },
      });

    if (createError?.message?.toLowerCase().includes('already')) {
      const again = listData.users.find(
        (u) => u.email?.toLowerCase() === email
      );
      if (!again) {
        throw new Error('User exists but could not be loaded');
      }
      userId = again.id;
    } else if (createError || !created.user) {
      throw new Error(createError?.message ?? 'Could not create auth user');
    } else {
      userId = created.user.id;
      isNewUser = true;
    }
  }

  const preferred =
    input.preferredContact === 'whatsapp' ? 'whatsapp' : 'email';

  await supabase.from('profiles').upsert(
    {
      id: userId,
      role: 'parent',
      full_name: fullName,
      email,
      phone: input.phone,
      province: input.province,
      preferred_contact: preferred,
    },
    { onConflict: 'id' }
  );

  if (input.parentId) {
    await supabase
      .from('parents')
      .update({ profile_id: userId, preferred_contact: preferred })
      .eq('id', input.parentId);
  } else {
    const parentRow = await ensureParentRowLinkedToProfile({
      userId,
      email,
      firstName: input.firstName,
      lastName: input.lastName,
      phone: input.phone,
      province: input.province,
      preferredContact: preferred,
    });
    if ('error' in parentRow) {
      throw new Error(parentRow.error);
    }
  }

  // Email verification / invite flow paused — parents set password on the application form.
  if (!input.password && isNewUser) {
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ||
      'https://ilithiyana.co.za';

    const { data: linkData, error: linkError } =
      await supabase.auth.admin.generateLink({
        type: 'invite',
        email,
        options: {
          redirectTo: `${siteUrl}/login`,
        },
      });

    if (!linkError && linkData?.properties?.action_link) {
      inviteLink = linkData.properties.action_link;
    }
  }

  return { userId, inviteLink, isNewUser };
}
