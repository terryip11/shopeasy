# ShopEasy

Next.js 16 電商平台，支援買家購物、商家後台、配送員搶單、平台管理後台，整合 Supabase、Stripe、Cloudflare R2。

## 功能概覽

| 角色 | 功能 |
|------|------|
| 買家 | 瀏覽商品、搜尋、購物車、結帳（含收貨地址）、Stripe 付款、訂單查詢／取消、申請退款 |
| 商家 | 入駐申請、商品 CRUD、訂單發貨、建立配送任務、退款處理 |
| 配送員 | 申請送餐／送貨資格、搶單、更新配送狀態 |
| 營運管理員 | 商家審批、分類／商品／訂單管理、配送員審批 |
| 全權管理員 | 用戶角色與配送權限、商家停用、審計日誌 |

## 專案結構

```
src/
├── app/
│   ├── (admin)/admin/        # 管理後台
│   ├── (merchant)/dashboard/ # 商家後台
│   ├── courier/              # 配送員工作台
│   ├── products/ cart/ checkout/ orders/
│   ├── forgot-password/      # 忘記密碼
│   └── api/                  # REST API（含 Stripe webhook）
├── components/
├── lib/
│   ├── auth/                 # 權限與 session
│   ├── checkout/shipping.ts  # 結帳收貨地址驗證
│   ├── delivery/             # 配送任務
│   ├── orders/mark-paid.ts   # 付款後扣庫存、建立配送
│   └── storage/              # R2 上傳
└── middleware.ts
supabase/
├── schema.sql                # 基礎資料表與 RLS
├── migrate-v2.sql … migrate-v39-order-completed.sql  # 見 supabase/MIGRATIONS.md
└── seed.sql                  # 示範分類
```

## 快速開始

### 1. 安裝依賴

```bash
npm install
```

### 2. 環境變數

複製 `.env.example` 為 `.env.local` 並填入：

- **Supabase**：`NEXT_PUBLIC_SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`、`SUPABASE_SERVICE_ROLE_KEY`
- **Stripe**：`STRIPE_SECRET_KEY`、`NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`、`STRIPE_WEBHOOK_SECRET`
- **R2 圖片**：`R2_*`、`NEXT_PUBLIC_R2_PUBLIC_URL`（須與上傳所用的 bucket 對應的 r2.dev 公開網址一致）
- **應用網址**：`NEXT_PUBLIC_APP_URL`（OAuth／密碼重設回調用）
- **Upstash Redis**（Vercel 部署建議）：`UPSTASH_REDIS_REST_URL`、`UPSTASH_REDIS_REST_TOKEN` — 全局限流；本機可不填

### 3. 資料庫

完整遷移清單見 **`supabase/MIGRATIONS.md`**（v2 → v39）。

在 Supabase SQL Editor 依序執行：

| 順序 | 檔案 | 說明 |
|------|------|------|
| 1 | `schema.sql` | 全新專案基礎表 |
| 2 | `migrate-v2.sql` … `migrate-v39-order-completed.sql` | 依 MIGRATIONS.md 順序 |
| 可選 | `seed.sql` | 示範分類 |

若已有舊版資料庫，跳過 `schema.sql`，從尚未執行的 migrate 開始。

建立全權管理員：

```sql
UPDATE profiles SET role = 'super_admin' WHERE id = '你的-user-uuid';
```

### 4. Supabase Auth 設定

1. **Google OAuth**（可選）：在 Supabase Dashboard → Authentication → Providers 啟用 Google，並將 redirect URL 設為 `{NEXT_PUBLIC_APP_URL}/auth/callback`
2. **密碼重設**：確認 Site URL 與 Redirect URLs 包含 `{NEXT_PUBLIC_APP_URL}/auth/callback`

### 5. 開發

```bash
npm run dev
```

**Stripe 本地 webhook**（正式測試付款流程）：

```bash
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

將輸出的 `whsec_...` 填入 `.env.local` 的 `STRIPE_WEBHOOK_SECRET`。

**無 Stripe 時快速測試付款**：在開發模式下，商家後台訂單列表對「待付款」訂單會顯示「標記已付款（開發）」按鈕，或呼叫：

```bash
curl -X POST http://localhost:3000/api/dev/orders/{orderId}/mark-paid
```

（需以商家或 super_admin 登入後帶 cookie。**production 環境一律禁用**；本機可設 `ALLOW_DEV_MARK_PAID=true`。）

### 6. Upstash Redis 限流（Vercel 部署建議）

1. 至 [Upstash Console](https://console.upstash.com) 建立 Redis 資料庫
2. 複製 **REST URL** 與 **REST Token** 到 `.env.local` / Vercel 環境變數
3. 未設定時，限流 fallback 為程序內記憶體（本機開發可用；serverless 多實例下不可靠）

受保護的 API 包括：結帳、忘記密碼、掃碼登入、圖片上傳、配送搶單等。

### 7. 建置與檢查

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

## 配送流程簡述

1. 買家結帳時填寫收貨人、電話、地址、配送區域
2. Stripe 付款成功（或開發模式標記已付款）後，系統自動建立 `parcel` 配送任務
3. 商家可在訂單管理手動建立／調整 `food` 類配送任務
4. 已審核的配送員在 `/courier` 搶單並更新狀態
5. 商家在 `/dashboard/orders` 可查看接單配送員，並在訂單詳情頁以地圖追蹤送達位置與配送員 GPS

## 角色說明

- `buyer`：一般買家
- `merchant`：已通過審核的商家
- `admin`：營運管理員
- `super_admin`：全權管理員

配送權限（`user_capabilities`）與帳號角色分開：`food_courier`（送餐）、`parcel_courier`（送貨）。

## 商家等級（月費訂閱）

| 等級 | 月費 | 商品上限 | 每件圖片上限 |
|------|------|----------|--------------|
| 普通 | 免費 | 3 | 2 |
| 高級 | HK$88 | 20 | 5 |
| 尊貴 | HK$128 | 50 | 8 |

商家在儀表板點「升級方案」→ Stripe 付款後**自動升級**（無需 admin 審批）。`super_admin` 可在 `/admin/revenue` 查看訂閱收入。

本地測試需執行 `stripe listen --forward-to localhost:3000/api/webhooks/stripe`，並在 Stripe Dashboard 啟用訂閱相關 webhook 事件（`checkout.session.completed`、`invoice.paid`、`customer.subscription.deleted`）。

## 授權

Private
