'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ScanLine, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PROMOTER_TERMS_BODY, PROMOTER_TERMS_TITLE } from '@/lib/promoter/apply';
import { validatePromoterFpsPayout } from '@/lib/promoter/payout';

export function PromoterApplyForm() {
  const router = useRouter();
  const [accountHolder, setAccountHolder] = useState('');
  const [fpsId, setFpsId] = useState('');
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const payoutError = validatePromoterFpsPayout({ accountHolder, fpsId });
    if (payoutError) {
      setError(payoutError);
      return;
    }

    if (!termsAccepted) {
      setError('請閱讀並同意分享員計劃條款');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/promoter/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          terms_accepted: true,
          payout_account_holder: accountHolder.trim(),
          payout_fps_id: fpsId.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '登記失敗');

      router.push('/promoter');
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  };

  return (
    <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6">
      <div className="rounded-xl border border-violet-200 bg-violet-50/60 p-4 dark:border-violet-900/50 dark:bg-violet-950/20">
        <div className="flex items-center gap-2 text-violet-800 dark:text-violet-200">
          <Share2 className="h-5 w-5" />
          <h2 className="font-semibold">分享員可以做什麼？</h2>
        </div>
        <ul className="mt-3 space-y-2 text-sm text-violet-900/90 dark:text-violet-100/90">
          <li>• 為已開放分享的商品建立專屬推廣連結</li>
          <li>• 好友透過連結下單並付款後，依佣金比例獲得收入</li>
          <li>• 於分享員中心查看連結成效與佣金紀錄</li>
        </ul>
      </div>

      <div className="space-y-4 rounded-xl border border-blue-200 bg-blue-50/40 p-4 dark:border-blue-900/50 dark:bg-blue-950/20">
        <div className="flex items-center gap-2">
          <ScanLine className="h-5 w-5 text-blue-600 dark:text-blue-400" />
          <h3 className="font-medium text-gray-900 dark:text-white">
            轉數快（FPS）收款資料 <span className="text-red-500">*</span>
          </h3>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          佣金將透過轉數快撥付至您登記的 FPS 帳戶，請確保資料與銀行／FPS 登記一致。
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="promoter-fps-holder">收款人姓名</Label>
            <Input
              id="promoter-fps-holder"
              value={accountHolder}
              onChange={(e) => setAccountHolder(e.target.value)}
              placeholder="與 FPS 登記姓名一致"
              className="mt-1"
              required
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="promoter-fps-id">FPS 識別碼</Label>
            <Input
              id="promoter-fps-id"
              value={fpsId}
              onChange={(e) => setFpsId(e.target.value)}
              placeholder="手機號碼、電郵或 FPS ID"
              className="mt-1"
              required
            />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
        <h3 className="font-medium text-gray-900 dark:text-white">{PROMOTER_TERMS_TITLE}</h3>
        <p className="mt-3 whitespace-pre-line text-sm leading-relaxed text-gray-600 dark:text-gray-300">
          {PROMOTER_TERMS_BODY}
        </p>
        <label className="mt-4 flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
          <input
            type="checkbox"
            checked={termsAccepted}
            onChange={(e) => setTermsAccepted(e.target.checked)}
            className="mt-1 h-4 w-4 rounded border-gray-300"
          />
          <span>我已閱讀並同意上述條款</span>
        </label>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}

      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={loading || !termsAccepted}>
          {loading ? '登記中...' : '確認登記成為分享員'}
        </Button>
        <Button type="button" variant="outline" asChild>
          <Link href="/account">返回我的帳號</Link>
        </Button>
      </div>
    </form>
  );
}
