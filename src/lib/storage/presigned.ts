import 'server-only';

/**
 * src/lib/storage/presigned.ts
 * 统一预签名 URL 生成器
 */

import type { FileUploadType, PresignedPutUrl, UploadMetadata } from './types';
import { buildR2PublicImageUrl } from './r2-public-url';
import { getR2PresignedPutUrl } from './r2';
import { getS3PresignedPutUrl } from './s3';

export const createPresignedUploadUrl = async (
  type: FileUploadType,
  key: string,
  metadata?: UploadMetadata
): Promise<PresignedPutUrl> => {
  switch (type) {
    case 'image':
      return getR2PresignedPutUrl(key, metadata);
    case 'video':
      return getS3PresignedPutUrl(key, metadata);
    default:
      throw new Error('不支持的文件类型');
  }
};

export const getPublicUrl = (type: FileUploadType, key: string): string => {
  switch (type) {
    case 'image':
      return buildR2PublicImageUrl(key);
    case 'video':
      return `https://${process.env.S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
    default:
      throw new Error('不支持的文件类型');
  }
};

