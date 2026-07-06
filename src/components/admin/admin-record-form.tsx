'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { TABLE_FIELDS } from '@/lib/admin/table-config';
import type { TableName } from '@/lib/admin/tables';

type MerchantOption = { id: string; name: string; status: string };
type CategoryOption = { id: string; name: string };

async function parseResponseJson(res: Response): Promise<{ error?: string; data?: unknown[] }> {
  const text = await res.text();
  if (!text) {
    if (!res.ok) throw new Error(`請求失敗（${res.status}）`);
    return {};
  }
  try {
    return JSON.parse(text) as { error?: string; data?: unknown[] };
  } catch {
    throw new Error('伺服器回應格式錯誤');
  }
}

interface AdminRecordFormProps {
  table: TableName;
  mode: 'create' | 'edit';
  recordId?: string;
  initialData?: Record<string, unknown>;
}

export function AdminRecordForm({ table, mode, recordId, initialData = {} }: AdminRecordFormProps) {
  const router = useRouter();
  const fields = TABLE_FIELDS[table];
  const [form, setForm] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {};
    for (const field of fields) {
      const val = initialData[field.key];
      if (val === null || val === undefined) {
        if (table === 'products' && mode === 'create' && field.key === 'status') {
          init[field.key] = 'published';
        } else {
          init[field.key] = '';
        }
      } else {
        init[field.key] = String(val);
      }
    }
    return init;
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [merchants, setMerchants] = useState<MerchantOption[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(table === 'products');

  useEffect(() => {
    if (table !== 'products') return;

    Promise.all([
      fetch('/api/admin/merchants').then((r) => r.json()),
      fetch('/api/admin/categories').then((r) => r.json()),
    ])
      .then(([merchantRes, categoryRes]) => {
        setMerchants((merchantRes.data as MerchantOption[]) || []);
        setCategories((categoryRes.data as CategoryOption[]) || []);
      })
      .catch(() => setError('無法載入商家或分類列表'))
      .finally(() => setOptionsLoading(false));
  }, [table]);

  const handleChange = (key: string, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const buildPayload = () => {
    const payload: Record<string, unknown> = {};
    for (const field of fields) {
      if (field.type === 'readonly') continue;
      const raw = form[field.key];
      if (field.type === 'number') {
        payload[field.key] = raw === '' ? 0 : Number(raw);
      } else if (field.type === 'select' || field.type === 'merchantPick' || field.type === 'categoryPick') {
        if (raw) payload[field.key] = raw;
      } else {
        payload[field.key] = raw;
      }
    }
    return payload;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const payload = buildPayload();
      let res: Response;

      if (mode === 'create') {
        res = await fetch(`/api/admin/${table}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch(`/api/admin/${table}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: recordId, ...payload }),
        });
      }

      const data = await parseResponseJson(res);
      if (!res.ok) throw new Error(data.error || '儲存失敗');

      router.push(`/admin/${table}`);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  };

  const merchantStatusLabel: Record<string, string> = {
    active: '營運中',
    pending: '待審核',
    rejected: '已拒絕',
    suspended: '已停用',
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
      {fields.map((field) => (
        <div key={field.key}>
          <Label htmlFor={field.key}>{field.label}</Label>
          {field.type === 'merchantPick' ? (
            <select
              id={field.key}
              value={form[field.key] || ''}
              onChange={(e) => handleChange(field.key, e.target.value)}
              className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
              required={field.required}
              disabled={optionsLoading}
            >
              <option value="">{optionsLoading ? '載入商家中...' : '請選擇商家'}</option>
              {merchants.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}（{merchantStatusLabel[m.status] || m.status}）
                </option>
              ))}
            </select>
          ) : field.type === 'categoryPick' ? (
            <select
              id={field.key}
              value={form[field.key] || ''}
              onChange={(e) => handleChange(field.key, e.target.value)}
              className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
              disabled={optionsLoading}
            >
              <option value="">無分類</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          ) : field.type === 'select' ? (
            <select
              id={field.key}
              value={form[field.key] || ''}
              onChange={(e) => handleChange(field.key, e.target.value)}
              className="mt-1 w-full rounded-xl border border-gray-200 px-4 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
              required={field.required}
            >
              <option value="">請選擇</option>
              {field.options?.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          ) : field.type === 'readonly' ? (
            <Input id={field.key} value={form[field.key] || ''} readOnly className="mt-1 bg-gray-50" />
          ) : (
            <Input
              id={field.key}
              type={field.type === 'number' ? 'number' : 'text'}
              value={form[field.key] || ''}
              onChange={(e) => handleChange(field.key, e.target.value)}
              required={field.required}
              className="mt-1"
              readOnly={mode === 'edit' && field.key === 'slug' && table === 'merchants'}
            />
          )}
        </div>
      ))}

      {error && <p className="text-sm text-red-500">{error}</p>}
      {table === 'products' && mode === 'create' && !optionsLoading && merchants.length === 0 && (
        <p className="text-sm text-orange-600">
          目前沒有任何商家。請先到「商家審核」通過申請，或確認商家已建立。
        </p>
      )}

      {table === 'products' && (
        <p className="text-xs text-gray-500">
          僅「上架」狀態的商品會顯示在店鋪頁與商品列表。請確認所選商家網址代稱（slug）與目標店鋪一致。
        </p>
      )}

      <div className="flex gap-3 pt-2">
        <Button type="submit" disabled={loading || optionsLoading}>
          {loading ? '儲存中...' : mode === 'create' ? '建立' : '儲存變更'}
        </Button>
        <Button type="button" variant="outline" onClick={() => router.back()}>
          取消
        </Button>
      </div>
    </form>
  );
}
