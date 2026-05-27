import { createServiceClient } from '@/lib/supabase/server';

const BUCKET = 'tutor-documents';

export function tutorDocumentStoragePath(
  tutorId: string,
  fileName: string
): string {
  const safe = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  return `${tutorId}/${Date.now()}-${safe}`;
}

export async function createTutorDocumentSignedUploadUrl(
  storagePath: string
): Promise<string> {
  const supabase = createServiceClient();
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUploadUrl(storagePath);

  if (error || !data?.signedUrl) {
    throw error ?? new Error('Could not create upload URL');
  }

  return data.signedUrl;
}

export async function createTutorDocumentSignedDownloadUrl(
  storagePath: string,
  expiresInSeconds = 3600
): Promise<string> {
  const supabase = createServiceClient();
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, expiresInSeconds);

  if (error || !data?.signedUrl) {
    throw error ?? new Error('Could not create download URL');
  }

  return data.signedUrl;
}
