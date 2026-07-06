# Supabase 資料庫遷移指南

本專案使用**增量 SQL 腳本**管理 schema。請在 Supabase SQL Editor **依序**執行，每個檔案通常只需執行一次。

## 全新專案

1. 執行 `schema.sql`（基礎表與 RLS）
2. 依下表從 **v2 到 v39** 依序執行各 `migrate-v*.sql`
3. 可選：執行 `seed.sql`（示範分類）

## 既有專案

跳過 `schema.sql`，從**尚未執行過**的 migrate 版本開始。

> **注意**：`migrate-v13-v17-payment-all.sql` 與 `migrate-v13`～`v17` 個別檔案內容重疊，**擇一執行即可**（建議新環境用合併檔 v13-v17-payment-all，或逐檔 v13→v17）。

## 遷移清單

| 版本 | 檔案 | 說明 |
|------|------|------|
| 基礎 | `schema.sql` | profiles、merchants、products、orders、基礎 RLS |
| v2 | `migrate-v2.sql` | 庫存、tracking_number、退款相關 order status |
| v3 | `migrate-v3-hk-merchant.sql` | 香港商家欄位 |
| v4 | `migrate-v4-google-profile.sql` | Google OAuth 個人資料 |
| v5 | `migrate-v5-delivery.sql` | 配送區域、配送員、搶單 RPC |
| v6 | `migrate-v6-shipping.sql` | 訂單收貨地址 |
| v7 | `migrate-v7-merchant-tier.sql` | 商家等級與升級申請 |
| v8 | `migrate-v8-merchant-subscriptions.sql` | Stripe 月費訂閱 |
| v9 | `migrate-v9-orders-realtime.sql` | 訂單 Realtime |
| v10 | `migrate-v10-delivery-tracking.sql` | 配送 GPS、地圖追蹤 |
| v11 | `migrate-v11-merchant-logo.sql` | 店鋪 Logo |
| v12 | `migrate-v12-courier-hkid-declaration.sql` | 配送員 HKID 聲明 |
| v13–v17 | `migrate-v13-v17-payment-all.sql` **或** v13～v17 個別檔 | 商家付款方式、收款 QR、order.payment_method |
| v18 | `migrate-v18-finance.sql` | 財務分錄 order_ledger |
| v19 | `migrate-v19-accountant-role.sql` | accountant 角色 |
| v20 | `migrate-v20-courier-payroll.sql` | 配送員薪資 |
| v21 | `migrate-v21-merchant-courier-fees.sql` | 商家配送費 |
| v22 | `migrate-v22-hk-districts.sql` | 香港區域 |
| v23 | `migrate-v23-shipping-buyer-rating.sql` | 訂單 subtotal/shipping_fee、買家評分 |
| v24 | `migrate-v24-courier-customer-ratings.sql` | 配送員評分 |
| v25 | `migrate-v25-high-rating-bonus.sql` | 高評分獎金 |
| v26 | `migrate-v26-courier-platform-fee.sql` | 平台配送費 |
| v27 | `migrate-v27-courier-fee-snapshot-fix.sql` | 配送費快照修正 |
| v28 | `migrate-v28-merchant-business-type.sql` | 商家業務類型 food/retail |
| v29 | `migrate-v29-product-shipping-fees.sql` | 商品運費欄位 |
| v30 | `migrate-v30-courier-min-base-fee.sql` | 配送最低基本費 |
| v31 | `migrate-v31-buyer-addresses.sql` | 買家地址簿 |
| v32 | `migrate-v32-qr-login-polls.sql` | 掃碼登入輪詢 |
| v33 | `migrate-v33-push-subscriptions.sql` | Web Push 訂閱 |
| v34 | `migrate-v34-buyer-payment-claimed.sql` | 買家線下付款回報 |
| v35 | `migrate-v35-merchant-menu-categories.sql` | 餐飲餐單分類 |
| v36 | `migrate-v36-product-kind-attributes.sql` | 商品行業欄位 |
| v37 | `migrate-v37-product-variants.sql` | 零售規格表 |
| v38 | `migrate-v38-product-option-groups.sql` | 餐飲選項群組 |
| v39 | `migrate-v39-order-completed.sql` | 訂單 completed 狀態 |

## 驗證

執行後可在 SQL Editor 確認：

```sql
-- RLS 已啟用
select tablename, rowsecurity from pg_tables
where schemaname = 'public' and tablename in ('orders', 'products', 'product_variants');

-- 最新 order status 含 completed（需 v39）
select conname, pg_get_constraintdef(oid)
from pg_constraint
where conrelid = 'orders'::regclass and conname like '%status%';
```

## 常見錯誤

若 API 回傳「請執行 supabase/migrate-vXX…」，表示該 migrate 尚未執行，請對照上表補跑。

`schema.sql` **不是**最新完整 schema，僅作全新專案起點；正式環境請以 migrate 清單為準。
