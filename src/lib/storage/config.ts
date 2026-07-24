/**
 * src/lib/storage/config.ts
 * 存储配置 - 从环境变量加载
 */

import type { StorageConfig } from './types';

export const STORAGE_CONFIG: StorageConfig = {
  r2: {
    accountId: process.env.R2_ACCOUNT_ID || '',
    r2Bucket: process.env.R2_BUCKET || 'images',
  },
  s3: {
    region: process.env.AWS_REGION || 'us-east-1',
    bucket: process.env.S3_BUCKET || 'videos',
  },
};

/**
 * 物件 key 含時間戳／唯一名，內容不會原地覆寫，可長快取。
 * 寫入物件 metadata，公開 URL（r2.dev／自訂網域）會帶出此標頭。
 */
export const PUBLIC_ASSET_CACHE_CONTROL = 'public, max-age=31536000, immutable';
