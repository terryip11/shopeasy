'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { AdminDeliveryZoneRow } from '@/lib/admin/couriers';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

const REGIONS = ['港島', '九龍', '新界'] as const;

export function AdminDeliveryZonesManager({ zones }: { zones: AdminDeliveryZoneRow[] }) {
  const router = useRouter();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [region, setRegion] = useState<(typeof REGIONS)[number]>('九龍');
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editRegion, setEditRegion] = useState<(typeof REGIONS)[number]>('九龍');

  const grouped = useMemo(() => {
    const map = new Map<string, AdminDeliveryZoneRow[]>();
    for (const r of REGIONS) map.set(r, []);
    const other: AdminDeliveryZoneRow[] = [];
    for (const z of zones) {
      if (z.region && REGIONS.includes(z.region as (typeof REGIONS)[number])) {
        map.get(z.region)!.push(z);
      } else {
        other.push(z);
      }
    }
    return { map, other };
  }, [zones]);

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) return;

    setLoading(true);
    const res = await fetch('/api/admin/delivery-zones', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: name.trim(), slug: slug.trim(), region }),
    });
    setLoading(false);

    if (res.ok) {
      setName('');
      setSlug('');
      router.refresh();
    } else {
      const data = await res.json();
      alert(data.error || '新增失敗');
    }
  };

  const saveEdit = async (id: string) => {
    setLoading(true);
    const res = await fetch(`/api/admin/delivery-zones/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: editName.trim(), region: editRegion }),
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

  const remove = async (id: string, zoneName: string) => {
    if (!confirm(`確認刪除區域「${zoneName}」？`)) return;

    setLoading(true);
    const res = await fetch(`/api/admin/delivery-zones/${id}`, { method: 'DELETE' });
    setLoading(false);

    if (res.ok) {
      router.refresh();
    } else {
      const data = await res.json();
      alert(data.error || '刪除失敗');
    }
  };

  const startEdit = (z: AdminDeliveryZoneRow) => {
    setEditingId(z.id);
    setEditName(z.name);
    setEditRegion((z.region as (typeof REGIONS)[number]) || '九龍');
  };

  return (
    <div className="space-y-8">
      <form
        onSubmit={create}
        className="rounded-xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800/50"
      >
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white">新增配送區域</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-4">
          <div>
            <Label htmlFor="zone-name">名稱</Label>
            <Input
              id="zone-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="例如 觀塘"
              className="mt-1"
            />
          </div>
          <div>
            <Label htmlFor="zone-slug">slug</Label>
            <Input
              id="zone-slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="kwun-tong"
              className="mt-1 font-mono text-sm"
            />
          </div>
          <div>
            <Label htmlFor="zone-region">大區</Label>
            <select
              id="zone-region"
              value={region}
              onChange={(e) => setRegion(e.target.value as (typeof REGIONS)[number])}
              className="mt-1 w-full rounded-xl border border-gray-200 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-800"
            >
              {REGIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <Button type="submit" disabled={loading} className="w-full">
              新增
            </Button>
          </div>
        </div>
      </form>

      {REGIONS.map((regionName) => {
        const list = grouped.map.get(regionName) ?? [];
        if (list.length === 0) return null;
        return (
          <div key={regionName}>
            <h3 className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">{regionName}</h3>
            <ZoneTable
              zones={list}
              editingId={editingId}
              editName={editName}
              editRegion={editRegion}
              loading={loading}
              onEditName={setEditName}
              onEditRegion={setEditRegion}
              onStartEdit={startEdit}
              onCancelEdit={() => setEditingId(null)}
              onSaveEdit={saveEdit}
              onDelete={remove}
            />
          </div>
        );
      })}

      {grouped.other.length > 0 && (
        <div>
          <h3 className="mb-2 text-sm font-semibold text-gray-700 dark:text-gray-300">其他／舊版大區</h3>
          <ZoneTable
            zones={grouped.other}
            editingId={editingId}
            editName={editName}
            editRegion={editRegion}
            loading={loading}
            onEditName={setEditName}
            onEditRegion={setEditRegion}
            onStartEdit={startEdit}
            onCancelEdit={() => setEditingId(null)}
            onSaveEdit={saveEdit}
            onDelete={remove}
          />
        </div>
      )}
    </div>
  );
}

function ZoneTable({
  zones,
  editingId,
  editName,
  editRegion,
  loading,
  onEditName,
  onEditRegion,
  onStartEdit,
  onCancelEdit,
  onSaveEdit,
  onDelete,
}: {
  zones: AdminDeliveryZoneRow[];
  editingId: string | null;
  editName: string;
  editRegion: (typeof REGIONS)[number];
  loading: boolean;
  onEditName: (v: string) => void;
  onEditRegion: (v: (typeof REGIONS)[number]) => void;
  onStartEdit: (z: AdminDeliveryZoneRow) => void;
  onCancelEdit: () => void;
  onSaveEdit: (id: string) => void;
  onDelete: (id: string, name: string) => void;
}) {
  return (
    <div className="rounded-xl bg-white shadow dark:bg-gray-900 overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>名稱</TableHead>
            <TableHead>slug</TableHead>
            <TableHead className="text-right">操作</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {zones.map((z) => (
            <TableRow key={z.id}>
              <TableCell>
                {editingId === z.id ? (
                  <div className="flex flex-wrap gap-2">
                    <Input value={editName} onChange={(e) => onEditName(e.target.value)} className="h-8 w-32" />
                    <select
                      value={editRegion}
                      onChange={(e) => onEditRegion(e.target.value as (typeof REGIONS)[number])}
                      className="h-8 rounded-lg border border-gray-200 px-2 text-sm dark:border-gray-700 dark:bg-gray-800"
                    >
                      {REGIONS.map((r) => (
                        <option key={r} value={r}>
                          {r}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  z.name
                )}
              </TableCell>
              <TableCell className="font-mono text-xs text-gray-500">{z.slug}</TableCell>
              <TableCell className="text-right">
                {editingId === z.id ? (
                  <div className="flex justify-end gap-1">
                    <Button size="sm" variant="outline" onClick={onCancelEdit} disabled={loading}>
                      取消
                    </Button>
                    <Button size="sm" onClick={() => onSaveEdit(z.id)} disabled={loading}>
                      儲存
                    </Button>
                  </div>
                ) : (
                  <div className="flex justify-end gap-1">
                    <Button size="sm" variant="outline" onClick={() => onStartEdit(z)}>
                      編輯
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-red-600"
                      onClick={() => onDelete(z.id, z.name)}
                      disabled={loading}
                    >
                      刪除
                    </Button>
                  </div>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
