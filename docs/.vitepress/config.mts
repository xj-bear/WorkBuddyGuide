import { defineConfig } from "vitepress";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { prepareLearning } from "../../learning/prepare.mjs";
import { configureTutorialLinks } from "../../learning/markdown.mjs";
import { siteAssets } from "./site";
import { chineseSearchTokens, learningSearchSections } from "../../learning/search.mjs";


import { siteSidebar } from "./sidebar";
import { configureMermaidMarkdown } from "./mermaid-markdown";
import { createPageDescription, createSeoHead } from "./seo";

const markdownOptions = {
  config: md => { configureMermaidMarkdown(md); configureTutorialLinks(md); },
  image: { lazyLoading: true },
  codeCopyButtonTitle: "复制指令",
  theme: { light: "github-light", dark: "github-dark" },
};
const learning = await prepareLearning(markdownOptions);

const siteUrl = process.env.VITEPRESS_SITE_URL || "http://localhost:5173";
const cloudflareAnalyticsHead = process.env.NODE_ENV === "production"
  ? [["script", {
      type: "module",
      src: "https://static.cloudflareinsights.com/beacon.min.js",
      "data-cf-beacon": JSON.stringify({ token: "26c2065f853b43e89b72fd6f3bdaf1fe" }),
    }] as const]
  : [];
const googleAnalyticsHead = process.env.NODE_ENV === "production"
  ? [
      ["script", {
        async: "",
        src: "https://www.googletagmanager.com/gtag/js?id=G-C30GY1Y5F5",
      }] as const,
      ["script", {}, `window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'G-C30GY1Y5F5');`] as const,
    ]
  : [];

export default defineConfig({
    lang: "zh-CN",
    title: "WorkBuddy 实战蓝皮书",
    titleTemplate: ":title · WorkBuddy 实战蓝皮书",
    description: "从安装使用到 AI 工作系统：28 章 WorkBuddy 实战指南与团队落地方法。",
    cleanUrls: true,
    lastUpdated: true,
    srcExclude: ["**/source.md", "plans/**", "superpowers/**"],
    sitemap: {
      hostname: siteUrl,
      transformItems: items => items.filter(item => !item.url.includes("learn/lesson/") && !learning.lessons.some(lesson => lesson.status !== "published" && item.url.includes(lesson.id))),
    },
    transformPageData: (pageData, { siteConfig }) => {
      if (pageData.relativePath.startsWith("bluebook/")) {
        pageData.frontmatter.pageClass = pageData.relativePath === "bluebook/index.md" ? "bluebook-directory" : "bluebook-page";
      }
      if (pageData.relativePath.startsWith("cases/")) {
        pageData.frontmatter.aside = false;
        pageData.frontmatter.outline = false;
      }

      return {
        description: createPageDescription(siteConfig.srcDir, pageData),
      };
    },
    buildEnd: siteConfig => { writeFileSync(join(siteConfig.outDir, "robots.txt"), `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl.replace(/\/$/, "")}/sitemap.xml\n`); },
    transformHead: (context) => createSeoHead(siteUrl, context),
    head: [
      ["link", { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" }],
      ["meta", { name: "theme-color", content: "#D9FBE3" }],
      ["meta", { name: "author", content: "WorkBuddy Guide Contributors" }],
      ...cloudflareAnalyticsHead,
      ...googleAnalyticsHead,
      [
        "meta",
        {
          name: "baidu-site-verification",
          content: "codeva-RF1ZqL4g90",
        },
      ],
      [
        "meta",
        {
          name: "keywords",
          content:
            "WorkBuddy,WorkBuddy 教程,AI Agent,AI 工作系统,Skills,MCP,自动化,多智能体,职场 AI",
        },
      ],
    ],
    markdown: markdownOptions,
    themeConfig: {
      siteTitle: "WorkBuddy 蓝皮书",
      darkModeSwitchLabel: "外观",
      darkModeSwitchTitle: "切换深色主题",
      lightModeSwitchTitle: "切换浅色主题",
      sidebarMenuLabel: "章节目录",
      returnToTopLabel: "回到顶部",
      skipToContentLabel: "跳到正文",
      ...(siteAssets.logo ? { logo: siteAssets.logo } : {}),
      nav: [
        { text: "学习路线", link: "/learn/" },
        { text: "实战场景", link: "/solve/" },
        { text: "完整蓝皮书", link: "/bluebook/" },
        { text: "关于", link: "/about/" },
        { text: "PDF 下载", link: siteAssets.pdf || "/bluebook/#bluebook-download" },
      ],
      sidebar: siteSidebar,
      socialLinks: [
        { icon: "github", link: "https://github.com/xj-bear/WorkBuddyGuide" },
      ],
      search: {
        provider: "local",
        options: {
          miniSearch: { options: { tokenize: chineseSearchTokens }, searchOptions: { combineWith: "AND" }, _splitIntoSections: file => learningSearchSections(file, learning) },
          translations: {
            button: { buttonText: "搜索", buttonAriaLabel: "搜索" },
            modal: { displayDetails: "显示详细结果", resetButtonTitle: "清空搜索", backButtonTitle: "返回", noResultsText: "没有找到相关内容", footer: { selectText: "选择", navigateText: "切换结果", closeText: "关闭" } },
          },
        },
      },
      outline: {
        level: [2, 3],
        label: "本页目录",
      },
      docFooter: {
        prev: "上一篇",
        next: "下一篇",
      },
      lastUpdated: {
        text: "最后更新",
        formatOptions: {
          dateStyle: "medium",
          timeStyle: "short",
        },
      },
      editLink: {
        pattern: "https://github.com/xj-bear/WorkBuddyGuide",
        text: "在 GitHub 上改进此页",
      },

    },
  });
