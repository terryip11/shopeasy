'use client';

import { createContext, useCallback, useContext, useMemo, useState } from 'react';

type AdminMobileNavContextValue = {
  open: boolean;
  setOpen: (open: boolean) => void;
  toggle: () => void;
};

const AdminMobileNavContext = createContext<AdminMobileNavContextValue | null>(null);

export function AdminMobileNavProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const toggle = useCallback(() => setOpen((prev) => !prev), []);

  const value = useMemo(
    () => ({ open, setOpen, toggle }),
    [open, toggle]
  );

  return (
    <AdminMobileNavContext.Provider value={value}>{children}</AdminMobileNavContext.Provider>
  );
}

export function useAdminMobileNav() {
  const ctx = useContext(AdminMobileNavContext);
  if (!ctx) {
    throw new Error('useAdminMobileNav must be used within AdminMobileNavProvider');
  }
  return ctx;
}
