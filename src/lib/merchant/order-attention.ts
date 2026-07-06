/** 待處理訂單：待付款 + 已付款待發貨 */

export function countsTowardAttention(status: string | undefined | null): boolean {
  return status === 'pending' || status === 'paid';
}

export function attentionDelta(
  oldStatus: string | undefined | null,
  newStatus: string | undefined | null
): number {
  const was = countsTowardAttention(oldStatus);
  const now = countsTowardAttention(newStatus);
  if (!was && now) return 1;
  if (was && !now) return -1;
  return 0;
}
