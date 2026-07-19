import Link from 'next/link';
import { AlertTriangle, Wallet } from 'lucide-react';

type Props = {
  balance: number;
  /** 餘額低於或等於此值時顯示警告（預設 50） */
  lowThreshold?: number;
};

/** 商家中心：預付餘額不足／為零時的提示橫幅 */
export function MerchantCreditBanner({ balance, lowThreshold = 50 }: Props) {
  if (balance > lowThreshold) return null;

  const isEmpty = balance <= 0;

  return (
    <div
      className={`flex flex-col gap-3 rounded-xl border px-4 py-3 sm:flex-row sm:items-center sm:justify-between ${
        isEmpty
          ? 'border-red-200 bg-red-50 text-red-900 dark:border-red-900 dark:bg-red-950/40 dark:text-red-100'
          : 'border-amber-200 bg-amber-50 text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100'
      }`}
    >
      <div className="flex items-start gap-3">
        {isEmpty ? (
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0" />
        ) : (
          <Wallet className="mt-0.5 h-5 w-5 shrink-0" />
        )}
        <div className="text-sm">
          <p className="font-semibold">
            {isEmpty
              ? '平台服務費預付餘額為 HK$0'
              : `平台服務費預付餘額偏低（HK$${balance.toFixed(2)}）`}
          </p>
          <p className="mt-0.5 opacity-90">
            {isEmpty
              ? '線下訂單（FPS／銀行／微信／支付寶）將無法確認收款，請先儲值。'
              : '餘額不足時將無法確認線下收款，建議盡快儲值。'}
          </p>
        </div>
      </div>
      <Link
        href="/dashboard/credits"
        className={`inline-flex shrink-0 items-center justify-center rounded-lg px-3 py-2 text-sm font-medium ${
          isEmpty
            ? 'bg-red-600 text-white hover:bg-red-700'
            : 'bg-amber-700 text-white hover:bg-amber-800'
        }`}
      >
        前往儲值
      </Link>
    </div>
  );
}
