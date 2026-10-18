import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createMarkdownRenderer } from "vitepress";
import { configureTutorialLinks } from "./markdown.mjs";
import { loadTutorials, teachLesson } from "./tutorials.mjs";
import { createWorkScenarioGuides } from "./work-scenario-guides.mjs";
import { createBluebookLessons } from "./bluebook.mjs";
import { createLifeScenarioGuide } from "./life-scenario-guides.mjs";

export const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (file) => readFileSync(path.join(projectRoot, file), "utf8");
const hash = (value) => createHash("sha256").update(value).digest("hex");
const sourceLines = (value) => {
  const lines = value.split(/\r?\n/);
  if (lines.at(-1) === "") lines.pop();
  return lines;
};
const baseline = JSON.parse(read("learning/source-baseline.json"));
const mapping = JSON.parse(read("learning/lesson-map.json"));
const workflowDefinitions = JSON.parse(read("learning/scenario-workflows.json"));
const scenarioGuideDefinitions = JSON.parse(read("learning/scenario-guides.json"));
const lessonEditorial = JSON.parse(read("learning/lesson-editorial.json"));
const escape = (value) => value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll('"', "&quot;");
const normalize = (value) => {
  try { return decodeURIComponent(value).replaceAll("\\", "/"); } catch { return value.replaceAll("\\", "/"); }
};
const assetKey = (file) => "asset-" + hash(file).slice(0, 16);
const routeFor = (file, anchor) => "/" + file.replace(/^docs\//, "").replace(/index\.md$/, "").replace(/\.md$/, "") + (anchor ? "#" + anchor : "");
const scenarioMeta = [
  { id: "office", title: "办公文档", description: "Word、PPT、周报与协作", icon: "briefcase" },
  { id: "data", title: "Excel 与数据", description: "清洗合并、分析与可视化", icon: "chart-line" },
  { id: "files", title: "文件处理", description: "清单、识别与安全整理", icon: "folder-open" },
  { id: "knowledge", title: "会议与知识", description: "转写、纪要与资料沉淀", icon: "book" },
  { id: "research", title: "资讯与研究", description: "行业简报与有来源的研究", icon: "newspaper" },
  { id: "creation", title: "内容创作", description: "文章、网页与内容工作流", icon: "grid" },
  { id: "automation", title: "自动化任务", description: "定时运行与稳定交付", icon: "refresh" },
  { id: "agents", title: "Agent 协作", description: "角色契约与多助手分工", icon: "users" },
  { id: "life", title: "生活助手", description: "旅行、家庭清单与日常安排", icon: "check-box" },
];
export const scenarios = scenarioMeta.map((scenario) => {
  const workflow = workflowDefinitions.find((item) => item.id === scenario.id);
  if (!workflow) throw new Error("缺少工作场景路线：" + scenario.id);
  return { ...scenario, workflow: { ...workflow, sourceLinks: (workflow.sourceLinks ?? []).map((source) => ({ title: source.title, url: routeFor(source.path, source.anchor) })) } };
});
const categories = {
  1: [], 2: ["files"], 3: ["office"], 4: ["office"], 5: ["knowledge"],
  6: ["files"], 7: ["data"], 8: ["files", "data"], 9: ["knowledge", "office"],
  10: ["office"], 11: ["data"], 12: ["office"], 13: ["data"], 14: ["knowledge"],
  15: ["automation"], 16: ["research", "automation"], 17: ["office", "automation"],
  18: ["knowledge", "research"], 19: ["office", "automation"], 20: ["automation"],
  21: ["automation", "agents"], 22: ["office"], 23: ["creation"], 24: ["agents"],
  25: ["research"], 26: ["creation", "agents"],
};
const concepts = new Set([1, 3, 5, 13, 21]);
const sourceDocument = (file) => baseline.documents.find((document) => document.path === file);
const referenceMediaCounts = (steps) => {
  const ids = new Set(steps.flatMap(step => step.sourceMediaIds));
  const media = baseline.media.filter(item => ids.has(item.id));
  return { imageCount: media.filter(item => item.mediaKind === "image").length, videoCount: media.filter(item => item.mediaKind === "video").length };
};

export function validateSources() {
  const errors = [];
  for (const item of [...baseline.documents, ...baseline.files]) {
    const file = path.join(projectRoot, item.path);
    if (!existsSync(file) || hash(readFileSync(file)) !== item.sha256) errors.push("来源文件变化或缺失：" + item.path);
  }
  for (const lesson of mapping) for (const ref of lesson.sourceRefs) {
    const lines = sourceLines(read(ref.path));
    if (hash(lines.slice(ref.startLine - 1, ref.endLine).join("\n")) !== ref.sha256) errors.push("课程来源区段待复审：" + lesson.id + " / " + ref.heading);
  }
  for (const guide of scenarioGuideDefinitions) {
    const lines = sourceLines(read(guide.sourcePath));
    const document = sourceDocument(guide.sourcePath);
    for (const step of guide.steps) {
      const heading = document?.headings.find((item) => item.anchor === step.sourceAnchor && item.title === step.sourceHeading);
      const sourceHash = hash(lines.slice(step.startLine - 1, step.endLine).join("\n"));
      if (!heading || heading.line > step.startLine || heading.endLine < step.endLine || sourceHash !== step.sha256) {
        errors.push("生活指南来源区段待复审：" + guide.id + " / " + step.title);
      }
    }
  }
  if (errors.length) throw new Error(errors.join("\n"));
  return { files: baseline.documents.length + baseline.files.length, media: baseline.media.length };
}

function writeChanged(file, content) {
  const target = path.join(projectRoot, file);
  mkdirSync(path.dirname(target), { recursive: true });
  if (!existsSync(target) || readFileSync(target, "utf8") !== content) writeFileSync(target, content);
}

export async function prepareLearning(markdownOptions = {}) {
  validateSources();
  const md = await createMarkdownRenderer(path.join(projectRoot, "docs"), markdownOptions);
  configureTutorialLinks(md);
  const originalImageRenderer = md.renderer.rules.image;
  md.renderer.rules.image = (tokens, index, options, env) => {
    const token = tokens[index];
    const assetPath = path.posix.normalize(path.posix.join(path.posix.dirname(env.sourcePath), normalize(token.attrGet("src"))));
    const record = env.media.find((item) => item.assetPath === assetPath && !env.used.has(item.id));
    if (!record) throw new Error("图片未在来源基线中：" + env.sourcePath + " / " + token.attrGet("src"));
    env.used.add(record.id);
    return '<img src="__WB_' + assetKey(assetPath) + '__" data-source-image-id="' + record.id + '" data-original-sha256="' + record.sha256 + '" alt="' + escape(token.content || env.heading + " · 原文图" + record.sequence) + '" loading="lazy" decoding="async" width="' + record.width + '" height="' + record.height + '">';
  };
  const renderPart = (source, ref, range, used) => {
    const media = baseline.media.filter((item) => item.documentPath === ref.path && item.line >= range[0] && item.line <= range[1]);
    let html = md.render(source, { sourcePath: ref.path, media, used, heading: ref.heading });
    html = html.replace(/<(\/?)h1(\s|>)/g, "<$1h2$2");
    html = html.replace(/(<(?:video|source)\b[^>]*\bsrc=)(["'])([^"']+)\2/gi, (_, prefix, quote, src) => {
      const assetPath = path.posix.normalize(path.posix.join(path.posix.dirname(ref.path), normalize(src)));
      const record = media.find((item) => item.assetPath === assetPath && item.mediaKind === "video");
      if (!record) throw new Error("视频来源不匹配：" + src);
      used.add(record.id);
      return prefix + quote + "__WB_" + assetKey(assetPath) + "__" + quote;
    });
    html = html.replace(/href=(["'])([^"']+)\1/g, (all, quote, href) => {
      if (/^(https?:|mailto:|tel:|#|\/)/i.test(href)) return all;
      const target = path.posix.normalize(path.posix.join(path.posix.dirname(ref.path).replace(/^docs\//, ""), normalize(href))).replace(/\.md(?=#|$)/, "");
      return "href=" + quote + "/" + target + quote;
    });
    return html;
  };
  function makeStep(ref, start, end, index, title, required = true) {
    const lines = sourceLines(read(ref.path));
    const source = lines.slice(start - 1, end).join("\n").replace(/^---\s*\n[\s\S]*?\n---\s*\n/, "");
    const used = new Set();
    const fence = String.fromCharCode(96).repeat(3);
    const parts = source.split(new RegExp(fence + "mermaid\\s*\\n([\\s\\S]*?)" + fence, "g"));
    const bodyBlocks = [];
    for (let i = 0; i < parts.length; i++) {
      if (i % 2) bodyBlocks.push({ kind: "mermaid", value: parts[i] });
      else if (parts[i].trim()) bodyBlocks.push({ kind: "html", value: renderPart(parts[i], ref, [start, end], used) });
    }
    const expected = baseline.media.filter((item) => item.documentPath === ref.path && item.line >= start && item.line <= end).sort((a, b) => a.line - b.line);
    for (const item of expected) if (!used.has(item.id)) throw new Error("拆解丢失媒体：" + item.id);
    return { id: "step-" + index, title, lead: "按原文完成这一项；操作发生在你自己的 WorkBuddy 中。", html: bodyBlocks.filter((block) => block.kind === "html").map((block) => block.value).join(""), bodyBlocks, sourcePath: ref.path, sourceHeading: ref.heading, sourceUrl: routeFor(ref.path, ref.anchor), sourceMediaIds: expected.map((item) => item.id), confirmation: "self_confirm", requiredForPractice: required, checklist: [] };
  }
  let lessons;
  let scenarioGuides;
  let bluebookLessons;
  const definitions = loadTutorials(projectRoot, [...mapping, ...scenarioGuideDefinitions].map(item => item.id));
  try {
    bluebookLessons = createBluebookLessons(baseline, read, makeStep);
    lessons = mapping.map(item => {
      // 原文标题仅用于参考阅读区；教学顺序由显式编写的任务定义决定。
      const referenceSteps = [];
      for (const ref of item.sourceRefs) {
        const document = sourceDocument(ref.path);
        const maxLevel = item.stepHeadingLevel === 3 ? 3 : 2;
        const candidates = document.headings.filter(heading => heading.level >= 2 && heading.level <= maxLevel && heading.line > ref.startLine && heading.line <= ref.endLine);
        const starts = [ref.startLine, ...candidates.map(heading => heading.line)];
        for (let i = 0; i < starts.length; i++) {
          const start = starts[i], end = i + 1 < starts.length ? starts[i + 1] - 1 : ref.endLine;
          const text = sourceLines(read(ref.path)).slice(start - 1, end).join("\n");
          if (!text.replace(/^#{1,6}\s.*$/gm, "").trim()) continue;
          const heading = document.headings.find(heading => heading.line === start);
          const step = makeStep(ref, start, end, referenceSteps.length + 1, heading?.title || ref.heading, false);
          step.lead = "原文与案例参考，不作为连续操作步骤。";
          step.confirmation = "none";
          referenceSteps.push(step);
        }
      }
      const editorial = lessonEditorial[item.id] ?? {};
      return teachLesson({ id: item.id, number: item.number, level: item.level, title: item.suggestedTitle, originalTitle: item.originalTitle,
        kind: concepts.has(item.number) ? "concept" : item.level === "L2" || item.level === "L3" ? "challenge" : "practice",
        categoryIds: categories[item.number], match: item.grade, sourceRefs: item.sourceRefs, referenceSteps,
        sourceCaveat: editorial.sourceCaveat, externalSources: item.externalSources ?? [], reviewedAt: "2026-10-17",
        ...referenceMediaCounts(referenceSteps), prerequisiteIds: [],
        nextLessonIds: mapping.filter(next => next.number > item.number).slice(0, 1).map(next => next.id),
      }, definitions[item.id]);
    });
    scenarioGuides = scenarioGuideDefinitions.map(guide => {
      const sourceRefs = guide.steps.map(step => ({ path: guide.sourcePath, title: sourceDocument(guide.sourcePath).title, heading: step.sourceHeading, anchor: step.sourceAnchor, startLine: step.startLine, endLine: step.endLine, sha256: step.sha256 }));
      const referenceSteps = guide.steps.map((step, index) => {
        const reference = makeStep(sourceRefs[index], step.startLine, step.endLine, index + 1, step.title, false);
        reference.lead = "原文与案例参考，不作为连续操作步骤。";
        reference.confirmation = "none";
        return reference;
      });
      return createLifeScenarioGuide({ id: guide.id, number: guide.number, level: "L1", track: "scenario", title: guide.title, originalTitle: guide.originalTitle,
        kind: "practice", categoryIds: ["life"], match: "A", sourceRefs, referenceSteps, reviewedAt: "2026-10-17",
        ...referenceMediaCounts(referenceSteps), prerequisiteIds: [], nextLessonIds: [],
      }, definitions[guide.id], md);
    });
  } finally { md.renderer.rules.image = originalImageRenderer; }
  const workScenarioCases = JSON.parse(read("learning/work-scenarios.json")).map(item => ({
    ...item, url: "/solve/cases/" + item.id + "/",
  }));
  const workScenarioGuides = createWorkScenarioGuides(projectRoot, workScenarioCases, md);
  const bluebookReadings = baseline.documents.filter(doc => doc.path.startsWith('docs/bluebook/') && /^(课外阅读|附录 [AB])/.test(doc.title)).map(doc => ({ title: doc.title, url: doc.route }));
  const generated = { bluebookLessons, bluebookReadings, lessons, scenarioGuides, scenarios, workScenarioCases, workScenarioGuides, cases: baseline.documents.filter(doc => doc.path.startsWith("docs/cases/submissions/")).map(doc => ({ title: doc.title, url: doc.route })), generatedAt: "2026-10-18", sourceIntegrity: { files: baseline.documents.length + baseline.files.length, media: baseline.media.length } };
  writeChanged("learning/content.generated.json", JSON.stringify(generated, null, 2) + "\n");
  const directory = path.join(projectRoot, "docs/.vitepress/theme/learning");
  const imports = baseline.files.map((asset, index) => "import media" + index + " from " + JSON.stringify(path.relative(directory, path.join(projectRoot, asset.path)).split(path.sep).join("/") + "?url") + ";");
  const entries = baseline.files.map((asset, index) => JSON.stringify(assetKey(asset.path)) + ": media" + index);
  writeChanged("docs/.vitepress/theme/learning/media.generated.ts", imports.join("\n") + "\nexport const mediaUrls: Record<string, string> = {\n" + entries.join(",\n") + "\n};\n");
  return generated;
}
