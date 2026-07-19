/**
 * 盡早攔截 beforeinstallprompt，供導覽列一鍵安裝使用
 */

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

type Listener = () => void;

let deferredPrompt: BeforeInstallPromptEvent | null = null;
let installed = false;
const listeners = new Set<Listener>();

function notify() {
  listeners.forEach((fn) => fn());
}

export function getDeferredInstallPrompt(): BeforeInstallPromptEvent | null {
  return deferredPrompt;
}

export function isPwaInstallCaptured(): boolean {
  return deferredPrompt != null;
}

export function isPwaMarkedInstalled(): boolean {
  return installed;
}

export function subscribePwaInstallState(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function consumeDeferredInstallPrompt(): BeforeInstallPromptEvent | null {
  const prompt = deferredPrompt;
  deferredPrompt = null;
  notify();
  return prompt;
}

/** 在瀏覽器端盡早註冊（client layout / navbar） */
export function initPwaInstallCapture(): void {
  if (typeof window === 'undefined') return;
  if ((window as Window & { __shopeasyPwaInstallInit?: boolean }).__shopeasyPwaInstallInit) {
    return;
  }
  (window as Window & { __shopeasyPwaInstallInit?: boolean }).__shopeasyPwaInstallInit = true;

  try {
    if (localStorage.getItem('shopeasy_pwa_installed') === '1') {
      installed = true;
    }
  } catch {
    /* ignore */
  }

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    installed = false;
    try {
      localStorage.removeItem('shopeasy_pwa_installed');
    } catch {
      /* ignore */
    }
    notify();
  });

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    installed = true;
    try {
      localStorage.setItem('shopeasy_pwa_installed', '1');
    } catch {
      /* ignore */
    }
    notify();
  });
}

/** 偵測是否已安裝（瀏覽器內開網頁時） */
export async function detectInstalledPwa(): Promise<boolean> {
  if (typeof window === 'undefined') return false;
  if (installed) return true;

  const nav = navigator as Navigator & {
    getInstalledRelatedApps?: () => Promise<Array<{ platform: string; url?: string }>>;
  };
  if (typeof nav.getInstalledRelatedApps === 'function') {
    try {
      const apps = await nav.getInstalledRelatedApps();
      if (apps.length > 0) {
        installed = true;
        try {
          localStorage.setItem('shopeasy_pwa_installed', '1');
        } catch {
          /* ignore */
        }
        notify();
        return true;
      }
    } catch {
      /* ignore */
    }
  }

  return false;
}
