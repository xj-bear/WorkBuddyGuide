# 部署说明

本轮自有服务器交付优先阅读 [静态自托管说明](./SELF_HOSTING.md)。下方保留原项目 Cloudflare 可选方案，**自托管不需要 D1、Worker 或远程数据库迁移**。

---

# Cloudflare Pages 部署

本站采用 VitePress 静态构建，并通过 Cloudflare Pages 的 GitHub 集成持续部署。

## Cloudflare Pages 设置

在 Cloudflare 控制台选择 **Workers & Pages → Create application → Pages → Import an existing Git repository**，授权并选择 `AlephAITech/WorkBuddyGuide`。

使用以下配置：

| 配置项 | 值 |
| --- | --- |
| Project name | `workbuddy-guide` |
| Production branch | `main` |
| Framework preset | `VitePress`（也可选择 None） |
| Build command | `npm run docs:build` |
| Build output directory | `docs/.vitepress/dist` |
| Root directory | `/` |
| Node.js version | `22` |

在 Cloudflare Pages 的生产环境变量中设置：

```text
VITEPRESS_SITE_URL=https://workbuddy.5678.fun
```

访问量接口还需要以下服务端变量或 Secret。它们只存在于 Cloudflare，不能使用
`VITE_` 前缀，也不能提交到 GitHub：

```text
CF_ANALYTICS_TOKEN
CF_ACCOUNT_ID
CF_WEB_ANALYTICS_SITE_TAG
```

仓库默认值同样使用正式域名，避免缺少环境变量时 canonical、Open Graph
和 sitemap 回退到 `pages.dev` 域名。

仓库中的 `.nvmrc` 会声明 Node.js 22。依赖通过 `package-lock.json` 固定，Cloudflare 构建时应使用 `npm ci` 安装。

## 访问量历史数据库

Cloudflare Web Analytics 只作为实时数据源。完整日数据由定时 Worker 写入 D1，
Pages Function `/api/traffic` 返回“D1 历史累计 + 今日实时数据”。

首次配置远程环境时：

1. 创建名为 `workbuddy-traffic` 的 D1 数据库。
2. 将 Cloudflare 返回的数据库 ID 替换到 `wrangler.jsonc` 和
   `wrangler.collector.jsonc`，不要继续使用本地占位 ID。
3. 执行 `wrangler d1 migrations apply TRAFFIC_DB --remote`。
4. 为 Pages 配置上面的三个 Cloudflare Analytics Secret。
5. 为 Pages 和 `workbuddy-traffic-collector` Worker 配置相同的
   `TRAFFIC_SYNC_TOKEN` Secret；定时 Worker 只通过带鉴权的内部接口触发 Pages
   归档，不持有 Analytics Token。
6. 部署定时 Worker。其 Cron 为 `15 18 * * *`，即北京时间每日 02:15。

`TRAFFIC_HISTORY_START=2026-07-10` 是公开的数据起始日期，不是 Secret。
`TRAFFIC_SYNC_TOKEN` 用于保护 Pages 内部同步接口和收集器的手动 `/sync`
接口，应分别使用 Pages Secret 与 Worker Secret 保存。

## 本地使用同一套构建与 D1

```bash
npm ci
npm run docs:build
npm run traffic:setup:local
npm run pages:dev
```

打开 `http://127.0.0.1:8788/`。本地使用被 Git 忽略的 `.dev.vars` 模拟今日实时
数据，并使用 `scripts/local-traffic-seed.sql` 初始化本地 D1；其中不包含任何
Cloudflare Token。

## 自动部署行为

- 推送到 `main`：发布生产版本。
- Pull Request 或其他分支：由 Cloudflare Pages 生成预览部署。
- 静态页面由 Pages 提供，`/api/traffic` 由 Pages Function 提供，并绑定 D1。
- 定时归档由独立 Worker 执行，页面浏览器不会接触 Cloudflare Secret。

## 自定义域名

正式自定义域名为 `https://workbuddy.5678.fun`。域名 DNS 由当前服务商托管，
通过 CNAME `workbuddy.5678.fun` 指向 `workbuddy-guide-t5y.pages.dev`。如未来更换域名，需要同步更新
`VITEPRESS_SITE_URL`、`docs/public/robots.txt`、README 在线阅读链接和各搜索引擎站点属性。

`docs/public/_headers` 会为带内容指纹的 `/assets/*` 设置一年不可变缓存，
并为社区图片、分享图和 favicon 设置一个月浏览器缓存。
