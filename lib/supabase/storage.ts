import { createServiceClient } from '@/lib/supabase/server';

export const APPLICATION_DOCUMENTS_BUCKET = 'application-documents';

const DEFAULT_SIGNED_URL_TTL_SECONDS = 60 * 60;

function isStoragePath(value: string): boolean {
  return (
    !value.startsWith('http://') &&
    !value.startsWith('https://') &&
    value.length > 0
  );
}

export async function uploadApplicationDocument(
  file: File | Buffer,
  path: string,
  contentType?: string
): Promise<{ url: string; path: string }> {
  const supabase = createServiceClient();

  const body =
    file instanceof File ? Buffer.from(await file.arrayBuffer()) : file;

  const { data, error } = await supabase.storage
    .from(APPLICATION_DOCUMENTS_BUCKET)
    .upload(path, body, {
      contentType: contentType ?? 'application/octet-stream',
      upsert: false,
    });

  if (error) {
    throw new Error(error.message);
  }

  const signedUrl = await createApplicationDocumentSignedUrl(
    data.path,
    DEFAULT_SIGNED_URL_TTL_SECONDS
  );

  if (!signedUrl) {
    throw new Error('Upload succeeded but could not create access URL.');
  }

  return { path: data.path, url: signedUrl };
}

export async function createApplicationDocumentSignedUrl(
  storagePath: string,
  expiresInSeconds = DEFAULT_SIGNED_URL_TTL_SECONDS
): Promise<string | null> {
  if (!storagePath || !isStoragePath(storagePath)) {
    return storagePath.startsWith('http') ? storagePath : null;
  }

  const supabase = createServiceClient();
  const { data, error } = await supabase.storage
    .from(APPLICATION_DOCUMENTS_BUCKET)
    .createSignedUrl(storagePath, expiresInSeconds);

  if (error) {
    console.error('createApplicationDocumentSignedUrl:', error);
    return null;
  }

  return data.signedUrl;
}

export function buildReportStoragePath(leadId: string, filename: string): string {
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  return `reports/${leadId}/${safeName}`;
}

export function buildLearnerReportStoragePath(
  learnerId: string,
  term: string,
  academicYear: number,
  filename: string
): string {
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
  const termSlug = term.replace(/\s+/g, '_').toLowerCase();
  return `reports/${learnerId}/${termSlug}_${academicYear}_${Date.now()}_${safeName}`;
}
