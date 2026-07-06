'use client';

import { useEffect, useState } from 'react';
import { AdminRecordForm } from '@/components/admin/admin-record-form';
import { isValidTable, type TableName } from '@/lib/admin/tables';
import { notFound } from 'next/navigation';

interface PageProps {
  params: Promise<{ table: string; id: string }>;
}

export default function AdminEditRecordPage({ params: paramsPromise }: PageProps) {
  const [table, setTable] = useState<TableName | null>(null);
  const [id, setId] = useState('');
  const [record, setRecord] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    paramsPromise.then((p) => {
      if (!isValidTable(p.table)) return;
      setTable(p.table);
      setId(p.id);
    });
  }, [paramsPromise]);

  useEffect(() => {
    if (!table || !id) return;
    fetch(`/api/admin/${table}/${id}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setRecord(null);
        else setRecord(data);
      })
      .finally(() => setLoading(false));
  }, [table, id]);

  if (table === null && !loading) notFound();
  if (!table) return <div>載入中...</div>;
  if (loading) return <div>載入中...</div>;
  if (!record) notFound();

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 capitalize">編輯 {table}</h1>
      <AdminRecordForm table={table} mode="edit" recordId={id} initialData={record} />
    </div>
  );
}
