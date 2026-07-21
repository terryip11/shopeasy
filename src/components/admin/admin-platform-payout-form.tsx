'use client';

import { useEffect, useState } from 'react';
import { ScanLine } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { PlatformPayoutSettings } from '@/lib/finance/platform-payout-types';

type Props = {
  initial: PlatformPayoutSettings;
  canEdit: boolean;
};

export function AdminPlatformPayoutForm({ initial, canEdit }: Props) {
  const [settings, setSettings] = useState<PlatformPayoutSettings>(initial);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setSettings(initial);
  }, [initial]);

  const save = async () => {
    setSaving(true);
    setMessage('');
    setError('');
    try {
      const res = await fetch('/api/admin/platform-payout', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountHolder: settings.accountHolder,
          fpsId: settings.fpsId,
          instructions: settings.instructions,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '儲存失敗');
      setSettings(data.settings as PlatformPayoutSettings);
      setMessage('已儲存平台收款設定');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-4 dark:border-blue-900/50 dark:bg-blue-950/20">
        <div className="flex items-start gap-3">
          <ScanLine className="mt-0.5 h-5 w-5 shrink-0 text-blue-600 dark:text-blue-400" />
          <div className="text-sm text-blue-900 dark:text-blue-100">
            <p className="font-medium">用途說明</p>
            <ul className="mt-2 list-inside list-disc space-y-1 text-blue-800/90 dark:text-blue-200/90">
              <li>平台以訂閱為主；此 FPS 供公司收款／例外用途，不向商家強制預存服務費</li>
              <li>線下訂單貨款由商家直接收取；分享員／配送員工資亦由商家 FPS 直付</li>
              <li>開通 Stripe Connect 後，卡款可走持牌通道；請避免平台自行代管買家貨款</li>
            </ul>
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label htmlFor="platform-fps-holder">FPS 收款人姓名</Label>
          <Input
            id="platform-fps-holder"
            value={settings.accountHolder}
            onChange={(e) =>
              setSettings((s) => ({ ...s, accountHolder: e.target.value }))
            }
            placeholder="與銀行／FPS 登記姓名一致"
            className="mt-1"
            disabled={!canEdit}
          />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="platform-fps-id">轉數快 FPS 識別碼</Label>
          <Input
            id="platform-fps-id"
            value={settings.fpsId}
            onChange={(e) => setSettings((s) => ({ ...s, fpsId: e.target.value }))}
            placeholder="手機號碼、電郵或 FPS ID"
            className="mt-1"
            disabled={!canEdit}
          />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="platform-payout-instructions">給商家的轉帳備註（選填）</Label>
          <Input
            id="platform-payout-instructions"
            value={settings.instructions}
            onChange={(e) =>
              setSettings((s) => ({ ...s, instructions: e.target.value }))
            }
            placeholder="例：請於備註填寫店鋪名稱"
            className="mt-1"
            disabled={!canEdit}
          />
        </div>
      </div>

      {!canEdit && (
        <p className="text-sm text-gray-500">僅全權管理員可修改；會計員可查看此收款資料。</p>
      )}

      {message && <p className="text-sm text-green-600">{message}</p>}
      {error && <p className="text-sm text-red-500">{error}</p>}

      {canEdit && (
        <Button type="button" onClick={() => void save()} disabled={saving}>
          {saving ? '儲存中...' : '儲存設定'}
        </Button>
      )}
    </div>
  );
}
