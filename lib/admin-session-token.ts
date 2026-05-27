/** Edge-safe admin session token (Web Crypto). Used by middleware and server actions. */

export const ADMIN_SESSION_COOKIE = 'ilithiyana_admin_session';

export function getAdminSessionSecret(): string {
  return process.env.ADMIN_SESSION_SECRET || 'dev-secret-change-me';
}

function base64UrlEncode(payload: string): string {
  const bytes = new TextEncoder().encode(payload);
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlDecode(payloadB64: string): string | null {
  try {
    const padded = payloadB64.replace(/-/g, '+').replace(/_/g, '/');
    const pad =
      padded.length % 4 === 0 ? '' : '='.repeat(4 - (padded.length % 4));
    const binary = atob(padded + pad);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  } catch {
    return null;
  }
}

async function hmacSha256Hex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

export async function signAdminSessionToken(
  email: string,
  maxAgeSeconds: number
): Promise<string> {
  const expires = Date.now() + maxAgeSeconds * 1000;
  const payload = `${email}:${expires}`;
  const sig = await hmacSha256Hex(getAdminSessionSecret(), payload);
  return `${base64UrlEncode(payload)}.${sig}`;
}

export async function verifyAdminSessionToken(token: string): Promise<boolean> {
  const parts = token.split('.');
  if (parts.length !== 2) return false;

  const [payloadB64, sig] = parts;
  const payload = base64UrlDecode(payloadB64);
  if (!payload) return false;

  const expected = await hmacSha256Hex(getAdminSessionSecret(), payload);
  if (!timingSafeEqualHex(sig, expected)) return false;

  const [, expiresStr] = payload.split(':');
  const expires = Number(expiresStr);
  if (!expires || Date.now() > expires) return false;

  return true;
}
