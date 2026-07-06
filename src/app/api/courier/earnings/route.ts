import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth/server';
import { getCourierProfile } from '@/lib/courier/server';
import { getCourierEarningsView } from '@/lib/finance/courier-earnings-view';

export async function GET() {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: '請先登入' }, { status: 401 });
  }

  const profile = await getCourierProfile(user.id);
  if (!profile || profile.status !== 'active') {
    return NextResponse.json({ error: '配送員帳號未啟用' }, { status: 403 });
  }

  try {
    const data = await getCourierEarningsView(user.id);
    return NextResponse.json(data);
  } catch (error) {
    const msg = (error as Error).message || '';
    if (msg.includes('courier_delivery_earnings')) {
      return NextResponse.json(
        { error: '資料庫尚未建立配送員收入表，請執行 supabase/migrate-v20-courier-payroll.sql' },
        { status: 500 }
      );
    }
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
