export function subscriptionDisplayStatus(
  status: string
): 'active' | 'pending' | 'overdue' | 'cancelled' {
  if (status === 'active' || status === 'paid') return 'active';
  if (status === 'overdue') return 'overdue';
  if (status === 'cancelled') return 'cancelled';
  return 'pending';
}

export function formatCents(cents: number): string {
  return `R${(cents / 100).toLocaleString('en-ZA', { minimumFractionDigits: 0 })}`;
}
