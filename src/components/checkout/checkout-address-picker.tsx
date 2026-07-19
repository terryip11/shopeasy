'use client';

import Link from 'next/link';
import type { Database } from '@/types/database';

type BuyerAddress = Database['public']['Tables']['buyer_addresses']['Row'];

export type CheckoutShippingFields = {
  name: string;
  phone: string;
  address: string;
};

type Props = {
  addresses: BuyerAddress[];
  selectedId: string;
  onSelect: (id: string) => void;
  loggedIn: boolean;
  saveToAddressBook: boolean;
  onSaveToAddressBookChange: (v: boolean) => void;
  addressLabel: string;
  onAddressLabelChange: (v: string) => void;
};

function formatAddressLine(addr: BuyerAddress) {
  const tag = addr.label ? `${addr.label} · ` : '';
  return `${tag}${addr.name}`;
}

export function CheckoutAddressPicker({
  addresses,
  selectedId,
  onSelect,
  loggedIn,
  saveToAddressBook,
  onSaveToAddressBookChange,
  addressLabel,
  onAddressLabelChange,
}: Props) {
  if (!loggedIn) {
    return (
      <p className="text-xs text-gray-500">
        <Link href="/login?redirect=/checkout" className="text-orange-600 hover:underline">
          登入
        </Link>
        後可儲存並快速選擇收貨地址
      </p>
    );
  }

  return (
    <div className="space-y-3 border-b border-gray-100 pb-5 dark:border-gray-800">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-gray-900 dark:text-white">選擇收貨地址</p>
        <Link
          href="/account/addresses"
          className="text-xs text-orange-600 hover:underline"
        >
          管理地址
        </Link>
      </div>
      <div className="flex flex-col gap-2">
        {addresses.map((addr) => (
          <label
            key={addr.id}
            className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 text-sm transition-colors ${
              selectedId === addr.id
                ? 'border-orange-500 bg-orange-50/60 dark:bg-orange-950/20'
                : 'border-gray-200 hover:border-gray-300 dark:border-gray-700'
            }`}
          >
            <input
              type="radio"
              name="checkout-address"
              value={addr.id}
              checked={selectedId === addr.id}
              onChange={() => onSelect(addr.id)}
              className="mt-1"
            />
            <span>
              <span className="font-medium text-gray-900 dark:text-white">
                {formatAddressLine(addr)}
                {addr.is_default && (
                  <span className="ml-2 text-xs text-orange-600">預設</span>
                )}
              </span>
              <span className="mt-0.5 block text-xs text-gray-500 line-clamp-2">
                {addr.address}
              </span>
            </span>
          </label>
        ))}
        <label
          className={`flex cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm ${
            selectedId === 'new'
              ? 'border-orange-500 bg-orange-50/60 dark:bg-orange-950/20'
              : 'border-gray-200 dark:border-gray-700'
          }`}
        >
          <input
            type="radio"
            name="checkout-address"
            value="new"
            checked={selectedId === 'new'}
            onChange={() => onSelect('new')}
          />
          <span className="font-medium text-gray-900 dark:text-white">使用新地址</span>
        </label>
      </div>

      {selectedId === 'new' && (
        <div className="space-y-3 rounded-xl bg-gray-50 p-4 dark:bg-gray-800/50">
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input
              type="checkbox"
              checked={saveToAddressBook}
              onChange={(e) => onSaveToAddressBookChange(e.target.checked)}
              className="rounded border-gray-300"
            />
            儲存到地址簿
          </label>
          {saveToAddressBook && (
            <div>
              <label htmlFor="checkout-addr-label" className="text-xs text-gray-500">
                地址標籤（選填）
              </label>
              <input
                id="checkout-addr-label"
                value={addressLabel}
                onChange={(e) => onAddressLabelChange(e.target.value)}
                placeholder="家、公司…"
                className="mt-1 flex h-10 w-full rounded-lg border border-input bg-background px-3 text-sm dark:bg-gray-900"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function addressToShippingFields(addr: BuyerAddress): CheckoutShippingFields {
  return {
    name: addr.name,
    phone: addr.phone,
    address: addr.address,
  };
}
