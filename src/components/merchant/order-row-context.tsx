'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { OrderStatus } from '@/types/database';

type OrderRowContextValue = {
  status: OrderStatus;
  setStatus: (status: OrderStatus) => void;
};

const OrderRowContext = createContext<OrderRowContextValue | null>(null);

export function OrderRowProvider({
  initialStatus,
  children,
}: {
  initialStatus: OrderStatus;
  children: ReactNode;
}) {
  const [status, setStatus] = useState(initialStatus);

  useEffect(() => {
    setStatus(initialStatus);
  }, [initialStatus]);

  return (
    <OrderRowContext.Provider value={{ status, setStatus }}>{children}</OrderRowContext.Provider>
  );
}

export function useOrderRowStatus() {
  const ctx = useContext(OrderRowContext);
  if (!ctx) {
    throw new Error('useOrderRowStatus must be used within OrderRowProvider');
  }
  return ctx;
}
