/**
 * src/lib/supabase/server.ts
 * Server Client - 用于 Server Components / API Routes
 * 使用 Publishable key (anon key) + Cookie 管理 session
 */

import { cache } from 'react';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@/types/database';

/** 同一 request 內共用同一個 server client，避免重複讀 cookies */
export const createClient = cache(async () => {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // 在 Server Component 中如果无法设置 cookie 可以忽略
          }
        },
      },
    }
  );
});
