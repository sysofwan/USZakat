/**
 * Determine payment status based on total due vs paid.
 */
export function getPaymentStatus(totalDue: number, totalPaid: number) {
  if (totalPaid <= 0) return { label: 'Unpaid', color: 'error' as const };
  if (totalPaid >= totalDue - 0.01) return { label: 'Settled', color: 'success' as const };
  return { label: 'Partially Paid', color: 'warning' as const };
}
