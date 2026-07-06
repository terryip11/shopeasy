'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DocumentUploader } from '@/components/merchant/document-uploader';
import { CourierMobileShell } from '@/components/courier/courier-mobile-shell';
import { VEHICLE_LABELS } from '@/lib/courier/types';
import {
  COURIER_DECLARATION_BODY,
  COURIER_DECLARATION_TITLE,
} from '@/lib/courier/declaration';
import type { DeliveryJobType } from '@/lib/auth/capabilities';
import type { Database } from '@/types/database';

type Zone = Database['public']['Tables']['delivery_zones']['Row'];

const REGION_ORDER = ['港島', '九龍', '新界'] as const;

interface CourierApplyFormProps {
  zones: Zone[];
  jobType: DeliveryJobType;
}

export function CourierApplyForm({ zones, jobType }: CourierApplyFormProps) {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [vehicleType, setVehicleType] = useState<'walk' | 'bicycle' | 'motorcycle' | 'van'>(
    jobType === 'food' ? 'motorcycle' : 'motorcycle'
  );
  const [zoneIds, setZoneIds] = useState<string[]>([]);
  const [hkidImageUrl, setHkidImageUrl] = useState('');
  const [declarationAccepted, setDeclarationAccepted] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const typeLabel = jobType === 'food' ? '送餐員' : '送貨員';
  const dashboardHref = `/courier/${jobType}`;

  const zonesByRegion = REGION_ORDER.map((region) => ({
    region,
    zones: zones.filter((z) => z.region === region),
  })).filter((g) => g.zones.length > 0);

  const otherZones = zones.filter(
    (z) => !z.region || !REGION_ORDER.includes(z.region as (typeof REGION_ORDER)[number])
  );

  const toggleZone = (id: string) => {
    setZoneIds((prev) => (prev.includes(id) ? prev.filter((z) => z !== id) : [...prev, id]));
  };

  const canSubmit =
    phone.trim().length >= 8 &&
    zoneIds.length > 0 &&
    !!hkidImageUrl &&
    declarationAccepted &&
    !loading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setLoading(true);
    setError('');

    const res = await fetch('/api/courier/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: phone.trim(),
        vehicle_type: vehicleType,
        preferred_job_type: jobType,
        zone_ids: zoneIds,
        hkid_image_url: hkidImageUrl,
        declaration_accepted: true,
      }),
    });

    const data = await res.json();
    if (!res.ok) {
      setError(data.error || '申請失敗');
      setLoading(false);
      return;
    }

    router.push(dashboardHref);
    router.refresh();
  };

  return (
    <CourierMobileShell variant={jobType} activeTab="hub" title="入駐申請" showBack>
      <form onSubmit={handleSubmit} className="space-y-5">
        <p className="text-sm text-gray-500">
          填寫以下資料申請成為{typeLabel}。審核通過後即可於工作台接單。
        </p>

        <div>
          <Label htmlFor="phone">聯絡電話</Label>
          <Input
            id="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
            className="mt-1.5 h-11 text-base"
            placeholder="香港手機號碼，8 位數以上"
          />
        </div>

        <div>
          <Label htmlFor="vehicle">交通工具</Label>
          <select
            id="vehicle"
            value={vehicleType}
            onChange={(e) => setVehicleType(e.target.value as typeof vehicleType)}
            className="mt-1.5 h-11 w-full rounded-xl border border-gray-200 px-3 text-base dark:border-gray-700 dark:bg-gray-800"
          >
            {Object.entries(VEHICLE_LABELS).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <Label>服務區域（可多選）</Label>
          <div className="mt-2 space-y-3">
            {zonesByRegion.map(({ region, zones: list }) => (
              <div key={region}>
                <p className="text-xs font-semibold text-gray-500">{region}</p>
                <div className="mt-1 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {list.map((zone) => (
                    <button
                      key={zone.id}
                      type="button"
                      onClick={() => toggleZone(zone.id)}
                      className={`min-h-11 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${
                        zoneIds.includes(zone.id)
                          ? jobType === 'food'
                            ? 'border-amber-500 bg-amber-50 text-amber-800 dark:bg-amber-900/20'
                            : 'border-sky-500 bg-sky-50 text-sky-800 dark:bg-sky-900/20'
                          : 'border-gray-200 text-gray-600 dark:border-gray-700'
                      }`}
                    >
                      {zone.name}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            {otherZones.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500">其他</p>
                <div className="mt-1 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {otherZones.map((zone) => (
                    <button
                      key={zone.id}
                      type="button"
                      onClick={() => toggleZone(zone.id)}
                      className={`min-h-11 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${
                        zoneIds.includes(zone.id)
                          ? jobType === 'food'
                            ? 'border-amber-500 bg-amber-50 text-amber-800'
                            : 'border-sky-500 bg-sky-50 text-sky-800'
                          : 'border-gray-200 text-gray-600'
                      }`}
                    >
                      {zone.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <DocumentUploader
          label="香港身份證"
          value={hkidImageUrl}
          onUpload={setHkidImageUrl}
          required
        />
        <p className="text-xs text-gray-500 -mt-2">
          請上傳身份證正面清晰照片，資料僅用於入駐審核，不會公開顯示。
        </p>

        <div className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-900/50">
          <p className="text-sm font-semibold text-gray-900 dark:text-white">
            {COURIER_DECLARATION_TITLE[jobType]}
          </p>
          <ul className="mt-3 space-y-2 text-xs leading-relaxed text-gray-600 dark:text-gray-400">
            {COURIER_DECLARATION_BODY[jobType].map((item) => (
              <li key={item} className="flex gap-2">
                <span className="shrink-0 text-gray-400">•</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <label className="mt-4 flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={declarationAccepted}
              onChange={(e) => setDeclarationAccepted(e.target.checked)}
              className="mt-0.5 h-5 w-5 shrink-0 rounded border-gray-300"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              本人已閱讀並同意以上{typeLabel}入駐聲明，確認所提交資料屬實。
            </span>
          </label>
        </div>

        {error && <p className="text-sm text-red-500">{error}</p>}

        <Button type="submit" className="h-12 w-full text-base" disabled={!canSubmit}>
          {loading ? '提交中...' : `提交${typeLabel}申請`}
        </Button>

        <p className="text-center text-xs text-gray-500">
          已有帳號？
          <Link href={dashboardHref} className="ml-1 text-orange-600 hover:underline">
            前往工作台
          </Link>
        </p>
      </form>
    </CourierMobileShell>
  );
}
