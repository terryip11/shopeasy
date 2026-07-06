'use client';

import { useEffect, useState } from 'react';
import { AdminRecordForm } from '@/components/admin/admin-record-form';
import { isValidTable, type TableName } from '@/lib/admin/tables';
import { notFound } from 'next/navigation';

interface PageProps {
  params: Promise<{ table: string }>;
}

export default function AdminNewRecordPage({ params: paramsPromise }: PageProps) {
  const [table, setTable] = useState<TableName | null>(null);
  const [resolved, setResolved] = useState(false);

  useEffect(() => {
    paramsPromise.then((p) => {
      if (!isValidTable(p.table)) {
        setResolved(true);
        return;
      }
      setTable(p.table);
      setResolved(true);
    });
  }, [paramsPromise]);

  if (!resolved) return <div>載入中...</div>;
  if (!table) notFound();

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6 capitalize">新增 {table}</h1>
      <AdminRecordForm table={table} mode="create" />
    </div>
  );
}
