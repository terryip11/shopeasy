import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

/** 舊「預付餘額」入口：訂閱為主後改導向財務總覽 */
export default function AdminPlatformCreditPage() {
  redirect('/admin/finance');
}
