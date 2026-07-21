import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

/** 舊「配送員平台代結算」入口：改導向逾期未付（商家直付） */
export default function FinanceCouriersPage() {
  redirect('/admin/finance/payout-overdue');
}
