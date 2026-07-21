import Link from 'next/link';

/**
 * 落地頁頁尾：與平台定位一致
 */
export function PlatformLandingFooter() {
  return (
    <footer className="border-t border-stone-800 bg-stone-950 text-stone-300">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr] lg:px-8">
        <div>
          <p className="font-[family-name:var(--font-landing-display)] text-xl font-semibold text-white">
            ShopEasy
          </p>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-stone-400">
            香港本地購物與配送平台——連接買家、商家與配送夥伴，讓街坊日常消費更簡單。
          </p>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">探索</p>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li>
              <Link href="/products" className="hover:text-white">
                開始購物
              </Link>
            </li>
            <li>
              <Link href="/categories" className="hover:text-white">
                商品分類
              </Link>
            </li>
            <li>
              <a href="#how" className="hover:text-white">
                如何運作
              </a>
            </li>
          </ul>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-stone-500">加入我們</p>
          <ul className="mt-4 space-y-2.5 text-sm">
            <li>
              <Link href="/merchant/apply" className="hover:text-white">
                商家入駐
              </Link>
            </li>
            <li>
              <Link href="/courier" className="hover:text-white">
                成為配送夥伴
              </Link>
            </li>
            <li>
              <Link href="/login" className="hover:text-white">
                登入
              </Link>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-stone-800">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-6 text-xs text-stone-500 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
          <p>© {new Date().getFullYear()} ShopEasy</p>
          <p>本地市場 · 買 · 賣 · 送</p>
        </div>
      </div>
    </footer>
  );
}
