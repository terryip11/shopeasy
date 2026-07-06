'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

type Props = {
  categoryId: string;
  categoryName: string;
  canDelete: boolean;
};

export function AdminCategoryRowActions({ categoryId, categoryName, canDelete }: Props) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  const remove = async () => {
    if (!confirm(`確定刪除分類「${categoryName}」？此操作不可撤銷。`)) return;

    setDeleting(true);
    const res = await fetch(`/api/admin/categories?id=${categoryId}`, { method: 'DELETE' });
    const data = await res.json();
    setDeleting(false);

    if (res.ok) {
      router.refresh();
    } else {
      alert(data.error || '刪除失敗');
    }
  };

  return (
    <div className="flex items-center justify-end gap-1">
      <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
        <Link href={`/admin/categories/${categoryId}`} title="編輯">
          <Pencil className="h-4 w-4" />
        </Link>
      </Button>
      {canDelete && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-red-600 hover:text-red-700"
          disabled={deleting}
          onClick={() => void remove()}
          title="刪除"
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}
