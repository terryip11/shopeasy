import { afterEach, describe, expect, it } from 'vitest';
import {
  getSuggestedMobileOrigins,
  normalizeOrigin,
  resolveRedirectOrigin,
} from './app-origin';
import { sanitizeDevOrigin } from './sanitize-dev-origin';

describe('sanitizeDevOrigin', () => {
  it('maps 0.0.0.0 to localhost', () => {
    expect(sanitizeDevOrigin('http://0.0.0.0:3000')).toBe('http://localhost:3000');
  });
});

describe('normalizeOrigin', () => {
  it('returns origin without trailing slash', () => {
    expect(normalizeOrigin('http://192.168.0.103:3000/')).toBe('http://192.168.0.103:3000');
  });

  it('rejects invalid protocol', () => {
    expect(normalizeOrigin('ftp://example.com')).toBeNull();
  });
});

describe('resolveRedirectOrigin', () => {
  const original = process.env.NEXT_PUBLIC_APP_URL;

  afterEach(() => {
    process.env.NEXT_PUBLIC_APP_URL = original;
  });

  it('uses configured app url by default', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'http://192.168.0.103:3000';
    expect(resolveRedirectOrigin()).toBe('http://192.168.0.103:3000');
  });

  it('allows lan override in development', () => {
    process.env.NEXT_PUBLIC_APP_URL = 'http://localhost:3000';
    expect(resolveRedirectOrigin('http://192.168.0.103:3000')).toBe('http://192.168.0.103:3000');
  });
});

describe('getSuggestedMobileOrigins', () => {
  it('returns string array', () => {
    const origins = getSuggestedMobileOrigins(3000);
    expect(Array.isArray(origins)).toBe(true);
  });
});
