# Supabase 升级 TODO

## 目标
将项目从旧的 `@supabase/auth-helpers-nextjs` 迁移到最新的 `@supabase/ssr`，并正确区分 Publishable key 和 Secret key 的使用场景。

## 步骤

- [x] 1. 安装 `@supabase/ssr` 依赖
- [x] 2. 创建 `src/lib/supabase/` 目录，存放新版客户端代码
  - [x] `client.ts` - Browser client (Publishable key)
  - [x] `server.ts` - Server client (Publishable key + cookie)
  - [x] `admin.ts` - Admin client (Secret key / service_role)
- [x] 3. 更新 `src/lib/db/client.ts` - 导出新的客户端
- [x] 4. 更新 `src/lib/auth/client.ts` - 使用 `createBrowserClient`
- [x] 5. 更新 `src/lib/admin/crud.ts` - 使用 admin client (Secret key)
- [x] 6. 创建 `.env.example` - 说明新的环境变量
- [x] 7. 更新 `package.json` - 移除 `@supabase/auth-helpers-nextjs`
- [x] 8. 测试验证 — build 已开始，无即时报错

