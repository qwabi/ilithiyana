/** Routes that use app chrome instead of the fixed marketing navbar. */
export const HIDE_MARKETING_NAV_PREFIXES = [
  '/dashboard',
  '/onboarding',
  '/payment/return',
  '/login',
  '/tutor',
  '/admin',
] as const;

export const APP_FLOW_HEADER_PREFIXES = ['/onboarding', '/payment/return'] as const;

export function matchesPrefix(pathname: string, prefixes: readonly string[]): boolean {
  return prefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export function showsMarketingNavbar(pathname: string): boolean {
  return !matchesPrefix(pathname, HIDE_MARKETING_NAV_PREFIXES);
}
