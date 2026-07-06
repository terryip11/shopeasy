import { describe, expect, it, vi, afterEach } from 'vitest';

vi.mock('@/lib/supabase/client', () => ({
  createClient: () => ({
    auth: {
      setSession: vi.fn(),
      exchangeCodeForSession: vi.fn(),
      getSession: vi.fn(),
    },
  }),
}));

describe('completeAuthFromCurrentUrl prerequisites', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('parses hash tokens from window location', () => {
    vi.stubGlobal('window', {
      location: {
        href: 'http://192.168.0.103:3000/auth/callback?next=%2Fadmin#access_token=abc&refresh_token=def',
        hash: '#access_token=abc&refresh_token=def',
        pathname: '/auth/callback',
        search: '?next=%2Fadmin',
      },
      history: { replaceState: vi.fn() },
      setTimeout: (fn: () => void) => {
        fn();
        return 0;
      },
    });

    const hash = window.location.hash.replace(/^#/, '');
    const params = new URLSearchParams(hash);
    expect(params.get('access_token')).toBe('abc');
    expect(params.get('refresh_token')).toBe('def');
  });
});
