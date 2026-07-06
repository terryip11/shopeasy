/**
 * 全局限流：生產環境用 Upstash Redis（多實例共享），本機無 Redis 時 fallback 記憶體 Map。
 */

import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

export type RateLimitResult = { ok: true } | { ok: false; retryAfterSec: number };

const memoryHits = new Map<string, { count: number; resetAt: number }>();
const ratelimitCache = new Map<string, Ratelimit>();

let redisClient: Redis | null | undefined;

function getRedisClient(): Redis | null {
  if (redisClient !== undefined) return redisClient;

  const url = process.env.UPSTASH_REDIS_REST_URL?.trim();
  const token = process.env.UPSTASH_REDIS_REST_TOKEN?.trim();
  if (!url || !token) {
    redisClient = null;
    return null;
  }

  redisClient = new Redis({ url, token });
  return redisClient;
}

/** 是否已設定 Upstash（Vercel 生產建議開啟） */
export function isRedisRateLimitEnabled(): boolean {
  return getRedisClient() !== null;
}

function memoryRateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  const entry = memoryHits.get(key);

  if (!entry || now > entry.resetAt) {
    memoryHits.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }

  if (entry.count >= limit) {
    return { ok: false, retryAfterSec: Math.max(1, Math.ceil((entry.resetAt - now) / 1000)) };
  }

  entry.count += 1;
  return { ok: true };
}

function getUpstashRatelimit(limit: number, windowMs: number): Ratelimit {
  const windowSec = Math.max(1, Math.ceil(windowMs / 1000));
  const cacheKey = `${limit}:${windowSec}`;
  const cached = ratelimitCache.get(cacheKey);
  if (cached) return cached;

  const rl = new Ratelimit({
    redis: getRedisClient()!,
    limiter: Ratelimit.slidingWindow(limit, `${windowSec} s`),
    prefix: 'shopeasy:rl',
  });
  ratelimitCache.set(cacheKey, rl);
  return rl;
}

async function upstashRateLimit(
  key: string,
  limit: number,
  windowMs: number
): Promise<RateLimitResult> {
  const rl = getUpstashRatelimit(limit, windowMs);
  const result = await rl.limit(key);

  if (result.success) {
    return { ok: true };
  }

  const retryAfterSec = Math.max(1, Math.ceil((result.reset - Date.now()) / 1000));
  return { ok: false, retryAfterSec };
}

/**
 * 檢查並遞增限流計數。
 * 未設定 UPSTASH_REDIS_* 時使用程序內記憶體（僅適合本機／單實例）。
 */
export async function rateLimit(
  key: string,
  limit = 30,
  windowMs = 60_000
): Promise<RateLimitResult> {
  const redis = getRedisClient();
  if (redis) {
    try {
      return await upstashRateLimit(key, limit, windowMs);
    } catch (err) {
      console.error('[rate-limit] Upstash 失敗，fallback 記憶體:', err);
      return memoryRateLimit(key, limit, windowMs);
    }
  }
  return memoryRateLimit(key, limit, windowMs);
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]?.trim() || 'unknown';
  return request.headers.get('x-real-ip') || 'unknown';
}
