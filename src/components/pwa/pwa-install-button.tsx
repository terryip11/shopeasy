'use client';

import { useCallback, useEffect, useState } from 'react';
import { Download } from 'lucide-react';
import { isIosDevice, isStandalonePwa } from '@/lib/push/client';
import {
  consumeDeferredInstallPrompt,
  detectInstalledPwa,
  getDeferredInstallPrompt,
  initPwaInstallCapture,
  isPwaMarkedInstalled,
  subscribePwaInstallState,
} from '@/lib/pwa/install';

/**
 * 導覽列：優先一鍵觸發瀏覽器安裝；僅 iOS／無法一鍵時才顯示說明
 */
export function PwaInstallButton() {
  const [canShow, setCanShow] = useState(false);
  const [canPrompt, setCanPrompt] = useState(false);
  const [ios, setIos] = useState(false);
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  useEffect(() => {
    initPwaInstallCapture();

    if (isStandalonePwa() || isPwaMarkedInstalled()) {
      setCanShow(false);
      return;
    }

    setIos(isIosDevice());
    setCanPrompt(getDeferredInstallPrompt() != null);
    setCanShow(true);

    const unsub = subscribePwaInstallState(() => {
      if (isPwaMarkedInstalled() || isStandalonePwa()) {
        setCanShow(false);
        return;
      }
      setCanPrompt(getDeferredInstallPrompt() != null);
    });

    void detectInstalledPwa().then((installed) => {
      if (installed || isStandalonePwa()) setCanShow(false);
    });

    return unsub;
  }, []);

  const handleClick = useCallback(async () => {
    setHint(null);

    const promptEvent = getDeferredInstallPrompt();
    if (promptEvent) {
      setBusy(true);
      try {
        await promptEvent.prompt();
        const { outcome } = await promptEvent.userChoice;
        consumeDeferredInstallPrompt();
        if (outcome === 'accepted') {
          setCanShow(false);
        } else {
          setCanPrompt(false);
        }
      } catch {
        setHint('無法開啟安裝視窗，請改用網址列的安裝按鈕');
      } finally {
        setBusy(false);
      }
      return;
    }

    // 2) iOS：系統不允許網頁直接安裝，只能說明
    if (ios) {
      setHint('iPhone 請點底部分享 →「加入主畫面」');
      window.setTimeout(() => setHint(null), 4000);
      return;
    }

    // 3) 瀏覽器尚未允許一鍵（本機 / 已安裝 / 條件未滿足）
    setHint('請點網址列的「安裝」或「在應用程式中開啟」');
    window.setTimeout(() => setHint(null), 4000);
  }, [ios]);

  if (!canShow) return null;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => void handleClick()}
        disabled={busy}
        className="icon-interactive text-gray-600 dark:text-gray-300"
        title={canPrompt ? '安裝到主畫面' : '安裝到主畫面（若無法一鍵請用網址列）'}
        aria-label="安裝到主畫面"
      >
        <Download className={`h-5 w-5 ${busy ? 'animate-pulse' : ''}`} />
      </button>
      {hint && (
        <div
          role="status"
          className="absolute right-0 top-full z-50 mt-2 w-56 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 shadow-lg dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
        >
          {hint}
        </div>
      )}
    </div>
  );
}
