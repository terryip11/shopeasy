import 'server-only';

/**
 * src/lib/supabase/admin.ts
 * Admin Client - 用于服务端管理操作
 * 使用 Secret key (service_role key) — 仅限服务端，绝不能暴露给客户端！
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database';

export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
