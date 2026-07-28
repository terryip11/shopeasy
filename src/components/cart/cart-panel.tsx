'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { getCart, removeFromCart, getCartTotal, cartLineKey, type CartItem } from '@/lib/cart';

export function CartPanel() {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    setItems(getCart());
  }, []);

  const total = getCartTotal(items);

  const handleRemove = (item: CartItem) => {
    removeFromCart(cartLineKey(item));
    setItems(getCart());
  };

  if (items.length === 0) {
    return <p className="mt-8 text-gray-500">購物車是空的</p>;
  }

  return (
    <div className="mt-8 space-y-4">
      {items.map((item) => (
        <div
          key={cartLineKey(item)}
          className="flex items-center justify-between rounded-xl bg-white p-4 dark:bg-gray-800"
        >
          <div>
            <p className="font-medium">{item.name}</p>
            {(item.variant_label || item.option_selections?.length) ? (
              <p className="text-xs text-gray-500">
                {[item.variant_label, ...(item.option_selections?.flatMap((s) => s.labels) ?? [])]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            ) : null}
            <p className="text-sm text-gray-500">
              HK${item.price.toFixed(2)} × {item.quantity}
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => handleRemove(item)}>
            移除
          </Button>
        </div>
      ))}
      <div className="flex items-center justify-between border-t pt-4">
        <span className="text-lg font-bold">合計: HK${total.toFixed(2)}</span>
        <Button asChild>
          <Link href="/checkout">前往結帳</Link>
        </Button>
      </div>
    </div>
  );
}
