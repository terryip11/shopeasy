'use client';

import { useState } from 'react';
import { uploadImageViaApi } from '@/lib/storage/compress-image-client';

interface ImageUploaderProps {
  onUpload: (url: string) => void;
  multiple?: boolean;
  isUploading?: boolean;
  onUploadingChange?: (uploading: boolean) => void;
}

export function ImageUploader({
  onUpload,
  multiple = false,
  isUploading: externalUploading,
  onUploadingChange,
}: ImageUploaderProps) {
  const [internalUploading, setInternalUploading] = useState(false);
  const [images, setImages] = useState<string[]>([]);
  const [error, setError] = useState('');

  const uploading = externalUploading ?? internalUploading;

  const setUploading = (value: boolean) => {
    setInternalUploading(value);
    onUploadingChange?.(value);
  };

  const handleUpload = async (file: File) => {
    setUploading(true);
    setError('');
    try {
      const publicUrl = await uploadImageViaApi(file, { maxEdge: 1600, quality: 0.82 });
      setImages((prev) => (multiple ? [...prev, publicUrl] : [publicUrl]));
      onUpload(publicUrl);
    } catch (err) {
      console.error('上傳失敗:', err);
      setError((err as Error).message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <input
        type="file"
        accept="image/*"
        multiple={multiple}
        onChange={(e) => {
          const files = Array.from(e.target.files || []);
          files.forEach(handleUpload);
        }}
        disabled={uploading}
        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100"
      />
      {uploading && <p className="text-sm text-gray-500">壓縮並上傳中...</p>}
      {error && <p className="text-sm text-red-500">{error}</p>}
      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {images.map((url, i) => (
            <img key={i} src={url} alt="uploaded" className="w-24 h-24 object-cover rounded" />
          ))}
        </div>
      )}
    </div>
  );
}
