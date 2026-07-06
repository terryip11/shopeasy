import 'server-only';

/**
 * src/lib/storage/s3.ts
 * AWS S3 客户端（视频存储）
 */

import { S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PutObjectCommand } from '@aws-sdk/client-s3';
import type { PresignedPutUrl, UploadMetadata } from './types';
import { STORAGE_CONFIG } from './config';

const s3Client = new S3Client({
  region: STORAGE_CONFIG.s3.region,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export const getS3PresignedPutUrl = async (
  key: string,
  metadata?: UploadMetadata
): Promise<PresignedPutUrl> => {
  try {
    const command = new PutObjectCommand({
      Bucket: STORAGE_CONFIG.s3.bucket,
      Key: key,
      ContentType: metadata?.contentType,
    });

    const url = await getSignedUrl(s3Client, command, { expiresIn: 900 }); // 15min

    return {
      url,
      key,
      expiresAt: Date.now() + 900 * 1000,
    };
  } catch (error) {
    console.error('S3 presigned URL 生成失败:', error);
    throw new Error(`S3 presign failed: ${(error as Error).message}`);
  }
};

export const getS3PublicUrl = (key: string): string => {
  return `https://${STORAGE_CONFIG.s3.bucket}.s3.${STORAGE_CONFIG.s3.region}.amazonaws.com/${key}`;
};

export default s3Client;

