import type { Metadata } from 'next';
import { noIndexMetadata } from '@/lib/seo';

export const metadata: Metadata = noIndexMetadata;

export default function ApplySuccessLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
