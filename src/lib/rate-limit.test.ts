import { describe, it, expect } from 'vitest';
import { rateLimit } from '@/lib/rate-limit';

describe('rateLimit', () => {
  it('allows requests under the limit', async () => {
    const key = `test-allow-${Date.now()}-${Math.random()}`;
    expect((await rateLimit(key, 3, 60_000)).ok).toBe(true);
    expect((await rateLimit(key, 3, 60_000)).ok).toBe(true);
    expect((await rateLimit(key, 3, 60_000)).ok).toBe(true);
  });

  it('blocks requests over the limit', async () => {
    const key = `test-block-${Date.now()}-${Math.random()}`;
    await rateLimit(key, 2, 60_000);
    await rateLimit(key, 2, 60_000);
    const blocked = await rateLimit(key, 2, 60_000);
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) {
      expect(blocked.retryAfterSec).toBeGreaterThan(0);
    }
  });
});
