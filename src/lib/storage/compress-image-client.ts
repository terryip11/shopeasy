/**
 * 瀏覽器端壓縮圖片後再上傳，減少 R2 體積與列表 LCP。
 * GIF／SVG 不處理；失敗時回傳原檔。
 */

export type CompressImageOptions = {
  /** 最長邊像素，預設 1600 */
  maxEdge?: number;
  /** JPEG 品質 0–1，預設 0.82 */
  quality?: number;
  /** 小於這個大小且無需縮小則跳過（預設 400KB） */
  skipBelowBytes?: number;
};

export async function compressImageFile(
  file: File,
  options: CompressImageOptions = {}
): Promise<File> {
  const {
    maxEdge = 1600,
    quality = 0.82,
    skipBelowBytes = 400 * 1024,
  } = options;

  if (!file.type.startsWith('image/')) return file;
  if (file.type === 'image/svg+xml' || file.type === 'image/gif') return file;

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));

    if (scale === 1 && file.size <= skipBelowBytes) {
      bitmap.close();
      return file;
    }

    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      bitmap.close();
      return file;
    }

    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', quality);
    });

    if (!blob || blob.size >= file.size) {
      return file;
    }

    const baseName = file.name.replace(/\.[^.]+$/, '') || 'image';
    return new File([blob], `${baseName}.jpg`, {
      type: 'image/jpeg',
      lastModified: Date.now(),
    });
  } catch {
    return file;
  }
}

export type UploadImageApiOptions = CompressImageOptions & {
  /** false = 不壓縮（少見） */
  compress?: boolean;
};

/** 壓縮後 POST /api/upload/image，回傳 publicUrl */
export async function uploadImageViaApi(
  file: File,
  options: UploadImageApiOptions = {}
): Promise<string> {
  const { compress = true, ...compressOpts } = options;
  const prepared = compress ? await compressImageFile(file, compressOpts) : file;

  const formData = new FormData();
  formData.append('file', prepared);

  const res = await fetch('/api/upload/image', {
    method: 'POST',
    body: formData,
  });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || `上傳失敗（${res.status}）`);
  }
  if (!data.publicUrl) {
    throw new Error('上傳成功但未取得檔案網址');
  }

  return data.publicUrl as string;
}
