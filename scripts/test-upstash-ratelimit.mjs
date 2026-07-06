import { readFileSync } from 'fs';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

for (const rawLine of readFileSync('.env.local', 'utf8').split('\n')) {
  const line = rawLine.replace(/\r$/, '');
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m) {
    process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
  }
}

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
});

const rl = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '60 s'),
  prefix: 'shopeasy:rl',
});

const key = `diagnostic-${Date.now()}`;
const r1 = await rl.limit(key);
const r2 = await rl.limit(key);
console.log('rate limit test:', { success1: r1.success, success2: r2.success, remaining: r2.remaining });

const keys = await redis.keys('shopeasy:rl*');
console.log('keys matching shopeasy:rl*:', keys.length > 0 ? keys.slice(0, 5) : '(none)');
