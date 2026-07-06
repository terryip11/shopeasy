'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Check, X, ExternalLink, Mail, Phone, MapPin, User } from 'lucide-react';

type PendingMerchant = {
  id: string;
  name: string;
  slug: string;
  user_id: string;
  applied_at: string;
  contact_name?: string | null;
  contact_phone?: string | null;
  contact_email?: string | null;
  company_address?: string | null;
  br_image_url?: string | null;
  ci_image_url?: string | null;
  data_consent_at?: string | null;
};

export function MerchantApprovalList({ initial }: { initial: PendingMerchant[] }) {
  const router = useRouter();
  const [merchants, setMerchants] = useState(initial);
  const [loading, setLoading] = useState<string | null>(null);

  const handleAction = async (id: string, action: 'approve' | 'reject') => {
    let reason: string | undefined;
    if (action === 'reject') {
      reason = prompt('拒絕原因（選填）：') || undefined;
      if (reason === null) return;
    } else {
      if (!confirm('確認通過此商家申請？買家帳號將升級為商家角色（管理員角色不受影響）。')) return;
    }

    setLoading(id);
    const res = await fetch(`/api/admin/merchants/${id}/${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    });

    if (res.ok) {
      setMerchants((prev) => prev.filter((m) => m.id !== id));
      router.refresh();
    } else {
      const data = await res.json();
      alert(data.error || '操作失敗');
    }
    setLoading(null);
  };

  if (merchants.length === 0) {
    return (
      <p className="text-gray-500 py-12 text-center rounded-lg bg-white shadow dark:bg-gray-900">
        目前沒有待審核的商家申請
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {merchants.map((m) => (
        <div
          key={m.id}
          className="rounded-xl bg-white p-6 shadow dark:bg-gray-900"
        >
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex-1 min-w-0 space-y-3">
              <div>
                <h3 className="font-semibold text-gray-900 dark:text-white">{m.name}</h3>
                <p className="text-sm text-gray-500">店鋪網址：/stores/{m.slug}</p>
                <p className="text-xs text-gray-400 mt-1">
                  申請時間：{new Date(m.applied_at).toLocaleString('zh-TW')}
                  {m.data_consent_at && (
                    <span className="ml-2 text-green-600">· 已同意資料收集聲明</span>
                  )}
                </p>
              </div>

              {(m.contact_name || m.contact_phone || m.contact_email || m.company_address) && (
                <div className="grid gap-2 text-sm text-gray-600 dark:text-gray-400 sm:grid-cols-2">
                  {m.contact_name && (
                    <p className="flex items-center gap-2">
                      <User className="h-4 w-4 text-orange-500 shrink-0" />
                      {m.contact_name}
                    </p>
                  )}
                  {m.contact_phone && (
                    <p className="flex items-center gap-2">
                      <Phone className="h-4 w-4 text-orange-500 shrink-0" />
                      {m.contact_phone}
                    </p>
                  )}
                  {m.contact_email && (
                    <p className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-orange-500 shrink-0" />
                      {m.contact_email}
                    </p>
                  )}
                  {m.company_address && (
                    <p className="flex items-start gap-2 sm:col-span-2">
                      <MapPin className="h-4 w-4 text-orange-500 shrink-0 mt-0.5" />
                      {m.company_address}
                    </p>
                  )}
                </div>
              )}

              <div className="flex flex-wrap gap-3">
                {m.br_image_url && (
                  <a
                    href={m.br_image_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-orange-600 hover:underline"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    查看 BR（商業登記證）
                  </a>
                )}
                {m.ci_image_url && (
                  <a
                    href={m.ci_image_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm text-orange-600 hover:underline"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    查看 CI（公司註冊證明）
                  </a>
                )}
              </div>
            </div>

            <div className="flex gap-2 shrink-0">
              <Button
                size="sm"
                onClick={() => handleAction(m.id, 'approve')}
                disabled={loading === m.id}
              >
                <Check className="h-4 w-4 mr-1" />
                通過
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="text-red-600"
                onClick={() => handleAction(m.id, 'reject')}
                disabled={loading === m.id}
              >
                <X className="h-4 w-4 mr-1" />
                拒絕
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
