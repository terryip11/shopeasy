'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';

type MerchantMobileNavContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
};

const MerchantMobileNavContext = createContext<MerchantMobileNavContextValue | null>(null);

export function MerchantMobileNavProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const toggle = useCallback(() => setOpen((prev) => !prev), []);

  const value = useMemo(() => ({ open, setOpen, toggle }), [open, toggle]);

  return (
    <MerchantMobileNavContext.Provider value={value}>{children}</MerchantMobileNavContext.Provider>
  );
}

export function useMerchantMobileNav() {
  const ctx = useContext(MerchantMobileNavContext);
  if (!ctx) {
    throw new Error('useMerchantMobileNav must be used within MerchantMobileNavProvider');
  }
  return ctx;
}
