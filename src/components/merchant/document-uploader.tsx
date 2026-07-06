'use client';

import { useState } from 'react';
import { Upload, CheckCircle2 } from 'lucide-react';

interface DocumentUploaderProps {
  label: string;
  value?: string;
  onUpload: (url: string) => void;
  required?: boolean;
}

export function DocumentUploader({ label, value, onUpload, required }: DocumentUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('請上傳圖片檔案（JPG、PNG 等）');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('檔案大小不可超過 10MB');
      return;
    }

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
        throw new Error(data.error || `上傳失敗（${res.status}）`);
      }

      if (!data.publicUrl) {
        throw new Error('上傳成功但未取得檔案網址');
      }

      onUpload(data.publicUrl);
    } catch (err) {
      const message = (err as Error).message;
      setError(message === 'Failed to fetch' ? '無法連線至伺服器，請確認已登入並重試' : message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <div
        className={`relative rounded-xl border-2 border-dashed p-4 transition-colors ${
          value
            ? 'border-green-300 bg-green-50/50 dark:border-green-800 dark:bg-green-900/10'
            : 'border-gray-200 hover:border-orange-300 dark:border-gray-700 dark:hover:border-orange-700'
        }`}
      >
        <input
          type="file"
          accept="image/*"
          disabled={uploading}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleUpload(file);
          }}
          className="absolute inset-0 cursor-pointer opacity-0 disabled:cursor-not-allowed"
        />
        <div className="flex items-center gap-3 pointer-events-none">
          {value ? (
            <CheckCircle2 className="h-8 w-8 text-green-500 shrink-0" />
          ) : (
            <Upload className="h-8 w-8 text-gray-400 shrink-0" />
          )}
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {uploading ? '上傳中...' : value ? '已上傳，點擊可更換' : '點擊或拖放圖片至此'}
            </p>
            <p className="text-xs text-gray-500">支援 JPG、PNG，最大 10MB</p>
          </div>
        </div>
        {value && (
          <a
            href={value}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-block text-xs text-orange-600 hover:underline pointer-events-auto"
            onClick={(e) => e.stopPropagation()}
          >
            預覽已上傳檔案
          </a>
        )}
      </div>
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
