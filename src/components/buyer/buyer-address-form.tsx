'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { Database } from '@/types/database';

type BuyerAddress = Database['public']['Tables']['buyer_addresses']['Row'];

type Zone = { id: string; name: string };

export type BuyerAddressFormValues = {
  label: string;
  name: string;
  phone: string;
  zone_id: string;
  address: string;
  is_default: boolean;
};

type Props = {
  zones: Zone[];
  initial?: Partial<BuyerAddressFormValues>;
  submitLabel?: string;
  onSubmit: (values: BuyerAddressFormValues) => Promise<void>;
  onCancel?: () => void;
};

const selectClassName =
  'mt-1.5 flex h-11 w-full rounded-xl border border-input bg-background px-3.5 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:bg-gray-900';

const textareaClassName =
  'mt-1.5 flex min-h-[100px] w-full resize-y rounded-xl border border-input bg-background px-3.5 py-3 text-sm leading-relaxed ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:bg-gray-900';

export function buyerAddressToFormValues(addr: BuyerAddress): BuyerAddressFormValues {
  return {
    label: addr.label ?? '',
    name: addr.name,
    phone: addr.phone,
    zone_id: addr.zone_id,
    address: addr.address,
    is_default: addr.is_default,
  };
}

export function BuyerAddressForm({
  zones,
  initial,
  submitLabel = '儲存地址',
  onSubmit,
  onCancel,
}: Props) {
  const [label, setLabel] = useState(initial?.label ?? '');
  const [name, setName] = useState(initial?.name ?? '');
  const [phone, setPhone] = useState(initial?.phone ?? '');
  const [zoneId, setZoneId] = useState(initial?.zone_id ?? '');
  const [address, setAddress] = useState(initial?.address ?? '');
  const [isDefault, setIsDefault] = useState(initial?.is_default ?? false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await onSubmit({
        label,
        name,
        phone,
        zone_id: zoneId,
        address,
        is_default: isDefault,
      });
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="addr-label">地址標籤（選填）</Label>
        <Input
          id="addr-label"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="家、公司、分店…"
          className="mt-1.5"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="addr-name">收件人姓名 *</Label>
          <Input
            id="addr-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoComplete="name"
            className="mt-1.5"
          />
        </div>
        <div>
          <Label htmlFor="addr-phone">聯絡電話 *</Label>
          <Input
            id="addr-phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            autoComplete="tel"
            className="mt-1.5"
          />
        </div>
      </div>
      <div>
        <Label htmlFor="addr-zone">配送區域 *</Label>
        <select
          id="addr-zone"
          value={zoneId}
          onChange={(e) => setZoneId(e.target.value)}
          required
          className={selectClassName}
        >
          <option value="">請選擇</option>
          {zones.map((z) => (
            <option key={z.id} value={z.id}>
              {z.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <Label htmlFor="addr-address">詳細地址 *</Label>
        <textarea
          id="addr-address"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          required
          rows={4}
          autoComplete="street-address"
          className={textareaClassName}
        />
      </div>
      <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
        <input
          type="checkbox"
          checked={isDefault}
          onChange={(e) => setIsDefault(e.target.checked)}
          className="rounded border-gray-300"
        />
        設為預設地址
      </label>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <div className="flex gap-2">
        <Button type="submit" disabled={saving}>
          {saving ? '儲存中...' : submitLabel}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
            取消
          </Button>
        )}
      </div>
    </form>
  );
}
