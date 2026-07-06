'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { QRCodeSVG } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RefreshCw, Smartphone, Monitor } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

const REFRESH_MS = 4 * 60 * 1000;
const POLL_MS = 2000;

export function QrLoginForm() {
  const [email, setEmail] = useState('');
  const [loginUrl, setLoginUrl] = useState<string | null>(null);
  const [pollId, setPollId] = useState<string | null>(null);
  const [awaitingScan, setAwaitingScan] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [generatedAt, setGeneratedAt] = useState<number | null>(null);
  const desktopSyncedRef = useRef(false);

  const syncDesktopLogin = useCallback(async (activePollId: string) => {
    if (desktopSyncedRef.current) return;
    setSyncMessage('手機已確認，正在同步電腦登入...');

    const res = await fetch('/api/auth/qr-login/desktop-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pollId: activePollId }),
    });
    const data = await res.json();

    if (!res.ok) {
      setError(data.error || '電腦端登入失敗');
      setSyncMessage(null);
      return;
    }

    const supabase = createClient();
    const { error: sessionError } = await supabase.auth.setSession({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
    });

    if (sessionError) {
      setError(sessionError.message);
      setSyncMessage(null);
      return;
    }

    desktopSyncedRef.current = true;
    window.location.assign(data.redirectTo || '/');
  }, []);

  const generateQr = useCallback(async (targetEmail?: string) => {
    const value = (targetEmail ?? email).trim();
    if (!value) {
      setError('請輸入電子郵件');
      return;
    }

    setLoading(true);
    setError('');
    setSyncMessage(null);
    desktopSyncedRef.current = false;

    const res = await fetch('/api/auth/qr-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: value }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setLoginUrl(null);
      setPollId(null);
      setAwaitingScan(false);
      setGeneratedAt(null);
      setError(data.error || '產生登入碼失敗');
      return;
    }

    setLoginUrl(data.loginUrl);
    setPollId(data.pollId ?? null);
    setAwaitingScan(true);
    setGeneratedAt(Date.now());
  }, [email]);

  useEffect(() => {
    if (!pollId || !awaitingScan || desktopSyncedRef.current) return;

    const pollDesktop = async () => {
      const res = await fetch(`/api/auth/qr-login/poll?pollId=${encodeURIComponent(pollId)}`);
      const data = await res.json();
      if (!res.ok) return;

      if (data.status === 'confirmed') {
        await syncDesktopLogin(pollId);
      } else if (data.status === 'expired' || data.status === 'consumed') {
        setAwaitingScan(false);
        setError('登入碼已過期，請重新產生');
      }
    };

    void pollDesktop();
    const interval = window.setInterval(() => {
      void pollDesktop();
    }, POLL_MS);

    return () => window.clearInterval(interval);
  }, [pollId, awaitingScan, syncDesktopLogin]);

  useEffect(() => {
    if (!loginUrl || !generatedAt || awaitingScan) return;

    const elapsed = Date.now() - generatedAt;
    const delay = Math.max(REFRESH_MS - elapsed, 0);

    const timer = window.setTimeout(() => {
      void generateQr();
    }, delay);

    return () => window.clearTimeout(timer);
  }, [loginUrl, generatedAt, awaitingScan, generateQr]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-950 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-sm dark:bg-gray-900">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">管理員掃碼登入</h1>
        <p className="mt-2 text-sm text-gray-500">
          輸入管理員信箱後，用手機掃描二維碼；手機與電腦將同步登入管理後台。
        </p>

        <div className="mt-6 space-y-4">
          <div>
            <Label htmlFor="qr-email">電子郵件</Label>
            <Input
              id="qr-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="mt-1"
              autoComplete="email"
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}
          {syncMessage && (
            <p className="flex items-center gap-1.5 text-sm text-orange-600">
              <Monitor className="h-4 w-4" />
              {syncMessage}
            </p>
          )}

          <Button
            type="button"
            className="w-full"
            disabled={loading}
            onClick={() => void generateQr()}
          >
            {loading ? '產生中...' : loginUrl ? '重新產生二維碼' : '產生登入二維碼'}
          </Button>
        </div>

        {loginUrl && (
          <div className="mt-8 flex flex-col items-center rounded-xl border border-orange-100 bg-orange-50/50 p-6 dark:border-orange-900/40 dark:bg-orange-900/10">
            <div className="rounded-lg bg-white p-3 shadow-sm dark:bg-white">
              <QRCodeSVG value={loginUrl} size={200} level="M" includeMargin />
            </div>
            <p className="mt-4 flex items-center gap-1.5 text-sm font-medium text-gray-700 dark:text-gray-300">
              <Smartphone className="h-4 w-4" />
              用手機相機或微信掃描
            </p>
            <p className="mt-1 text-xs text-gray-500 text-center">
              {awaitingScan
                ? '等待手機掃描確認，確認後此電腦將自動登入'
                : '登入碼約 5 分鐘有效，逾時會自動重新產生'}
            </p>
            <button
              type="button"
              onClick={() => void generateQr()}
              disabled={loading}
              className="mt-4 inline-flex items-center gap-1 text-xs text-gray-500 hover:text-orange-600"
            >
              <RefreshCw className="h-3 w-3" />
              手動刷新
            </button>
          </div>
        )}

        <p className="mt-6 text-center text-sm text-gray-500">
          <Link href="/login" className="text-orange-500 hover:underline">
            返回密碼登入
          </Link>
        </p>
      </div>
    </div>
  );
}
