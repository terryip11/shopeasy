import 'server-only';

/**
 * src/lib/storage/r2.ts
 * Cloudflare R2 客户端（图片存储）
 * 使用 AWS SDK 兼容 R2 S3 API，避免 minio 的 Node.js 依赖问题
 */

import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { PresignedPutUrl, UploadMetadata } from './types';
import { buildR2PublicImageUrl } from './r2-public-url';
import { STORAGE_CONFIG } from './config';

const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${STORAGE_CONFIG.r2.accountId}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export const uploadToR2 = async (
  key: string,
  body: Buffer | Uint8Array,
  contentType?: string
) => {
  const command = new PutObjectCommand({
    Bucket: STORAGE_CONFIG.r2.r2Bucket,
    Key: key,
    Body: body,
    ContentType: contentType,
  });

  await r2Client.send(command);
};

export const getR2Object = async (key: string) => {
  const command = new GetObjectCommand({
    Bucket: STORAGE_CONFIG.r2.r2Bucket,
    Key: key,
  });
  return r2Client.send(command);
};

export const getR2PresignedPutUrl = async (
  key: string,
  metadata?: UploadMetadata
): Promise<PresignedPutUrl> => {
  try {
    const command = new PutObjectCommand({
      Bucket: STORAGE_CONFIG.r2.r2Bucket,
      Key: key,
      ContentType: metadata?.contentType,
    });

    const url = await getSignedUrl(r2Client, command, { expiresIn: 900 }); // 15min

    return {
      url,
      key,
      expiresAt: Date.now() + 900 * 1000,
    };
  } catch (error) {
    console.error('R2 presigned URL 生成失败:', error);
    throw new Error(`R2 presign failed: ${(error as Error).message}`);
  }
};

export const getR2PublicUrl = (key: string): string => buildR2PublicImageUrl(key);

export default r2Client;

