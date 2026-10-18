# WorkBuddy 网站交付与自托管

本轮交付：浅绿、黑白、扁平像素风的静态学习网站。网站无需账号、数据库、Node 常驻服务或 Cloudflare，即可在自己的服务器运行。

## 1. 本地运行与验收

需要 Node.js 20–24，推荐 22。

```sh
npm ci
npm run dev
```

打开终端显示的本地地址。正式构建与检查：

```sh
npm test
VITEPRESS_SITE_URL=https://你的实际域名 npm run build
node scripts/verify-delivery.mjs
```

构建后运行 `npm run preview`，默认在 `http://127.0.0.1:5174/` 本机预览，并支持中文地址、无扩展名文章、404 和视频范围请求。

构建目录为 `docs/.vitepress/dist`，将其**全部内容**放入服务器的网站根目录。默认域名为 `http://localhost:5173`，仅供本地检查；上线前请用实际域名重新构建。规范链接、站点地图和 robots 会使用该域名。不要把整个项目或内部规划目录直接作为公开网站根目录。

## 2. Nginx 示例

把下面的域名、目录换成自己的实际值，HTTPS 使用服务器已有证书配置。

```nginx
server {
    listen 80;
    server_name example.com;
    root /var/www/workbuddy;
    index index.html;

    # 保留中文目录与无扩展名的原文章节地址。
    location / {
        try_files $uri $uri.html $uri/ =404;
    }
    error_page 404 /404.html;
    location = /404.html { internal; }

    location /assets/ {
        add_header Cache-Control "public, max-age=31536000, immutable";
        try_files $uri =404;
    }
    location ~* \.(html|json|xml)$ {
        add_header Cache-Control "no-cache";
        try_files $uri =404;
    }
}
```

不要将所有缺失路径回退到首页并返回 200，否则假课程、失效图片和搜索引擎会得到错误的成功状态。静态服务器需要支持 `/reading-guide` → `reading-guide.html`，以及目录内的 `index.html`。

## 3. 统一替换自己的素材

编辑 `docs/.vitepress/site.ts`。素材放入 `docs/public/brand/` 等目录，配置使用 `/brand/文件名`。修改后重新构建。

| 字段 | 用途 | 当前行为 |
| --- | --- | --- |
| logo | 导航 Logo | 空值时使用文字与现有像素书本标识 |
| pdf | 蓝皮书 PDF | 空值显示整理中，不生成假下载链接 |
| discussionQr | 讨论群二维码 | 使用站主提供的讨论群二维码 |
| publicAccountQr | 公众号二维码 | 使用站主提供的公众号二维码 |
| trafficEndpoint | 可选访问统计接口 | 默认关闭；不要求部署后端 |

二维码与 PDF 的导航、蓝皮书阅读入口和页脚共用配置。PDF 请提供真实文件，不要把网页地址配置为 PDF。首页 WorkBuddy 工作区主视觉、课程完成插画与关于页工作流插画已由 imagegen 生成，分别存放于 `docs/public/images/workbuddy-workspace-pixel.png`、`docs/public/images/workbuddy-complete-pixel.png` 和 `docs/public/images/workbuddy-about-workflow-pixel.png`；其他新插画仍保留占位，后续按同一风格补充。教程截图、GIF 和视频不属于替换素材。

可选统计接口沿用项目原有格式：`todayVisits`、`todayPageViews`、`totalVisits`、`totalPageViews`、`totalSince`、`source`、`stale`。接口失败时隐藏统计，不用 0 冒充真实数据。旧 Cloudflare/D1 方案见 `DEPLOYMENT.md` 历史说明，仅有需要时再启用。

## 4. 页面与内容边界

- 首页 `/`，学习路线 `/learn/`，工作与生活场景 `/solve/`（包括独立的 `/solve/life/` 生活助手），完整蓝皮书 `/bluebook/`，关于 `/about/`，帮助 `/help/`。
- 课程规范地址 `/learn/wb-lesson-02/`；规划阶段的 `/learn/lesson/wb-lesson-02/` 保留兼容跳转，携带步骤与入口参数。
- 全部 28 章原文及原社区案例继续在线。26 个教学任务中，1、2、3、9、15 完整开放；18 项为已核验片段尝鲜；10、12、18 因来源不足为规划中。
- 八类工作场景提供目标、准备、推荐步骤、交付物和人工验收；新增 7 个生活指南独立于 26 关课程，来源于第 15 章。原章节图片完整保留，并按步骤映射；指南完成记录不计入课程进度。
- 新增学习层按 `learning/lesson-map.json` 的来源区段编排。不能为凑齐关卡，把不对应的原图挪进新任务。
- `learning/source-baseline.json` 冻结 45 篇原文、296 个图片文件、5 个视频文件及 51 个原路由。构建时检查原始字节。原文更新时，需要先重新审阅标题、区段、图片与完成条件，再更新基线；不要只为通过检查而覆盖摘要。
- `learning/content.generated.json` 与 `media.generated.ts` 为构建生成文件，不手动修改。
- 进度仅在当前浏览器保存。阅读与实战自行确认分开，不读取或验证用户电脑中的 WorkBuddy 输出，不跨设备同步。

## 5. 上线后抽查

检查首页、一个课程、原文章节中文地址、一个 GIF、一个视频、搜索、手机菜单和不存在的地址。核对自己的域名、三类二维码及 PDF。保留原项目 MIT 许可证和作者署名，像素图标来源与许可说明见 `THIRD_PARTY_NOTICES.md`。

本轮没有执行远程提交、推送或生产部署。
