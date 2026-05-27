import { packages } from '@/lib/site-config';

export function packageDisplayLabel(packageId: string): string {
  const pkg = packages.find((p) => p.id === packageId);
  return pkg?.name ?? 'Your package';
}
