'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Props = {
  month: string;
  initial: {
    supabase_cost: number;
    r2_cost: number;
    stripe_fees_reported: number;
    other_cost: number;
    notes: string | null;
  } | null;
};

export function FinanceMonthlyCostsForm({ month, initial }: Props) {
  const router = useRouter();
  const [supabaseCost, setSupabaseCost] = useState(String(initial?.supabase_cost ?? ''));
  const [r2Cost, setR2Cost] = useState(String(initial?.r2_cost ?? ''));
  const [stripeReported, setStripeReported] = useState(
    String(initial?.stripe_fees_reported ?? '')
  );
  const [otherCost, setOtherCost] = useState(String(initial?.other_cost ?? ''));
  const [notes, setNotes] = useState(initial?.notes ?? '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const save = async () => {
    setSaving(true);
    setError('');
    setMessage('');

    const res = await fetch('/api/admin/finance/monthly-costs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        month,
        supabase_cost: Number(supabaseCost) || 0,
        r2_cost: Number(r2Cost) || 0,
        stripe_fees_reported: Number(stripeReported) || 0,
        other_cost: Number(otherCost) || 0,
        notes: notes.trim() || null,
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error || '儲存失敗');
      setSaving(false);
      return;
    }

    setMessage('本月成本已儲存，新訂單將依當月訂單數分攤基礎設施成本');
    router.refresh();
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        記錄 {month.slice(0, 7)} 的固定成本（Supabase、R2 等）。儲存後，每筆新付款訂單會自動分攤
        (Supabase + R2 + 其他) ÷ 當月訂單數。
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="supabase-cost">Supabase (HKD)</Label>
          <Input
            id="supabase-cost"
            type="number"
            min={0}
            step={0.01}
            value={supabaseCost}
            onChange={(e) => setSupabaseCost(e.target.value)}
            className="mt-1"
            placeholder="0"
          />
        </div>
        <div>
          <Label htmlFor="r2-cost">Cloudflare R2 (HKD)</Label>
          <Input
            id="r2-cost"
            type="number"
            min={0}
            step={0.01}
            value={r2Cost}
            onChange={(e) => setR2Cost(e.target.value)}
            className="mt-1"
            placeholder="0"
          />
        </div>
        <div>
          <Label htmlFor="stripe-reported">Stripe 帳單實際費用（對帳用，可選）</Label>
          <Input
            id="stripe-reported"
            type="number"
            min={0}
            step={0.01}
            value={stripeReported}
            onChange={(e) => setStripeReported(e.target.value)}
            className="mt-1"
            placeholder="0"
          />
        </div>
        <div>
          <Label htmlFor="other-cost">其他成本 (HKD)</Label>
          <Input
            id="other-cost"
            type="number"
            min={0}
            step={0.01}
            value={otherCost}
            onChange={(e) => setOtherCost(e.target.value)}
            className="mt-1"
            placeholder="0"
          />
        </div>
        <div className="sm:col-span-2">
          <Label htmlFor="cost-notes">備註</Label>
          <Input
            id="cost-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="mt-1"
            placeholder="例如：6 月 Supabase Pro 帳單"
          />
        </div>
      </div>
      {error && <p className="text-sm text-red-500">{error}</p>}
      {message && <p className="text-sm text-green-600">{message}</p>}
      <Button type="button" onClick={save} disabled={saving}>
        {saving ? '儲存中...' : '儲存本月成本'}
      </Button>
    </div>
  );
}
