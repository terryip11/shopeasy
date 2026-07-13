'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import { Store } from 'lucide-react';
import { normalizeR2ImageUrl } from '@/lib/storage/r2-public-url';

type MerchantBranding = {
  name: string;
  logoUrl: string | null;
  storeSlug: string | null;
};

type MerchantBrandingContextValue = MerchantBranding & {
  setLogoUrl: (url: string | null) => void;
  refreshBranding: () => Promise<void>;
};

const MerchantBrandingContext = createContext<MerchantBrandingContextValue>({
  name: '商家中心',
  logoUrl: null,
  storeSlug: null,
  setLogoUrl: () => {},
  refreshBranding: async () => {},
});

export function useMerchantBranding() {
  return useContext(MerchantBrandingContext);
}

type ProviderProps = {
  children: ReactNode;
  initial?: MerchantBranding | null;
};

export function MerchantBrandingProvider({ children, initial }: ProviderProps) {
  const [name, setName] = useState(initial?.name ?? '商家中心');
  const [storeSlug, setStoreSlug] = useState<string | null>(initial?.storeSlug ?? null);
  const [logoUrl, setLogoUrlState] = useState<string | null>(
    normalizeR2ImageUrl(initial?.logoUrl ?? null)
  );

  const setLogoUrl = useCallback((url: string | null) => {
    setLogoUrlState(normalizeR2ImageUrl(url));
  }, []);

  const refreshBranding = useCallback(async () => {
    const res = await fetch('/api/merchant/me');
    if (!res.ok) return;
    const data = await res.json();
    if (data.merchant) {
      setName(data.merchant.name ?? '商家中心');
      setStoreSlug(data.merchant.slug ?? null);
      setLogoUrlState(normalizeR2ImageUrl(data.merchant.logo_url));
    }
  }, []);

  useEffect(() => {
    if (!initial) {
      void refreshBranding();
    }
  }, [initial, refreshBranding]);

  return (
    <MerchantBrandingContext.Provider
      value={{ name, logoUrl, storeSlug, setLogoUrl, refreshBranding }}
    >
      {children}
    </MerchantBrandingContext.Provider>
  );
}

type MerchantLogoMarkProps = {
  size?: 'sm' | 'md';
  className?: string;
};

export function MerchantLogoMark({ size = 'sm', className = '' }: MerchantLogoMarkProps) {
  const { logoUrl, name } = useMerchantBranding();
  const box =
    size === 'sm'
      ? 'h-8 w-8 rounded-lg'
      : 'h-10 w-10 rounded-xl';

  if (logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logoUrl}
        alt={name ? `${name} Logo` : '店鋪 Logo'}
        className={`${box} shrink-0 object-cover ${className}`}
      />
    );
  }

  return (
    <div
      className={`${box} flex shrink-0 items-center justify-center bg-orange-500 text-white ${className}`}
    >
      <Store className={size === 'sm' ? 'h-5 w-5' : 'h-6 w-6'} />
    </div>
  );
}
