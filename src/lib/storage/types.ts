/**
 * src/lib/storage/types.ts
 * 存储相关类型定义
 */

export type FileUploadType = 'image' | 'video';

export interface PresignedPutUrl {
  url: string;
  key: string;
  expiresAt: number; // timestamp in ms
}

export interface UploadMetadata {
  size?: number;
  contentType?: string;
  originalName?: string;
}

export interface UploadResult {
  key: string;
  publicUrl: string;
  uploadUrl: string;
}

export interface StorageConfig {
  r2: {
    accountId: string;
    r2Bucket: string;
  };
  s3: {
    region: string;
    bucket: string;
  };
}

