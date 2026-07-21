'use client';

import { useCallback, useEffect, useState } from 'react';
import Image from 'next/image';
import { Copy, Check, Link2, Loader2, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { normalizeR2ImageUrl } from '@/lib/storage/r2-public-url';
import { shareOrCopyUrl } from '@/lib/share/client';
import { ReportUnpaidButton } from '@/components/shared/report-unpaid-button';
type ShareableProduct = {
  id: string;
  name: string;
  price: number;
  images: string[];
  commissionRate: number;
  merchant: { id: string; name: string; slug: string };
};

type ShareLink = {
  id: string;
  code: string;
  clickCount: number;
  shareUrl: string;
  product: { id: string; name: string; price: number; images: string[] } | null;
  merchant: { name: string; slug: string } | null;
};

type EarningsSummary = {
  pending: number;
  confirmed: number;
  paid: number;
};

type EarningRow = {
  id: string;
  netAmount: number;
  status: string;
  createdAt: string;
  merchantPaidAt: string | null;
  overdueDays: number;
  canReportUnpaid: boolean;
  merchantName: string;
  orderId: string | null;
};

export function PromoterDashboard() {
  const [products, setProducts] = useState<ShareableProduct[]>([]);
  const [links, setLinks] = useState<ShareLink[]>([]);
  const [summary, setSummary] = useState<EarningsSummary | null>(null);
  const [earnings, setEarnings] = useState<EarningRow[]>([]);
  const [merchantDirect, setMerchantDirect] = useState(false);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [productsRes, linksRes, earningsRes] = await Promise.all([
        fetch('/api/promoter/products'),
        fetch('/api/promoter/share-links'),
        fetch('/api/promoter/earnings'),
      ]);

      const productsData = await productsRes.json();
      const linksData = await linksRes.json();
      const earningsData = await earningsRes.json();

      if (!productsRes.ok) throw new Error(productsData.error || '載入商品失敗');
      if (!linksRes.ok) throw new Error(linksData.error || '載入連結失敗');
      if (!earningsRes.ok) throw new Error(earningsData.error || '載入收益失敗');

      setProducts(productsData.products || []);
      setLinks(linksData.links || []);
      setSummary(earningsData.summary || null);
      setEarnings(earningsData.earnings || []);
      setMerchantDirect(Boolean(earningsData.merchantDirect));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const createLink = async (productId: string) => {
    setCreating(productId);
    setError('');
    try {
      const res = await fetch('/api/promoter/share-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '建立連結失敗');
      await load();
      await shareLink(data.shareUrl, '新分享連結', productId);    } catch (err) {
      setError((err as Error).message);
    } finally {
      setCreating(null);
    }
  };

  const shareLink = async (url: string, title: string, key: string) => {
    setError('');
    const result = await shareOrCopyUrl(url, {
      title: `${title}｜ShopEasy`,
      text: '透過我的分享連結選購',
    });

    if (result === 'cancelled') return;

    if (result === 'shared' || result === 'copied') {
      setCopied(key);
      window.setTimeout(() => setCopied(null), 2000);
      return;
    }

    setError('無法分享或複製連結，請稍後再試');
  };
  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-gray-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        載入中...
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {summary && (
        <section className="grid grid-cols-3 gap-3">
          <StatCard label="待結算" value={summary.pending} />
          <StatCard label="已確認" value={summary.confirmed} />
          <StatCard label="已付款" value={summary.paid} />
        </section>
      )}

      {earnings.length > 0 && (
        <section>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">佣金明細</h2>
          {merchantDirect && (
            <p className="mt-1 text-sm text-gray-500">
              佣金由商家以 FPS 直接支付。若逾期未付，可向平台回報（平台不代墊）。
            </p>
          )}
          <ul className="mt-3 divide-y divide-gray-100 overflow-hidden rounded-2xl border border-gray-200 bg-white dark:divide-gray-800 dark:border-gray-800 dark:bg-gray-900">
            {earnings.map((row) => (
              <li key={row.id} className="flex items-start justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 dark:text-white">
                    HK${row.netAmount.toFixed(2)}
                    <span className="ml-2 text-xs font-normal text-gray-500">
                      {row.merchantPaidAt || row.status === 'paid'
                        ? '已付款'
                        : row.status === 'confirmed'
                          ? '已確認'
                          : '待結算'}
                    </span>
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {row.merchantName}
                    {row.orderId ? ` · 訂單 #${row.orderId.slice(0, 8)}` : ''}
                    {!row.merchantPaidAt && row.overdueDays > 0
                      ? ` · 已待付 ${row.overdueDays} 天`
                      : ''}
                  </p>
                </div>
                {row.canReportUnpaid && (
                  <ReportUnpaidButton earningType="promoter" earningId={row.id} />
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">可推廣商品</h2>
        <p className="mt-1 text-sm text-gray-500">選擇商品建立專屬分享連結，買家透過連結下單後可獲佣金。</p>

        {products.length === 0 ? (
          <p className="mt-4 rounded-xl border border-dashed border-gray-200 py-10 text-center text-sm text-gray-500">
            暫無開放分享的商品
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {products.map((product) => {
              const imageUrl = normalizeR2ImageUrl(product.images?.[0]) ?? '/next.svg';
              const existing = links.find((l) => l.product?.id === product.id);
              return (
                <div
                  key={product.id}
                  className="flex gap-3 rounded-2xl border border-gray-200 bg-white p-3 dark:border-gray-800 dark:bg-gray-900"
                >
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-gray-100">
                    <Image src={imageUrl} alt={product.name} fill className="object-cover" sizes="64px" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm font-medium text-gray-900 dark:text-white">
                      {product.name}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-500">{product.merchant.name}</p>
                    <p className="mt-1 text-sm font-bold text-orange-600">
                      HK${product.price.toFixed(2)}
                      <span className="ml-2 text-xs font-normal text-gray-500">
                        佣金 {(product.commissionRate * 100).toFixed(0)}%
                      </span>
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col gap-2">
                    {existing ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() =>
                          void shareLink(
                            existing.shareUrl,
                            product.name,
                            product.id
                          )
                        }
                      >
                        {copied === product.id ? (
                          <>
                            <Check className="mr-1 h-4 w-4" />
                            已複製
                          </>
                        ) : (
                          <>
                            <Copy className="mr-1 h-4 w-4" />
                            複製連結
                          </>
                        )}                      </Button>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        disabled={creating === product.id}
                        onClick={() => void createLink(product.id)}
                      >
                        {creating === product.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <><Link2 className="mr-1 h-4 w-4" />建立連結</>
                        )}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {links.length > 0 && (
        <section>
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">我的分享連結</h2>
          <div className="mt-3 space-y-2">
            {links.map((link) => (
              <div
                key={link.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm dark:border-gray-800 dark:bg-gray-900"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{link.product?.name ?? '商品'}</p>
                  <p className="text-xs text-gray-500">
                    點擊 {link.clickCount} 次 · {link.merchant?.name}
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="shrink-0"
                  title={copied === link.id ? '已複製連結' : '分享或複製連結'}
                  aria-label={copied === link.id ? '已複製連結' : '分享或複製連結'}
                  onClick={() =>
                    void shareLink(
                      link.shareUrl,
                      link.product?.name ?? '分享商品',
                      link.id
                    )
                  }
                >
                  {copied === link.id ? (
                    <span className="flex items-center gap-1 text-green-600">
                      <Check className="h-4 w-4" />
                      <span className="text-xs">已複製</span>
                    </span>
                  ) : (
                    <Share2 className="h-4 w-4" />
                  )}
                </Button>              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <p className="text-xs text-gray-500">{label}</p>
      <p className="mt-1 text-xl font-bold text-gray-900 dark:text-white">HK${value.toFixed(2)}</p>
    </div>
  );
}
