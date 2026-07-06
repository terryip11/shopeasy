import { z } from 'zod';
import { MERCHANT_BUSINESS_TYPES } from '@/lib/merchant/business-type';

/** 香港公司商家入駐 — 個人資料收集聲明（PDPO 參考） */
export const MERCHANT_DATA_CONSENT_STATEMENT = `ShopEasy 平台商家入駐 — 個人資料收集聲明

1. 收集目的
本平台收集閣下及所代表香港公司的資料，目的包括：
(a) 處理商家入駐申請及身分核實；
(b) 核對商業登記（BR）及公司註冊證明（CI）；
(c) 與閣下聯絡有關申請、審核結果及平台營運事宜；
(d) 遵守香港適用法律及監管要求。

2. 收集的資料類別
• 聯絡人姓名、聯絡電話、聯絡電郵
• 公司營業地址
• 店鋪名稱及網址代稱
• 商業登記證（BR）及公司註冊證明（CI）影像檔

3. 資料使用及保存
資料僅用於上述目的，並於達成目的所需期間內保存，或按法律規定保存更長時間。

4. 資料轉移
資料可能由本平台委託的雲端服務供應商（如 Supabase、Cloudflare）在香港以外地區處理，我們會採取合理措施保障資料安全。

5. 查閱及更正
閣下有權查閱及要求更正所提交的個人資料，可透過平台客服提出申請。

6. 自願提供
閣下可選擇是否提供資料，但未提供完整資料及同意本聲明，將無法完成商家入駐申請。

提交申請即表示閣下已閱讀、明白並同意本聲明。`;

const hkPhoneRegex = /^(\+852[-\s]?)?[2-9]\d{7}$/;

export const merchantApplySchema = z.object({
  name: z.string().min(2, '店鋪名稱至少 2 個字').max(100),
  slug: z
    .string()
    .min(3, '店鋪連結至少 3 個字')
    .max(50)
    .regex(/^[a-z0-9-]+$/, '僅限小寫英文、數字和連字號'),
  contact_name: z.string().min(2, '請填寫聯絡人姓名').max(100),
  contact_phone: z
    .string()
    .min(8, '請填寫有效的香港聯絡電話')
    .max(20)
    .refine((v) => hkPhoneRegex.test(v.replace(/\s/g, '')), '請填寫有效的香港聯絡電話（8 位數字）'),
  contact_email: z.string().email('請填寫有效的電郵地址'),
  company_address: z.string().min(5, '請填寫公司營業地址').max(500),
  business_type: z.enum(MERCHANT_BUSINESS_TYPES).optional(),
  br_image_url: z.string().url('請上傳商業登記證（BR）'),
  ci_image_url: z.string().url('請上傳公司註冊證明（CI）'),
  data_consent: z.literal(true, {
    error: '請閱讀並同意個人資料收集聲明後方可提交',
  }),
});

export type MerchantApplyFormData = z.infer<typeof merchantApplySchema>;

export const merchantApplyFields = [
  'name',
  'slug',
  'contact_name',
  'contact_phone',
  'contact_email',
  'company_address',
  'business_type',
  'br_image_url',
  'ci_image_url',
] as const;

export function buildMerchantApplyPayload(data: MerchantApplyFormData) {
  return {
    name: data.name,
    slug: data.slug,
    contact_name: data.contact_name,
    contact_phone: data.contact_phone.replace(/\s/g, ''),
    contact_email: data.contact_email,
    company_address: data.company_address,
    business_type: data.business_type ?? 'retail',
    br_image_url: data.br_image_url,
    ci_image_url: data.ci_image_url,
    data_consent_at: new Date().toISOString(),
  };
}
