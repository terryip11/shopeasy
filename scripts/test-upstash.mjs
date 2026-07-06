import { readFileSync } from 'fs';
import { Redis } from '@upstash/redis';

for (const rawLine of readFileSync('.env.local', 'utf8').split('\n')) {
  const line = rawLine.replace(/\r$/, '');
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m) {
    const key = m[1].trim();
    const val = m[2].trim().replace(/^["']|["']$/g, '');
    process.env[key] = val;
  }
}

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

if (!url || !token) {
  console.log('FAIL: UPSTASH env 未讀取');
  process.exit(1);
}

const redis = new Redis({ url, token });
const pong = await redis.ping();
console.log('OK: Upstash ping =>', pong);
