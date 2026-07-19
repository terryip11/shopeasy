'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MapPin, Pencil, Plus, Star, Trash2 } from 'lucide-react';

export type PickupLocationItem = {
  id: string;
  name: string;
  address: string;
  contact_name: string | null;
  contact_phone: string | null;
  is_default: boolean;
};

type FormState = {
  name: string;
  address: string;
  contact_name: string;
  contact_phone: string;
  is_default: boolean;
};

const emptyForm = (): FormState => ({
  name: '',
  address: '',
  contact_name: '',
  contact_phone: '',
  is_default: false,
});

type Props = {
  initialLocations: PickupLocationItem[];
};

export function MerchantPickupLocationsForm({ initialLocations }: Props) {
  const router = useRouter();
  const [locations, setLocations] = useState(initialLocations);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm());
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const refresh = (next: PickupLocationItem[]) => {
    setLocations(next);
    router.refresh();
  };

  const startAdd = () => {
    setAdding(true);
    setEditingId(null);
    setForm({ ...emptyForm(), is_default: locations.length === 0 });
    setMessage(null);
  };

  const startEdit = (loc: PickupLocationItem) => {
    setAdding(false);
    setEditingId(loc.id);
    setForm({
      name: loc.name,
      address: loc.address,
      contact_name: loc.contact_name || '',
      contact_phone: loc.contact_phone || '',
      is_default: loc.is_default,
    });
    setMessage(null);
  };

  const cancel = () => {
    setAdding(false);
    setEditingId(null);
    setForm(emptyForm());
  };

  const save = async () => {
    setLoading(true);
    setMessage(null);
    const payload = {
      name: form.name.trim(),
      address: form.address.trim(),
      contact_name: form.contact_name.trim() || null,
      contact_phone: form.contact_phone.trim() || null,
      is_default: form.is_default,
    };

    const res = editingId
      ? await fetch(`/api/merchant/pickup-locations/${editingId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
      : await fetch('/api/merchant/pickup-locations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMessage({ type: 'err', text: data.error || '儲存失敗' });
      setLoading(false);
      return;
    }

    const listRes = await fetch('/api/merchant/pickup-locations');
    const listData = await listRes.json().catch(() => ({}));
    if (listRes.ok && Array.isArray(listData.locations)) {
      refresh(listData.locations);
    }
    setMessage({ type: 'ok', text: editingId ? '取件點已更新' : '取件點已新增' });
    cancel();
    setLoading(false);
  };

  const setDefault = async (id: string) => {
    setLoading(true);
    setMessage(null);
    const res = await fetch(`/api/merchant/pickup-locations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'set_default' }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMessage({ type: 'err', text: data.error || '設定失敗' });
      setLoading(false);
      return;
    }
    const listRes = await fetch('/api/merchant/pickup-locations');
    const listData = await listRes.json().catch(() => ({}));
    if (listRes.ok && Array.isArray(listData.locations)) {
      refresh(listData.locations);
    }
    setMessage({ type: 'ok', text: '已設為預設取件點' });
    setLoading(false);
  };

  const remove = async (id: string) => {
    if (!confirm('確定刪除此取件點？')) return;
    setLoading(true);
    setMessage(null);
    const res = await fetch(`/api/merchant/pickup-locations/${id}`, { method: 'DELETE' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setMessage({ type: 'err', text: data.error || '刪除失敗' });
      setLoading(false);
      return;
    }
    const listRes = await fetch('/api/merchant/pickup-locations');
    const listData = await listRes.json().catch(() => ({}));
    if (listRes.ok && Array.isArray(listData.locations)) {
      refresh(listData.locations);
    }
    setMessage({ type: 'ok', text: '取件點已刪除' });
    if (editingId === id) cancel();
    setLoading(false);
  };

  return (
    <div className="space-y-4 border-b pb-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-white">取件點管理</p>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              可新增多個發貨／取件地址（例如門市、倉庫）。建立配送時可選擇，預設取件點會自動帶入。
            </p>
          </div>
        </div>
        {!adding && !editingId && (
          <Button type="button" size="sm" variant="outline" className="gap-1.5" onClick={startAdd}>
            <Plus className="h-4 w-4" />
            新增取件點
          </Button>
        )}
      </div>

      {locations.length === 0 && !adding && (
        <p className="rounded-xl border border-dashed border-amber-300 bg-amber-50/80 px-3 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
          尚未設定取件點。請新增至少一個，配送員才知道去哪取件。
        </p>
      )}

      <ul className="space-y-2">
        {locations.map((loc) => (
          <li
            key={loc.id}
            className="rounded-xl border border-gray-200 bg-white px-3 py-3 dark:border-gray-700 dark:bg-gray-900/40"
          >
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="flex flex-wrap items-center gap-2 text-sm font-medium text-gray-900 dark:text-white">
                  {loc.name}
                  {loc.is_default && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700 dark:bg-orange-950/50 dark:text-orange-300">
                      <Star className="h-3 w-3" />
                      預設
                    </span>
                  )}
                </p>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-300">{loc.address}</p>
                {(loc.contact_name || loc.contact_phone) && (
                  <p className="mt-0.5 text-xs text-gray-500">
                    聯絡
                    {loc.contact_name ? ` ${loc.contact_name}` : ''}
                    {loc.contact_phone ? ` · ${loc.contact_phone}` : ''}
                  </p>
                )}
              </div>
              <div className="flex flex-wrap gap-1">
                {!loc.is_default && (
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    disabled={loading}
                    onClick={() => setDefault(loc.id)}
                  >
                    設為預設
                  </Button>
                )}
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  disabled={loading}
                  onClick={() => startEdit(loc)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="text-red-600"
                  disabled={loading || locations.length <= 1}
                  onClick={() => remove(loc.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {(adding || editingId) && (
        <div className="space-y-3 rounded-xl border border-blue-200 bg-blue-50/50 p-4 dark:border-blue-900 dark:bg-blue-950/20">
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            {editingId ? '編輯取件點' : '新增取件點'}
          </p>
          <div>
            <Label htmlFor="pickup_loc_name">名稱 *</Label>
            <Input
              id="pickup_loc_name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              className="mt-1"
              placeholder="例如：旺角店、觀塘倉庫"
            />
          </div>
          <div>
            <Label htmlFor="pickup_loc_address">地址 *</Label>
            <Input
              id="pickup_loc_address"
              value={form.address}
              onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))}
              className="mt-1"
              placeholder="完整取件地址"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="pickup_loc_contact">聯絡人</Label>
              <Input
                id="pickup_loc_contact"
                value={form.contact_name}
                onChange={(e) => setForm((f) => ({ ...f, contact_name: e.target.value }))}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="pickup_loc_phone">聯絡電話</Label>
              <Input
                id="pickup_loc_phone"
                value={form.contact_phone}
                onChange={(e) => setForm((f) => ({ ...f, contact_phone: e.target.value }))}
                className="mt-1"
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input
              type="checkbox"
              checked={form.is_default}
              onChange={(e) => setForm((f) => ({ ...f, is_default: e.target.checked }))}
            />
            設為預設取件點
          </label>
          <div className="flex gap-2">
            <Button type="button" onClick={save} disabled={loading}>
              {loading ? '儲存中…' : '儲存'}
            </Button>
            <Button type="button" variant="outline" onClick={cancel} disabled={loading}>
              取消
            </Button>
          </div>
        </div>
      )}

      {message && (
        <p className={`text-sm ${message.type === 'ok' ? 'text-green-600' : 'text-red-600'}`}>
          {message.text}
        </p>
      )}
    </div>
  );
}
