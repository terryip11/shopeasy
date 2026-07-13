export type PromoterPayoutDetails = {
  accountHolder: string;
  fpsId: string;
};

export function validatePromoterFpsPayout(payout: PromoterPayoutDetails): string | null {
  const accountHolder = payout.accountHolder.trim();
  const fpsId = payout.fpsId.trim();

  if (!accountHolder) {
    return '請填寫 FPS 收款人姓名';
  }
  if (accountHolder.length < 2) {
    return '收款人姓名至少 2 個字元';
  }
  if (!fpsId) {
    return '請填寫轉數快 FPS 識別碼（電話 / 電郵 / FPS ID）';
  }
  if (fpsId.length < 4) {
    return 'FPS 識別碼格式不正確';
  }

  return null;
}

export function payoutFromPromoterProfile(row: {
  payout_account_holder?: string | null;
  payout_fps_id?: string | null;
}): PromoterPayoutDetails {
  return {
    accountHolder: row.payout_account_holder?.trim() ?? '',
    fpsId: row.payout_fps_id?.trim() ?? '',
  };
}
