'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Minus, Plus } from 'lucide-react';
import { addToCart } from '@/lib/cart';

function notifyCartUpdated() {
  window.dispatchEvent(new Event('shopeasy-cart-updated'));
}

interface AddToCartButtonProps {
  product: {
    id: string;
    name: string;
    price: number;
    image: string;
  };
  stock?: number;
}

export function AddToCartButton({ product, stock }: AddToCartButtonProps) {
  const maxQty = stock !== undefined && stock > 0 ? stock : 99;
  const [quantity, setQuantity] = useState(1);

  const clamp = (n: number) => Math.min(maxQty, Math.max(1, n));

  const handleChange = (value: number) => {
    setQuantity(clamp(value));
  };

  const handleAdd = () => {
    addToCart(product, quantity);
    notifyCartUpdated();
    alert(`已加入購物車 × ${quantity}`);
    setQuantity(1);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">數量</span>
        <div className="flex items-center rounded-xl border border-gray-200 dark:border-gray-700">
          <button
            type="button"
            onClick={() => handleChange(quantity - 1)}
            disabled={quantity <= 1}
            className="flex h-10 w-10 items-center justify-center text-gray-600 hover:bg-gray-50 disabled:opacity-40 dark:hover:bg-gray-800"
            aria-label="減少數量"
          >
            <Minus className="h-4 w-4" />
          </button>
          <Input
            type="number"
            min={1}
            max={maxQty}
            value={quantity}
            onChange={(e) => handleChange(parseInt(e.target.value, 10) || 1)}
            className="h-10 w-16 border-0 text-center [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
          />
          <button
            type="button"
            onClick={() => handleChange(quantity + 1)}
            disabled={quantity >= maxQty}
            className="flex h-10 w-10 items-center justify-center text-gray-600 hover:bg-gray-50 disabled:opacity-40 dark:hover:bg-gray-800"
            aria-label="增加數量"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>
        {stock !== undefined && (
          <span className="text-sm text-gray-500">庫存 {stock} 件</span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-4">
        <Button onClick={handleAdd} className="px-8" disabled={maxQty < 1}>
          加入購物車
        </Button>
        <span className="text-sm text-gray-500">
          小計{' '}
          <span className="font-semibold text-orange-500">
            ${(product.price * quantity).toFixed(2)}
          </span>
        </span>
      </div>
    </div>
  );
}
