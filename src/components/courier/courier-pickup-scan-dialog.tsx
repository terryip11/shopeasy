'use client';

import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { normalizePickupCode, parsePickupQrPayload } from '@/lib/delivery/pickup-code';
import { Camera, X } from 'lucide-react';

type Props = {
  jobId: string;
  pickupAddress?: string | null;
  pickupContactName?: string | null;
  pickupContactPhone?: string | null;
  open: boolean;
  loading?: boolean;
  onClose: () => void;
  onConfirm: (pickupCode: string) => void;
};

type BarcodeDetectorLike = {
  detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue?: string }>>;
};

export function CourierPickupScanDialog({
  jobId,
  pickupAddress,
  pickupContactName,
  pickupContactPhone,
  open,
  loading,
  onClose,
  onConfirm,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [manualCode, setManualCode] = useState('');
  const [scanError, setScanError] = useState('');
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraSupported, setCameraSupported] = useState(true);
  const handledRef = useRef(false);

  useEffect(() => {
    if (!open) {
      stopCamera();
      setManualCode('');
      setScanError('');
      setCameraReady(false);
      handledRef.current = false;
      return;
    }

    let cancelled = false;
    let raf = 0;

    const start = async () => {
      handledRef.current = false;
      const Detector = (
        window as unknown as {
          BarcodeDetector?: new (opts?: { formats?: string[] }) => BarcodeDetectorLike;
        }
      ).BarcodeDetector;
      if (!Detector || !navigator.mediaDevices?.getUserMedia) {
        setCameraSupported(false);
        return;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await video.play();
          setCameraReady(true);
        }

        const detector = new Detector({ formats: ['qr_code'] });

        const tick = async () => {
          if (cancelled || handledRef.current) return;
          const el = videoRef.current;
          if (el && el.readyState >= 2) {
            try {
              const codes = await detector.detect(el);
              const raw = codes[0]?.rawValue;
              if (raw) {
                const parsed = parsePickupQrPayload(raw);
                const code = normalizePickupCode(parsed?.code || raw);
                if (parsed?.jobId && parsed.jobId !== jobId) {
                  setScanError('此 QR 碼不屬於此配送任務');
                } else if (code) {
                  handledRef.current = true;
                  onConfirm(code);
                  return;
                }
              }
            } catch {
              // ignore frame errors
            }
          }
          raf = requestAnimationFrame(() => {
            void tick();
          });
        };

        raf = requestAnimationFrame(() => {
          void tick();
        });
      } catch {
        setCameraSupported(false);
        setScanError('無法開啟相機，請改為手動輸入確認碼');
      }
    };

    void start();

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, jobId]);

  function stopCamera() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }

  if (!open) return null;

  const submitManual = () => {
    const code = normalizePickupCode(manualCode);
    if (!code) {
      setScanError('請輸入取件確認碼');
      return;
    }
    onConfirm(code);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="pickup-scan-title"
        className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl dark:bg-gray-900"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="pickup-scan-title" className="text-lg font-semibold text-gray-900 dark:text-white">
              掃描取件 QR
            </h2>
            <p className="mt-1 text-sm text-gray-500">請掃描商家出示的貨件 QR 以確認取件</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800"
            aria-label="關閉"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {pickupAddress && (
          <div className="mt-4 rounded-xl bg-orange-50 px-3 py-2 text-sm text-orange-900 dark:bg-orange-950/40 dark:text-orange-200">
            <p>取件地址：{pickupAddress}</p>
            {(pickupContactName || pickupContactPhone) && (
              <p className="mt-1 text-xs opacity-90">
                聯絡
                {pickupContactName ? ` ${pickupContactName}` : ''}
                {pickupContactPhone ? ` · ${pickupContactPhone}` : ''}
              </p>
            )}
          </div>
        )}

        <div className="mt-4 overflow-hidden rounded-xl bg-black">
          {cameraSupported ? (
            <video
              ref={videoRef}
              className="aspect-[4/3] w-full object-cover"
              playsInline
              muted
            />
          ) : (
            <div className="flex aspect-[4/3] flex-col items-center justify-center gap-2 bg-gray-900 text-sm text-gray-300">
              <Camera className="h-8 w-8 opacity-60" />
              <p>此裝置不支援相機掃碼</p>
              <p className="text-xs text-gray-500">請改用下方手動輸入</p>
            </div>
          )}
        </div>
        {cameraReady && cameraSupported && (
          <p className="mt-2 text-center text-xs text-gray-500">將 QR 對準畫面中央</p>
        )}

        {scanError && <p className="mt-3 text-sm text-red-600">{scanError}</p>}

        <div className="mt-4 space-y-2">
          <Label htmlFor="pickup-code-manual">或手動輸入確認碼</Label>
          <Input
            id="pickup-code-manual"
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value.toUpperCase())}
            placeholder="例如 AB12CD34"
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
          />
        </div>

        <div className="mt-5 flex gap-2">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose} disabled={loading}>
            取消
          </Button>
          <Button type="button" className="flex-1" onClick={submitManual} disabled={loading}>
            {loading ? '確認中…' : '確認取件'}
          </Button>
        </div>
      </div>
    </div>
  );
}
