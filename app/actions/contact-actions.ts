'use server';

import { z } from 'zod';
import {
  createAnonClient,
  createServiceClient,
} from '@/lib/supabase/server';

export const contactInputSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().optional(),
  message: z.string().min(10, 'Message must be at least 10 characters'),
});

export type ContactInput = z.infer<typeof contactInputSchema>;

export type ContactSubmitResult =
  | { success: true; messageId: string }
  | { success: false; message: string };

function getSupabaseForRpc() {
  if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return createServiceClient();
  }
  return createAnonClient();
}

function canCallSupabaseRpc(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      (process.env.SUPABASE_SERVICE_ROLE_KEY ||
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
  );
}

export async function submitContactMessage(
  raw: unknown
): Promise<ContactSubmitResult> {
  const parsed = contactInputSchema.safeParse(raw);
  if (!parsed.success) {
    const first = parsed.error.errors[0];
    return {
      success: false,
      message: first?.message ?? 'Please check the form and try again.',
    };
  }

  const { name, email, phone, message } = parsed.data;

  if (!canCallSupabaseRpc()) {
    return {
      success: false,
      message:
        'We could not send your message. Please email info@ilithiyana.co.za directly.',
    };
  }

  try {
    const supabase = getSupabaseForRpc();
    const { data: messageId, error } = await supabase.rpc(
      'submit_contact_message',
      {
        p_name: name,
        p_email: email,
        p_phone: phone ?? null,
        p_message: message,
      }
    );

    if (error) {
      console.error('submit_contact_message RPC error:', error);
      return {
        success: false,
        message:
          'We could not send your message. Please try again or email info@ilithiyana.co.za.',
      };
    }

    return {
      success: true,
      messageId: messageId as string,
    };
  } catch (error) {
    console.error('Contact submit error:', error);
    return {
      success: false,
      message:
        'Something went wrong. Please try again or email info@ilithiyana.co.za.',
    };
  }
}
