/** 配送取件 QR／確認碼工具（client / server 共用） */

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export function generatePickupCode(length = 8): string {
  const bytes = new Uint8Array(length);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < length; i += 1) bytes[i] = Math.floor(Math.random() * 256);
  }
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += CODE_ALPHABET[bytes[i]! % CODE_ALPHABET.length];
  }
  return out;
}

/** QR 內容格式：SEPK|{jobId}|{code} */
export function buildPickupQrPayload(jobId: string, pickupCode: string): string {
  return `SEPK|${jobId}|${pickupCode.trim().toUpperCase()}`;
}

export function parsePickupQrPayload(raw: string): { jobId: string; code: string } | null {
  const text = raw.trim();
  const parts = text.split('|');
  if (parts.length === 3 && parts[0] === 'SEPK' && parts[1] && parts[2]) {
    return { jobId: parts[1], code: parts[2].trim().toUpperCase() };
  }

  // 相容：只掃到純確認碼
  if (/^[A-Z0-9]{6,12}$/i.test(text)) {
    return { jobId: '', code: text.toUpperCase() };
  }

  return null;
}

export function normalizePickupCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}
