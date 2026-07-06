'use client';

import { useState, useEffect } from 'react';
import { DataTable } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Edit3 } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface TablePageProps {
  params: Promise<{ table: string }>;
}

export default function DynamicTablePage({ params: paramsPromise }: TablePageProps) {
  const [data, setData] = useState<{ id: string; [key: string]: unknown }[]>([]);
  const [loading, setLoading] = useState(true);
  const [schema, setSchema] = useState<string[]>([]);
  const [table, setTable] = useState('');
  const [canDelete, setCanDelete] = useState(false);
  const router = useRouter();

  useEffect(() => {
    paramsPromise.then((p) => setTable(p.table));
  }, [paramsPromise]);

  useEffect(() => {
    fetch('/api/admin/me')
      .then((r) => r.json())
      .then((d) => setCanDelete(d.isSuperAdmin === true));
  }, []);

  useEffect(() => {
    if (table) loadData();
  }, [table]);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/admin/${table}`);
      if (!res.ok) throw new Error('載入失敗');
      const json = await res.json();
      setData(json.data);
      setSchema(json.schema);
    } catch (error) {
      console.error('載入失敗:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('確定刪除？此操作不可撤銷。')) return;
    const res = await fetch(`/api/admin/${table}?id=${id}`, { method: 'DELETE' });
    if (res.ok) loadData();
    else {
      const d = await res.json();
      alert(d.error || '刪除失敗');
    }
  };

  const handleSuspend = async (id: string) => {
    if (!confirm('確認停用此商家？其商品將無法銷售。')) return;
    const res = await fetch(`/api/admin/merchants/${id}/suspend`, { method: 'POST' });
    if (res.ok) loadData();
    else {
      const d = await res.json();
      alert(d.error || '停用失敗');
    }
  };

  const columns = [
    ...schema.map((field) => ({
      accessorKey: field,
      header: field,
    })),
    {
      id: 'actions',
      cell: ({ row }: { row: { original: { id: string; status?: string } } }) => (
        <div className="flex space-x-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.push(`/admin/${table}/${row.original.id}`)}
          >
            <Edit3 className="h-4 w-4" />
          </Button>
          {table === 'merchants' && canDelete && row.original.status === 'active' && (
            <Button
              variant="ghost"
              size="sm"
              className="text-orange-600"
              onClick={() => handleSuspend(row.original.id)}
            >
              停用
            </Button>
          )}
          {canDelete && (
            <Button variant="ghost" size="icon" onClick={() => handleDelete(row.original.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  if (loading) return <div>載入中...</div>;

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold capitalize">{table} 管理</h1>
        {canDelete && (
          <Button onClick={() => router.push(`/admin/${table}/new`)}>
            <Plus className="mr-2 h-4 w-4" />
            新增
          </Button>
        )}
      </div>
      <DataTable columns={columns} data={data} />
    </div>
  );
}
