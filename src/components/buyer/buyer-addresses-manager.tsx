'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MapPin, Pencil, Plus, Star, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  BuyerAddressForm,
  buyerAddressToFormValues,
  type BuyerAddressFormValues,
} from '@/components/buyer/buyer-address-form';
import type { Database } from '@/types/database';

type BuyerAddress = Database['public']['Tables']['buyer_addresses']['Row'];

export function BuyerAddressesManager() {
  const router = useRouter();
  const [addresses, setAddresses] = useState<BuyerAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    const res = await fetch('/api/buyer/addresses');
    if (res.status === 401) {
      window.location.href = '/login?redirect=/account/addresses';
      return;
    }
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || '載入失敗');
      setLoading(false);
      return;
    }
    setAddresses(data.addresses || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const saveNew = async (values: BuyerAddressFormValues) => {
    const res = await fetch('/api/buyer/addresses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        label: values.label || null,
        name: values.name,
        phone: values.phone,
        address: values.address,
        zone_id: null,
        is_default: values.is_default,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || '儲存失敗');
    setShowCreate(false);
    await load();
    router.refresh();
  };

  const saveEdit = async (id: string, values: BuyerAddressFormValues) => {
    const res = await fetch(`/api/buyer/addresses/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        label: values.label || null,
        name: values.name,
        phone: values.phone,
        address: values.address,
        zone_id: null,
        is_default: values.is_default,
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || '更新失敗');
    setEditingId(null);
    await load();
    router.refresh();
  };

  const remove = async (id: string) => {
    if (!confirm('確定刪除此地址？')) return;
    const res = await fetch(`/api/buyer/addresses/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || '刪除失敗');
      return;
    }
    await load();
    router.refresh();
  };

  const setDefault = async (id: string) => {
    const res = await fetch(`/api/buyer/addresses/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_default: true }),
    });
    if (!res.ok) {
      const data = await res.json();
      alert(data.error || '設定失敗');
      return;
    }
    await load();
  };

  if (loading) {
    return <p className="text-sm text-gray-500">載入地址中…</p>;
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {!showCreate && (
        <Button type="button" onClick={() => setShowCreate(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          新增地址
        </Button>
      )}

      {showCreate && (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
          <h2 className="mb-4 text-lg font-semibold">新增收貨地址</h2>
          <BuyerAddressForm
            submitLabel="新增"
            onSubmit={saveNew}
            onCancel={() => setShowCreate(false)}
          />
        </div>
      )}

      {addresses.length === 0 && !showCreate ? (
        <div className="rounded-2xl border border-dashed border-gray-200 p-10 text-center dark:border-gray-700">
          <MapPin className="mx-auto h-10 w-10 text-gray-300" />
          <p className="mt-3 text-gray-500">尚無儲存的收貨地址</p>
        </div>
      ) : (
        <ul className="space-y-4">
          {addresses.map((addr) => (
            <li
              key={addr.id}
              className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-gray-900"
            >
              {editingId === addr.id ? (
                <BuyerAddressForm
                  initial={buyerAddressToFormValues(addr)}
                  submitLabel="儲存變更"
                  onSubmit={(v) => saveEdit(addr.id, v)}
                  onCancel={() => setEditingId(null)}
                />
              ) : (
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">
                      {addr.label || '收貨地址'}
                      {addr.is_default && (
                        <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-xs text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
                          <Star className="h-3 w-3 fill-current" />
                          預設
                        </span>
                      )}
                    </p>
                    <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                      {addr.name} · {addr.phone}
                    </p>
                    <p className="mt-1 text-sm text-gray-500">{addr.address}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {!addr.is_default && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => void setDefault(addr.id)}
                      >
                        設為預設
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1"
                      onClick={() => setEditingId(addr.id)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      編輯
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="gap-1 text-red-600 hover:text-red-700"
                      onClick={() => void remove(addr.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      刪除
                    </Button>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
