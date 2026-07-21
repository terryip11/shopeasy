export const PROMOTER_TERMS_TITLE = '分享員計劃條款';

export const PROMOTER_TERMS_BODY = `加入 ShopEasy 分享員計劃後，您可為平台上已開放分享的商品建立專屬連結；當其他用戶透過您的連結購買並完成付款，您將依商家設定的佣金比例獲得收入。佣金由商家以轉數快（FPS）直接支付予您，平台不代收代付。

您同意：
• 提供真實有效的轉數快（FPS）收款資料，供商家付款與平台對帳；
• 不以虛假、誤導方式推廣商品；
• 不自行下單套取佣金；
• 遵守平台與商家的分享推廣規則；
• 平台可因違規暫停或終止您的分享員資格。

佣金金額以系統紀錄為準；若商家逾期未付，可於分享員中心回報平台跟進（平台不代墊）。`;

/** 可自行登記為分享員的身分 */
export const PROMOTER_SELF_REGISTER_ROLES = ['buyer'] as const;

export type PromoterSelfRegisterRole = (typeof PROMOTER_SELF_REGISTER_ROLES)[number];

export function canSelfRegisterAsPromoter(role: string | null | undefined): boolean {
  return role != null && (PROMOTER_SELF_REGISTER_ROLES as readonly string[]).includes(role);
}
