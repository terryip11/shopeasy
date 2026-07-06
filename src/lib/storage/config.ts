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

