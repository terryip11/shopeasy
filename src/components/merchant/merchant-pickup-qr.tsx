'use client';

import { useRef } from 'react';
import { Printer } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import { buildPickupQrPayload } from '@/lib/delivery/pickup-code';

type Props = {
  jobId: string;
  pickupCode: string;
  pickupAddress?: string | null;
  orderId?: string | null;
  compact?: boolean;
};

export function MerchantPickupQr({
  jobId,
  pickupCode,
  pickupAddress,
  orderId,
  compact,
}: Props) {
  const qrWrapRef = useRef<HTMLDivElement>(null);
  const payload = buildPickupQrPayload(jobId, pickupCode);
  const size = compact ? 140 : 200;

  const handlePrint = () => {
    const svg = qrWrapRef.current?.querySelector('svg');
    if (!svg) return;

    const orderLabel = orderId ? `#${orderId.slice(0, 8)}` : '';
    const addressHtml = pickupAddress
      ? `<p style="margin:12px 0 0;font-size:14px;color:#333;text-align:center;">取件：${escapeHtml(pickupAddress)}</p>`
      : '';

    const html = `<!DOCTYPE html>
<html lang="zh-Hant">
<head>
  <meta charset="utf-8" />
  <title>取件 QR ${escapeHtml(orderLabel)}</title>
  <style>
    @page { margin: 12mm; }
    body {
      font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
      margin: 0;
      padding: 24px;
      color: #111;
    }
    .slip {
      max-width: 360px;
      margin: 0 auto;
      text-align: center;
    }
    h1 { font-size: 20px; margin: 0 0 4px; }
    .sub { font-size: 13px; color: #555; margin: 0 0 16px; }
    .qr {
      display: inline-block;
      padding: 12px;
      border: 1px solid #ddd;
      border-radius: 12px;
      background: #fff;
    }
    .qr svg { display: block; width: 220px; height: 220px; }
    .code {
      margin: 16px 0 4px;
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 28px;
      font-weight: 700;
      letter-spacing: 0.2em;
    }
    .hint { font-size: 12px; color: #666; margin: 0; }
  </style>
</head>
<body>
  <div class="slip">
    <h1>ShopEasy 取件 QR</h1>
    <p class="sub">${orderLabel ? `訂單 ${escapeHtml(orderLabel)}` : '請貼於貨件上供配送員掃描'}</p>
    <div class="qr">${svg.outerHTML}</div>
    <p class="code">${escapeHtml(pickupCode)}</p>
    <p class="hint">掃描失敗時可手動輸入上方確認碼</p>
    ${addressHtml}
  </div>
</body>
</html>`;

    // 用隱藏 iframe 列印，避免彈出視窗被擋或寫入 about:blank 失敗
    const iframe = document.createElement('iframe');
    iframe.setAttribute('aria-hidden', 'true');
    iframe.style.cssText =
      'position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;pointer-events:none;';
    document.body.appendChild(iframe);

    const frameWindow = iframe.contentWindow;
    const frameDoc = iframe.contentDocument || frameWindow?.document;
    if (!frameWindow || !frameDoc) {
      iframe.remove();
      alert('無法準備列印，請稍後再試');
      return;
    }

    frameDoc.open();
    frameDoc.write(html);
    frameDoc.close();

    const cleanup = () => {
      iframe.remove();
    };

    const doPrint = () => {
      try {
        frameWindow.focus();
        frameWindow.print();
      } finally {
        // 等列印對話框關閉後再清掉（部分瀏覽器會立刻繼續）
        window.setTimeout(cleanup, 1000);
      }
    };

    // 等 SVG／樣式就緒再列印
    if (frameDoc.readyState === 'complete') {
      window.setTimeout(doPrint, 50);
    } else {
      iframe.onload = () => window.setTimeout(doPrint, 50);
    }
  };

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4 dark:border-amber-900 dark:bg-amber-950/30 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-gray-900 dark:text-white">取件 QR 碼</h2>
          <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
            請於配送員到店時出示此 QR，掃描後才能確認取件。也可列印貼在貨件上。
          </p>
        </div>
        <Button type="button" variant="outline" size="sm" className="shrink-0 gap-1.5" onClick={handlePrint}>
          <Printer className="h-4 w-4" />
          列印 QR
        </Button>
      </div>
      {pickupAddress && (
        <p className="mt-2 text-sm text-gray-700 dark:text-gray-300">
          取件地址：{pickupAddress}
        </p>
      )}
      <div className="mt-4 flex flex-col items-center gap-3">
        <div ref={qrWrapRef} className="rounded-xl bg-white p-3 shadow-sm">
          <QRCodeSVG value={payload} size={size} level="M" includeMargin />
        </div>
        <p className="font-mono text-lg font-semibold tracking-widest text-gray-900 dark:text-white">
          {pickupCode}
        </p>
        <p className="text-xs text-gray-500">掃描失敗時可請配送員手動輸入此確認碼</p>
      </div>
    </div>
  );
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
