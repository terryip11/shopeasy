import { redirect } from 'next/navigation';

/** 舊網址相容：掃碼登入已改為僅管理員使用 */
export default function LegacyAccountantQrLoginPage() {
  redirect('/login');
}
