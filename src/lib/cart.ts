/**
 * 購物車（localStorage）
 */

export type CartOptionSelection = {
  group_id: string;
  option_ids: string[];
  labels: string[];
  price_delta: number;
};

export type CartItem = {
  id: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
  variant_id?: string;
  variant_label?: string;
  option_selections?: CartOptionSelection[];
};

const CART_KEY = 'shopeasy-cart';

export function cartLineKey(item: Pick<CartItem, 'id' | 'variant_id' | 'option_selections'>): string {
  const opts =
    item.option_selections
      ?.map((s) => `${s.group_id}:${[...s.option_ids].sort().join(',')}`)
      .sort()
      .join('|') ?? '';
  return `${item.id}:${item.variant_id ?? ''}:${opts}`;
}

export function getCart(): CartItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = JSON.parse(localStorage.getItem(CART_KEY) || '[]') as CartItem[];
    return raw.map(normalizeCartItem);
  } catch {
    return [];
  }
}

function normalizeCartItem(item: CartItem): CartItem {
  return {
    ...item,
    image: item.image || '',
    variant_id: item.variant_id || undefined,
    variant_label: item.variant_label || undefined,
    option_selections: item.option_selections?.length ? item.option_selections : undefined,
  };
}

export function saveCart(items: CartItem[]) {
  localStorage.setItem(CART_KEY, JSON.stringify(items));
}

export function addToCart(product: Omit<CartItem, 'quantity'>, quantity = 1) {
  const cart = getCart();
  const key = cartLineKey(product);
  const existing = cart.find((item) => cartLineKey(item) === key);
  if (existing) {
    existing.quantity += quantity;
  } else {
    cart.push({ ...product, quantity });
  }
  saveCart(cart);
}

export function removeFromCart(lineKey: string) {
  saveCart(getCart().filter((item) => cartLineKey(item) !== lineKey));
}

export function getCartTotal(items: CartItem[]) {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

export function getCartItemCount(items?: CartItem[]) {
  const cart = items ?? getCart();
  return cart.reduce((sum, item) => sum + item.quantity, 0);
}
