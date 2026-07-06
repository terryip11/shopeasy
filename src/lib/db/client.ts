/**
 * src/lib/db/client.ts
 * Supabase 数据库客户端统一导出
 * 
 * 注意：根据使用场景选择正确的 client
 * - Browser Components: import { createClient } from '@/lib/supabase/client'
 * - Server Components / API Routes: import { createClient } from '@/lib/supabase/server'
 * - Admin 操作 (绕过 RLS): import { createAdminClient } from '@/lib/supabase/admin'
 */

export { createClient as createBrowserClient } from '@/lib/supabase/client';
export { createClient as createServerClient } from '@/lib/supabase/server';
export { createAdminClient } from '@/lib/supabase/admin';

// 保持向后兼容的旧导出（不推荐在新代码中使用）
import { createClient } from '@/lib/supabase/client';
export const supabase = createClient();

export type DbResult<T> = T extends Promise<infer U> ? U : never;

