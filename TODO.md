# lib/ 文件实现进度

## 已完成
- [ ] TODO.md 创建

## 待完成 (按计划顺序)
1. 更新 package.json 添加 deps (@supabase/supabase-js, @aws-sdk/client-s3 等)
2. 创建 .env.example
3. 创建 src/lib/storage/types.ts
4. 创建 src/lib/storage/r2.ts (R2 客户端)
5. 创建 src/lib/storage/s3.ts (S3 客户端)
6. 创建 src/lib/storage/presigned.ts (预签名生成)
7. 创建 src/lib/storage/index.ts (导出)
8. npm install
9. 测试：创建简单 API route 使用 storage
10. 后续：db/client.ts, upload.service.ts 等

**进度：2/10**

## 已完成
- [x] TODO.md 创建
- [x] src/lib/storage/types.ts
- [x] src/lib/storage/r2.ts

## 已完成
- [x] src/lib/storage/config.ts
- [x] src/lib/storage/s3.ts

## Next: presigned.ts

**进度：6/10**

## 已完成
- [x] src/lib/storage/presigned.ts
- [x] src/lib/storage/index.ts

## 已完成
- [x] .env.example

## 待安装
1. 更新 package.json + `npm install`

## Next: 测试 API + Supabase db/client.ts

**进度：7/10**
