'use client';

import { CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MerchantLogoMark } from '@/components/merchant/merchant-branding-provider';

export function MerchantStoreInfoCardHeader() {
  return (
    <CardHeader>
      <div className="flex items-center gap-3">
        <MerchantLogoMark size="md" />
        <div>
          <CardTitle>店鋪基本信息</CardTitle>
          <CardDescription>店鋪名稱、Logo 和連結</CardDescription>
        </div>
      </div>
    </CardHeader>
  );
}
