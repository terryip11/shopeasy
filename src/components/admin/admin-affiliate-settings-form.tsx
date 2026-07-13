'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { AffiliatePlatformSettings } from '@/lib/affiliate/settings';

export function AdminAffiliateSettingsForm({
  initial,
}: {
  initial: AffiliatePlatformSettings;
}) {
  const [settings, setSettings] = useState(initial);
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
      const res = await fetch('/api/admin/affiliate/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled: settings.enabled,
          platformCutRate: settings.platformCutRate,
          attributionDays: settings.attributionDays,
          minCommissionRate: settings.minCommissionRate,
          maxCommissionRate: settings.maxCommissionRate,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '儲存失敗');
      setSettings(data.settings);
      setMessage('已儲存分享系統設定');
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={settings.enabled}
          onChange={(e) => setSettings((s) => ({ ...s, enabled: e.target.checked }))}
        />
        啟用全站分享推廣系統
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label>平台對佣金抽成 (%)</Label>
          <Input
            type="number"
            min={0}
            max={100}
            className="mt-1"
            value={Math.round(settings.platformCutRate * 100)}
            onChange={(e) =>
              setSettings((s) => ({
                ...s,
                platformCutRate: Number(e.target.value) / 100,
              }))
            }
          />
        </div>
        <div>
          <Label>歸屬有效期（天）</Label>
          <Input
            type="number"
            min={1}
            max={365}
            className="mt-1"
            value={settings.attributionDays}
            onChange={(e) =>
              setSettings((s) => ({
                ...s,
                attributionDays: Number(e.target.value),
              }))
            }
          />
        </div>
        <div>
          <Label>商家願意給分享員的最低佣金 (%)</Label>
          <Input
            type="number"
            min={0}
            max={100}
            className="mt-1"
            value={Math.round(settings.minCommissionRate * 100)}
            onChange={(e) =>
              setSettings((s) => ({
                ...s,
                minCommissionRate: Number(e.target.value) / 100,
              }))
            }
          />
        </div>
        <div>
          <Label>商家願意給分享員的最高佣金 (%)</Label>
          <Input
            type="number"
            min={0}
            max={100}
            className="mt-1"
            value={Math.round(settings.maxCommissionRate * 100)}
            onChange={(e) =>
              setSettings((s) => ({
                ...s,
                maxCommissionRate: Number(e.target.value) / 100,
              }))
            }
          />
        </div>
      </div>

      {error && <p className="text-sm text-red-500">{error}</p>}
      {message && <p className="text-sm text-green-600">{message}</p>}

      <Button type="button" onClick={() => void save()} disabled={saving}>
        {saving ? '儲存中...' : '儲存設定'}
      </Button>
    </div>
  );
}
