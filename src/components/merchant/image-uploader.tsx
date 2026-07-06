'use client';

import { useState } from 'react';

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
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/upload/image', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.error || '上傳失敗');
      }

      if (!data.publicUrl) {
        throw new Error('未取得檔案網址');
      }

      setImages((prev) => (multiple ? [...prev, data.publicUrl] : [data.publicUrl]));
      onUpload(data.publicUrl);
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
      {uploading && <p className="text-sm text-gray-500">上傳中...</p>}
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
