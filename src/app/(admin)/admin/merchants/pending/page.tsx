import { getPendingMerchants } from '@/lib/admin/merchant-actions';
import { MerchantApprovalList } from '@/components/admin/merchant-approval-list';
import type { Database } from '@/types/database';

export const dynamic = 'force-dynamic';

type Merchant = Database['public']['Tables']['merchants']['Row'];

export default async function MerchantPendingPage() {
  const pending = (await getPendingMerchants()) as Merchant[];

  return (
    <div>
      <h1 className="text-2xl font-bold mb-2">商家審核</h1>
      <p className="text-sm text-gray-500 mb-6">
        審核香港公司入駐申請，請核對 BR、CI 及聯絡資料。通過後將開通商家後台。
      </p>
      <MerchantApprovalList initial={pending} />
    </div>
  );
}
