## 视频首帧缩略图生成（FFmpeg）
- 依赖与环境：引入 `fluent-ffmpeg` 与 `ffmpeg-static`；后端在 Node Server（Express）中调用；自动探测是否存在可执行文件，不可用时降级为占位缩略图。
- 生成流程：在 `api/services/fileService.ts` 的 `generateThumbnail` 中对 `video` 分支：
  - 使用 ffmpeg 提取首帧到内存 Buffer（`-ss 00:00:00.2 -frames:v 1`），输出为 `jpg`。
  - 对首帧进行等比缩放到宽 800（sharp 或 ffmpeg 的 `-vf scale`），上传至 Supabase Storage `thumbnails/`。
  - 失败回退：记录日志并使用当前的默认缩略图逻辑确保上传成功。
- 视频元信息：在上传视频时同时提取 `duration` 与 `resolution`（ffprobe 或 ffmpeg），并落库。
- 数据库：为 `public.files` 增加列 `duration int`、`resolution text`，并补充索引（可选按 `file_type` + `created_at` 的联合索引）。

## 参考图结构对齐
- 一致性目标：统一使用数据库字段命名 `image_url`、`preview_url`。
- 类型对齐：修改 `shared/types.ts` 的 `ReferenceImage` 为 `{ id, file_id, image_url, preview_url, order_index, created_at }`。
- API与前端：
  - `GET /api/files/:id` 返回 `reference_images[]` 使用上述字段；前端详情侧栏使用 `image_url` 展示，`preview_url` 用作 hover 预览。
  - 管理上传参考图的能力：后续在管理员上传表单支持参考图列表（图片地址或文件上传），后台保存至 `reference_images` 表并与 `file_id` 关联。
- 迁移与数据：若已有历史数据，提供一次性脚本将旧字段 `image_path/thumbnail_path` 重命名为 `image_url/preview_url`（当前环境使用新字段即可）。

## Google 登录实装
- 前端集成：接入 Google Identity Services（GIS）One Tap 或按钮登录：
  - 在登录模态里加载 GIS 脚本，`google.accounts.id.initialize({ client_id: GOOGLE_CLIENT_ID })`；
  - 获取 `id_token` 后调用后端 `POST /api/auth/google`；后端用 `google-auth-library` 验证、创建/更新用户、签发 24h token。
- 配置：在本地 `.env` 与 Vercel 项目环境变量设置 `GOOGLE_CLIENT_ID`。
- 状态管理：沿用 `useAuthStore`，成功后持久化 `auth_token` 并刷新用户态。
- 安全：后端仅信任 HTTPS 来源；校验 `audience` 与 `iss`；添加基础风控（失败重试与错误日志）。

## 限流策略
- 实施：引入 `express-rate-limit`，对所有 `/api` 端点启用基础限流：`100 req/min/IP`；对下载端点 `GET /api/files/:id/download` 设置 `60 req/min/IP`。
- 管理端：管理员路由使用单独限流器（例如 `60 req/min`）；设置 `trust proxy` 与合适的 `keyGenerator`（优先 IP + 账户维度）。
- 监控与日志：在限流触发时统一返回标准 JSON 错误；将限流事件计数到日志以便分析。

## 缓存策略
- 列表与详情：
  - 在响应头添加 `Cache-Control: public, max-age=60, stale-while-revalidate=300`。
  - 可选：基于查询参数构建 ETag（如 page、limit、filters），命中返回 304。
- 下载与签名 URL：保持 `no-store`；缩略图与公开 URL 由 Supabase/CDN 处理缓存。
- Vercel 配置：若走 Serverless，充分利用 `s-maxage` 与 SWR；静态资源已由 Vite 构建管理。

## E2E 测试覆盖
- 框架：Playwright。
- 场景：
  - 瀑布流列表：加载与懒加载、缩略图展示、视频项 hover 标识。
  - 详情弹窗：原图/视频展示、下载按钮行为。
  - 登录流程：Google 登录按钮触发模拟、后端验证、用户态持久化。
  - 管理操作：上传文件（含视频缩略图生成回落）、发布状态切换、管理员统计与模型列表请求。
  - 限流与缓存：在测试环境下校验限流响应与关键列表端点的缓存头。
- 运行：在 CI（Vercel 或 GitHub Actions）中配置 headless 执行并生成报告。

## 交付与回滚
- 变更点最小化：首帧提取失败时不影响上传成功；参考图字段一致后前端统一读取；登录回退（无 GIS 时隐藏 Google 登录）。
- 环境变量与密钥：严格不在前端暴露 Service Key；仅填入 `GOOGLE_CLIENT_ID` 至前端与后端校验参数。
- 文档：补充 README（环境配置、限流与缓存说明、测试运行方式）。

请确认以上方案，我将按步骤在代码中落地实现、添加迁移、接入依赖并补全测试。