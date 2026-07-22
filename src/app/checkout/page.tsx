'use client';

import { useEffect, useRef, useState } from 'react';
import { AppImage } from '@/components/shared/app-image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/marketing/navbar';
import { Footer } from '@/components/marketing/footer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  PaymentMethodPicker,
  type CheckoutPaymentOption,
} from '@/components/checkout/payment-method-picker';
import {
  CheckoutAddressPicker,
  addressToShippingFields,
} from '@/components/checkout/checkout-address-picker';
import { getCart, getCartTotal, saveCart, type CartItem } from '@/lib/cart';
import {
  clearCheckoutDraft,
  loadCheckoutDraft,
  saveCheckoutDraft,
} from '@/lib/checkout/draft';
import type { Database } from '@/types/database';
import type { MerchantPaymentMethod } from '@/lib/merchant/payment-methods';
import { getAffiliateRefFromDocument } from '@/lib/affiliate/client';
import {
  MapPin,
  User,
  Phone,
  Package,
  ChevronLeft,
  ShieldCheck,
} from 'lucide-react';

type BuyerAddress = Database['public']['Tables']['buyer_addresses']['Row'];

const textareaClassName =
  'mt-1.5 flex min-h-[120px] w-full resize-y rounded-xl border border-input bg-background px-3.5 py-3 text-sm leading-relaxed ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:bg-gray-900';

export default function CheckoutPage() {
  const router = useRouter();
  const [items, setItems] = useState<CartItem[]>([]);
  const [name, setName] = useState(() => loadCheckoutDraft()?.name ?? '');
  const [phone, setPhone] = useState(() => loadCheckoutDraft()?.phone ?? '');
  const [address, setAddress] = useState(() => loadCheckoutDraft()?.address ?? '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [paymentOptions, setPaymentOptions] = useState<CheckoutPaymentOption[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<MerchantPaymentMethod>(
    () => loadCheckoutDraft()?.paymentMethod ?? 'card'
  );
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [optionsError, setOptionsError] = useState('');
  const [subtotal, setSubtotal] = useState(0);
  const [shippingFee, setShippingFee] = useState(0);
  const [orderTotal, setOrderTotal] = useState(0);
  const [loggedIn, setLoggedIn] = useState(false);
  const [savedAddresses, setSavedAddresses] = useState<BuyerAddress[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string>(
    () => loadCheckoutDraft()?.selectedAddressId ?? 'new'
  );
  const [saveToAddressBook, setSaveToAddressBook] = useState(
    () => loadCheckoutDraft()?.saveToAddressBook ?? true
  );
  const [addressLabel, setAddressLabel] = useState(
    () => loadCheckoutDraft()?.addressLabel ?? ''
  );
  const restoredFromDraft = useRef(Boolean(loadCheckoutDraft()));

  const applyShippingFields = (fields: {
    name: string;
    phone: string;
    address: string;
  }) => {
    setName(fields.name);
    setPhone(fields.phone);
    setAddress(fields.address);
  };

  const handleSelectAddress = (id: string) => {
    setSelectedAddressId(id);
    if (id === 'new') return;
    const addr = savedAddresses.find((a) => a.id === id);
    if (addr) applyShippingFields(addressToShippingFields(addr));
  };

  useEffect(() => {
    const cart = getCart();
    setItems(cart);

    fetch('/api/me')
      .then((r) => r.json())
      .then((me) => {
        if (!me?.user) return;
        setLoggedIn(true);
        return fetch('/api/buyer/addresses').then(async (res) => {
          if (!res.ok) return;
          const data = await res.json();
          const list = (data.addresses || []) as BuyerAddress[];
          setSavedAddresses(list);
          const defaultAddr =
            list.find((a) => a.is_default) ?? list[0] ?? null;
          if (!restoredFromDraft.current && defaultAddr) {
            setSelectedAddressId(defaultAddr.id);
            applyShippingFields(addressToShippingFields(defaultAddr));
          }
        });
      })
      .catch(() => {});

    if (cart.length === 0) return;

    setOptionsLoading(true);
    setOptionsError('');
    fetch('/api/checkout/options', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: cart }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || '無法載入付款方式');
        const methods = (data.methods || []) as CheckoutPaymentOption[];
        setPaymentOptions(methods);
        setSubtotal(Number(data.subtotal ?? 0));
        setShippingFee(Number(data.shippingFee ?? 0));
        setOrderTotal(Number(data.total ?? data.subtotal ?? 0));
        const firstAvailable = methods.find((m) => m.available);
        const draftMethod = loadCheckoutDraft()?.paymentMethod;
        if (
          draftMethod &&
          methods.some((m) => m.id === draftMethod && m.available)
        ) {
          setPaymentMethod(draftMethod);
        } else if (firstAvailable) {
          setPaymentMethod(firstAvailable.id);
        }
      })
      .catch((err) => {
        setOptionsError((err as Error).message);
        setPaymentOptions([]);
      })
      .finally(() => setOptionsLoading(false));
  }, []);

  useEffect(() => {
    saveCheckoutDraft({
      name,
      phone,
      address,
      selectedAddressId,
      paymentMethod,
      saveToAddressBook,
      addressLabel,
    });
  }, [
    name,
    phone,
    address,
    selectedAddressId,
    paymentMethod,
    saveToAddressBook,
    addressLabel,
  ]);

  const total = getCartTotal(items);
  const displaySubtotal = subtotal > 0 ? subtotal : total;
  const displayTotal = orderTotal > 0 ? orderTotal : total;
  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);

  const handleCheckout = async () => {
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items,
          shipping: { name, phone, address },
          payment_method: paymentMethod,
          save_to_address_book:
            loggedIn && selectedAddressId === 'new' && saveToAddressBook,
          address_label: addressLabel || null,
          affiliate_ref: getAffiliateRefFromDocument(),
        }),
      });

      const data = await res.json();

      if (res.status === 401) {
        router.push('/login?redirect=/checkout');
        return;
      }

      if (!res.ok) {
        throw new Error(data.error || '結帳失敗');
      }

      if (data.type === 'manual' && data.redirectUrl) {
        clearCheckoutDraft();
        window.location.href = data.redirectUrl;
        return;
      }

      if (data.url) {
        clearCheckoutDraft();
        saveCart([]);
        window.dispatchEvent(new Event('shopeasy-cart-updated'));
        window.location.href = data.url;
      }
    } catch (err) {
      setError((err as Error).message);
      setLoading(false);
    }
  };

  const hasPayableMethod = paymentOptions.some((o) => o.available);
  const canSubmit =
    name.trim() &&
    phone.trim() &&
    address.trim().length >= 5 &&
    !loading &&
    !optionsLoading &&
    hasPayableMethod &&
    paymentOptions.some((o) => o.available && o.id === paymentMethod);

  const isCard = paymentMethod === 'card';
  const submitLabel = loading
    ? isCard
      ? '跳轉至 Stripe...'
      : '建立訂單...'
    : isCard
      ? '使用信用卡付款'
      : '確認下單並查看收款資訊';

  return (
    <div className="min-h-full flex flex-col bg-gray-50 dark:bg-gray-950">
      <Navbar />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6 lg:py-12">
        <Link
          href="/cart"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-orange-600"
        >
          <ChevronLeft className="h-4 w-4" />
          返回購物車
        </Link>

        <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl dark:text-white">結帳</h1>
            <p className="mt-1 text-sm text-gray-500">填寫收貨資料並選擇付款方式</p>
          </div>
          {items.length > 0 && (
            <p className="text-sm text-gray-500">
              共 <span className="font-semibold text-gray-900 dark:text-white">{itemCount}</span> 件商品
            </p>
          )}
        </div>

        {items.length === 0 ? (
          <div className="mt-12 rounded-2xl bg-white p-12 text-center shadow-sm dark:bg-gray-900">
            <Package className="mx-auto h-12 w-12 text-gray-300" />
            <p className="mt-4 text-gray-500">購物車是空的</p>
            <Link href="/products" className="mt-4 inline-block text-orange-500 hover:underline">
              去逛逛商品
            </Link>
          </div>
        ) : (
          <div className="mt-8 grid gap-8 lg:grid-cols-5 lg:items-start">
            {/* 收貨資訊 */}
            <div className="lg:col-span-3 space-y-6">
              <section className="overflow-hidden rounded-2xl bg-white shadow-sm dark:bg-gray-900">
                <div className="border-b border-gray-100 bg-orange-50/60 px-6 py-4 dark:border-gray-800 dark:bg-orange-950/20">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-orange-500" />
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">收貨資訊</h2>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">請填寫可聯絡的香港收貨地址</p>
                </div>

                <div className="space-y-5 p-6">
                  <CheckoutAddressPicker
                    addresses={savedAddresses}
                    selectedId={selectedAddressId}
                    onSelect={handleSelectAddress}
                    loggedIn={loggedIn}
                    saveToAddressBook={saveToAddressBook}
                    onSaveToAddressBookChange={setSaveToAddressBook}
                    addressLabel={addressLabel}
                    onAddressLabelChange={setAddressLabel}
                  />

                  <div className="grid gap-5 sm:grid-cols-2">
                    <div>
                      <Label htmlFor="name" className="flex items-center gap-1.5">
                        <User className="h-3.5 w-3.5 text-gray-400" />
                        收件人姓名
                      </Label>
                      <Input
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                        className="mt-1.5 h-11"
                        placeholder="陳大文"
                        autoComplete="name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone" className="flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5 text-gray-400" />
                        聯絡電話
                      </Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        required
                        className="mt-1.5 h-11"
                        placeholder="9123 4567"
                        autoComplete="tel"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="address" className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-gray-400" />
                        詳細收貨地址
                      </span>
                      <span className="text-xs font-normal text-gray-400">建議填寫完整樓層及單位</span>
                    </Label>
                    <textarea
                      id="address"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      required
                      rows={5}
                      autoComplete="street-address"
                      className={textareaClassName}
                      placeholder={`例如：\n九龍旺角彌敦道 688 號\n旺角中心第 2 座 15 樓 1508 室`}
                    />
                    <p className="mt-1.5 text-xs text-gray-400">
                      已輸入 {address.length} 字 · 至少 5 字
                    </p>
                  </div>
                </div>
              </section>

              <PaymentMethodPicker
                options={paymentOptions}
                selected={paymentMethod}
                onSelect={setPaymentMethod}
                loading={optionsLoading || loading}
              />

              {optionsError && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
                  無法載入付款方式：{optionsError}
                </div>
              )}

              {!optionsLoading && paymentOptions.length > 0 && !hasPayableMethod && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
                  目前沒有可用的付款方式。線上信用卡即將開放；請選擇已設定收款資料的轉帳、FPS 或微信／支付寶，或聯絡商家。
                </div>
              )}

              {error && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-900 dark:bg-red-950/30 dark:text-red-400">
                  {error}
                </div>
              )}
            </div>

            {/* 訂單摘要 */}
            <aside className="lg:col-span-2 lg:sticky lg:top-24">
              <div className="overflow-hidden rounded-2xl bg-white shadow-sm dark:bg-gray-900">
                <div className="border-b border-gray-100 px-6 py-4 dark:border-gray-800">
                  <div className="flex items-center gap-2">
                    <Package className="h-5 w-5 text-orange-500" />
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">訂單摘要</h2>
                  </div>
                </div>

                <ul className="max-h-[320px] divide-y divide-gray-100 overflow-y-auto dark:divide-gray-800">
                  {items.map((item) => (
                    <li key={item.id} className="flex gap-3 px-6 py-4">
                      <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-800">
                        <AppImage
                          src={item.image?.startsWith('http') ? item.image : '/next.svg'}
                          alt={item.name}
                          fill
                          className="object-cover"
                          sizes="64px"
                        />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-gray-900 dark:text-white">{item.name}</p>
                        <p className="mt-0.5 text-sm text-gray-500">數量 × {item.quantity}</p>
                        <p className="mt-1 text-sm font-semibold text-orange-500">
                          HK${(item.price * item.quantity).toFixed(2)}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>

                <div className="space-y-3 border-t border-gray-100 px-6 py-5 dark:border-gray-800">
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>小計</span>
                    <span>HK${displaySubtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm text-gray-500">
                    <span>運費</span>
                    <span>
                      {optionsLoading
                        ? '計算中...'
                        : shippingFee > 0
                          ? `HK$${shippingFee.toFixed(2)}`
                          : '免運'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-t border-dashed border-gray-200 pt-3 dark:border-gray-700">
                    <span className="text-base font-semibold text-gray-900 dark:text-white">應付總額</span>
                    <span className="text-xl font-bold text-orange-500">HK${displayTotal.toFixed(2)}</span>
                  </div>

                  <Button
                    onClick={handleCheckout}
                    disabled={!canSubmit}
                    className="mt-2 h-12 w-full gap-2 text-base"
                  >
                    {submitLabel}
                  </Button>

                  <p className="flex items-center justify-center gap-1.5 text-xs text-gray-400">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    {isCard ? '由 Stripe 加密處理付款' : '下單後將顯示商家收款資訊'}
                  </p>
                </div>
              </div>
            </aside>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
