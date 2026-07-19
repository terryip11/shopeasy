/**
 * 結帳收貨資料草稿（localStorage，重新進入結帳頁時還原）
 */

import type { MerchantPaymentMethod } from '@/lib/merchant/payment-methods';

const DRAFT_KEY = 'shopeasy-checkout-draft';

export type CheckoutDraft = {
  name: string;
  phone: string;
  address: string;
  selectedAddressId: string;
  paymentMethod: MerchantPaymentMethod;
  saveToAddressBook: boolean;
  addressLabel: string;
};

export function loadCheckoutDraft(): CheckoutDraft | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as Partial<CheckoutDraft>;
    if (
      typeof data.name !== 'string' ||
      typeof data.phone !== 'string' ||
      typeof data.address !== 'string'
    ) {
      return null;
    }
    return {
      name: data.name,
      phone: data.phone,
      address: data.address,
      selectedAddressId:
        typeof data.selectedAddressId === 'string' ? data.selectedAddressId : 'new',
      paymentMethod: (data.paymentMethod as MerchantPaymentMethod) || 'card',
      saveToAddressBook: data.saveToAddressBook !== false,
      addressLabel: typeof data.addressLabel === 'string' ? data.addressLabel : '',
    };
  } catch {
    return null;
  }
}

export function saveCheckoutDraft(draft: CheckoutDraft): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  } catch {
    /* quota / private mode */
  }
}

export function clearCheckoutDraft(): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(DRAFT_KEY);
}
