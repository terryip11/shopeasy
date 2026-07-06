/**
 * src/lib/storage/index.ts
 * 存储模块统一导出
 */

export * from './types';
export * from './presigned';
export { default as r2Client } from './r2';
export { default as s3Client } from './s3';
export { STORAGE_CONFIG } from './config';

export { createPresignedUploadUrl, getPublicUrl } from './presigned';

