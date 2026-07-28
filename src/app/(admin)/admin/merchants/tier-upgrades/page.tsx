import { getPendingTierUpgrades } from '@/lib/admin/tier-upgrade-actions';
import { TierUpgradeApprovalList } from '@/components/admin/tier-upgrade-approval-list';
import type { MerchantTier } from '@/lib/merchant/tier-config';

export const dynamic = 'force-dynamic';

type UpgradeRow = {
  id: string;
  merchant_id: string;
  current_tier: MerchantTier;
  requested_tier: MerchantTier;
  note: string | null;
  applied_at: string;
  merchants: { name: string; slug: string; tier: MerchantTier } | null;
};

export default async function TierUpgradesPage() {
  const pending = (await getPendingTierUpgrades()) as UpgradeRow[];

  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold">訂閱升級確認</h1>
      <p className="mb-6 text-sm text-gray-500">
        商家已以 FPS 轉帳並回報付款。請核對銀行／轉數快到帳後再通過；通過後會開通一個月訂閱。
      </p>
      <TierUpgradeApprovalList initial={pending} />
    </div>
  );
}
