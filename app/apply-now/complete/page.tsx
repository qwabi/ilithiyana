import { redirect } from 'next/navigation';

/** Legacy PayFast return path — forwards to success → /payment/return. */
export default function ApplyCompletePage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(searchParams)) {
    const v = Array.isArray(value) ? value[0] : value;
    if (v) params.set(key, v);
  }
  const qs = params.toString();
  redirect(`/apply-now/success${qs ? `?${qs}` : ''}`);
}
