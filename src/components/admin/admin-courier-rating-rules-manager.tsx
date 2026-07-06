'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { RatingSurchargeRow } from '@/lib/admin/courier-rating-rules';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

type Props = {
  rules: RatingSurchargeRow[];
};

export function AdminCourierRatingRulesManager({ rules }: Props) {
  const router = useRouter();
  const [ratingBelow, setRatingBelow] = useState('4.5');
  const [surcharge, setSurcharge] = useState('10');
  const [label, setLabel] = useState('');
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBelow, setEditBelow] = useState('');
  const [editSurcharge, setEditSurcharge] = useState('');
  const [editLabel, setEditLabel] = useState('');
  const [editEnabled, setEditEnabled] = useState(true);

  const saveNew = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await fetch('/api/admin/courier-rating-rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        rating_below: Number(ratingBelow),
        surcharge_hkd: Number(surcharge),
        label: label.trim() || null,
      }),
    });
    setLoading(false);
    if (res.ok) {
      setRatingBelow('4.5');
      setSurcharge('10');
      setLabel('');
      router.refresh();
    } else {
      const data = await res.json();
      alert(data.error || '新增失敗');
    }
  };

  const startEdit = (rule: RatingSurchargeRow) => {
    setEditingId(rule.id);
    setEditBelow(String(rule.rating_below));
    setEditSurcharge(String(rule.surcharge_hkd));
    setEditLabel(rule.label || '');
    setEditEnabled(rule.enabled);
  };

  const saveEdit = async (id: string) => {
    setLoading(true);
    const res = await fetch('/api/admin/courier-rating-rules', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id,
        rating_below: Number(editBelow),
        surcharge_hkd: Number(editSurcharge),
        label: editLabel.trim() || null,
        enabled: editEnabled,
      }),
    });
    setLoading(false);
    if (res.ok) {
      setEditingId(null);
      router.refresh();
    } else {
      const data = await res.json();
      alert(data.error || '更新失敗');
    }
  };

  const remove = async (id: string) => {
    if (!confirm('確定刪除此規則？')) return;
    setLoading(true);
    const res = await fetch(`/api/admin/courier-rating-rules/${id}`, { method: 'DELETE' });
    setLoading(false);
    if (res.ok) {
      router.refresh();
    } else {
      const data = await res.json();
      alert(data.error || '刪除失敗');
    }
  };

  return (
    <div className="space-y-8">
      <div className="rounded-xl border border-gray-200 bg-white p-6 dark:border-gray-800 dark:bg-gray-900">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">新增規則</h2>
        <p className="mt-1 text-sm text-gray-500">
          當配送員歷史平均評分<strong>達到或高於</strong>門檻時，接單可獲額外加價（平台補貼激勵）；多條規則同時符合時取最高加價。尚無客戶評分紀錄的配送員不發放加價。
        </p>
        <form onSubmit={saveNew} className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <Label htmlFor="rating-below">配送員評分達到</Label>
            <Input
              id="rating-below"
              type="number"
              min={0.1}
              max={5}
              step={0.1}
              value={ratingBelow}
              onChange={(e) => setRatingBelow(e.target.value)}
              required
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="surcharge">加價（HKD）</Label>
            <Input
              id="surcharge"
              type="number"
              min={0}
              step={1}
              value={surcharge}
              onChange={(e) => setSurcharge(e.target.value)}
              required
              className="mt-1"
            />
          </div>
          <div className="sm:col-span-2">
            <Label htmlFor="label">說明（選填）</Label>
            <Input
              id="label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="例如：評分達 4.5"
              className="mt-1"
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-4">
            <Button type="submit" disabled={loading}>
              {loading ? '儲存中...' : '新增規則'}
            </Button>
          </div>
        </form>
      </div>

      <div className="rounded-xl bg-white shadow dark:bg-gray-900 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>配送員評分達到</TableHead>
              <TableHead>加價</TableHead>
              <TableHead>說明</TableHead>
              <TableHead>狀態</TableHead>
              <TableHead className="text-right">操作</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rules.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center text-gray-500">
                  尚無規則
                </TableCell>
              </TableRow>
            ) : (
              rules.map((rule) => (
                <TableRow key={rule.id}>
                  <TableCell>
                    {editingId === rule.id ? (
                      <Input
                        type="number"
                        min={0.1}
                        max={5}
                        step={0.1}
                        value={editBelow}
                        onChange={(e) => setEditBelow(e.target.value)}
                        className="w-24"
                      />
                    ) : (
                      rule.rating_below
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === rule.id ? (
                      <Input
                        type="number"
                        min={0}
                        value={editSurcharge}
                        onChange={(e) => setEditSurcharge(e.target.value)}
                        className="w-24"
                      />
                    ) : (
                      `HK$${rule.surcharge_hkd}`
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === rule.id ? (
                      <Input value={editLabel} onChange={(e) => setEditLabel(e.target.value)} />
                    ) : (
                      rule.label || '—'
                    )}
                  </TableCell>
                  <TableCell>
                    {editingId === rule.id ? (
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={editEnabled}
                          onChange={(e) => setEditEnabled(e.target.checked)}
                        />
                        啟用
                      </label>
                    ) : rule.enabled ? (
                      <span className="text-green-600">啟用</span>
                    ) : (
                      <span className="text-gray-400">停用</span>
                    )}
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    {editingId === rule.id ? (
                      <>
                        <Button size="sm" disabled={loading} onClick={() => void saveEdit(rule.id)}>
                          儲存
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                          取消
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button size="sm" variant="outline" onClick={() => startEdit(rule)}>
                          編輯
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-600"
                          disabled={loading}
                          onClick={() => void remove(rule.id)}
                        >
                          刪除
                        </Button>
                      </>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
