import { readFileSync, readdirSync, existsSync, statSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, join, extname } from 'node:path';
import { createHash } from 'node:crypto';
import { Window } from 'happy-dom';
import { validateSources } from '../learning/prepare.mjs';
const root = resolve('docs/.vitepress/dist');
const baseline = JSON.parse(readFileSync('learning/source-baseline.json', 'utf8'));
const content = JSON.parse(readFileSync('learning/content.generated.json', 'utf8'));
const files = [];
function walk(dir) { for (const file of readdirSync(dir)) { const p=join(dir,file); statSync(p).isDirectory()?walk(p):files.push(p); } }
walk(root);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const hashes = new Set(files.filter(p=>!['.html','.js','.css','.map'].includes(extname(p))).map(p=>hash(readFileSync(p))));
const missingBytes = baseline.files.filter(f=>!hashes.has(f.sha256)).map(f=>f.path);
const errors = [];
const auditWindow = new Window();
const lifeChapter = 'docs/bluebook/第二篇 案例篇：从一项任务到一支 AI 团队/第 14 章 生活助手的价值，是减少琐碎/index.md';
const chapterMedia = baseline.media.filter(media => media.documentPath === lifeChapter).sort((a, b) => a.line - b.line);
const guides = content.scenarioGuides.map(guide => ({
  id: guide.id,
  title: guide.title,
  steps: guide.referenceSteps.map((step, index) => {
    const source = guide.sourceRefs[index];
    return {
      title: step.title,
      sourceHeading: source.heading,
      sourceAnchor: source.anchor,
      sourcePath: source.path,
      startLine: source.startLine,
      endLine: source.endLine,
      media: step.sourceMediaIds.map(id => chapterMedia.find(media => media.id === id)).filter(Boolean).map(media => ({
        id: media.id, line: media.line, sourcePath: media.documentPath, assetPath: media.assetPath, sha256: media.sha256,
      })),
    };
  }),
}));
const guideMediaIds = guides.flatMap(guide => guide.steps.flatMap(step => step.media.map(media => media.id)));
if (JSON.stringify(guideMediaIds) !== JSON.stringify(chapterMedia.map(media => media.id))) errors.push('生活指南图片位置未覆盖或顺序变化');
mkdirSync('delivery/audit', { recursive: true });
writeFileSync('delivery/audit/scenario-guide-media.json', JSON.stringify({
  chapterPath: lifeChapter,
  originalImageCount: chapterMedia.length,
  assignedImageCount: guideMediaIds.length,
  guides,
}, null, 2) + '\n');
let renderedOriginalImages = 0;
let renderedOriginalVideos = 0;
const resolveUrl = (url, page) => {
  const p = new URL(url, 'http://local/'+page.slice(root.length+1));
  let target;try { target = join(root, decodeURIComponent(p.pathname)); } catch{return false;}
  return [target, target+'.html', join(target,'index.html')].some(file=>existsSync(file)&&statSync(file).isFile());
};
for (const page of files.filter(file=>file.endsWith('.html'))) {
  const html=readFileSync(page,'utf8');
  if (html.includes('__WB_asset-')) errors.push('未解析媒体标记: '+page);
  for (const match of html.matchAll(/(?:src|href)="([^"<>]+)"/g)) {
    const url=match[1].replaceAll('&amp;','&');
    if (/^(?:https?:|data:|mailto:|tel:|#|javascript:)/.test(url)) continue;
    if (!resolveUrl(url,page)) errors.push('站内链接或资源缺失: '+page.slice(root.length)+' → '+url);
  }
}
for (const route of baseline.legacyRoutes) if(!resolveUrl(route, join(root,'index.html'))) errors.push('原始路由缺失: '+route);
for (const doc of baseline.documents) {
  const page = join(root, doc.path.replace(/^docs\//, '').replace(/\.md$/, '.html'));
  const html = readFileSync(page, 'utf8');
  const actual = [];
  auditWindow.document.body.innerHTML = html;
  const article = auditWindow.document.querySelector('main.main .vp-doc');
  if (!article) { errors.push('原文正文未渲染: ' + doc.path); continue; }
  // 页脚二维码属于站点界面，不计入蓝皮书原文媒体。
  for (const element of article.querySelectorAll('img[src], video[src], source[src]')) {
    const src = element.getAttribute('src');
    let bytes;
    if (src.startsWith('data:')) bytes = Buffer.from(src.slice(src.indexOf(',') + 1), 'base64');
    else if (src.startsWith('/')) bytes = readFileSync(join(root, decodeURIComponent(src)));
    else continue;
    actual.push({ kind: element.tagName === 'IMG' ? 'image' : 'video', sha256: hash(bytes) });
  }
  const expected = baseline.media.filter(media => media.documentPath === doc.path).sort((a, b) => a.line - b.line).map(media => ({ kind: media.mediaKind, sha256: media.sha256 }));
  if (JSON.stringify(actual) !== JSON.stringify(expected)) errors.push('原文实际媒体引用或顺序变化: ' + doc.path);
  renderedOriginalImages += actual.filter(media => media.kind === 'image').length;
  renderedOriginalVideos += actual.filter(media => media.kind === 'video').length;
}
for (const lesson of content.lessons) {
  const html=readFileSync(join(root,'learn',lesson.id,'index.html'),'utf8');
  if(!html.includes(lesson.title.replaceAll('&','&amp;')) && !html.includes(lesson.title)) errors.push('课程标题未渲染: '+lesson.id);
  if(lesson.status!=='published'&&!html.includes('noindex, follow')) errors.push('未开放课程允许索引: '+lesson.id);
}
const sitemap=readFileSync(join(root,'sitemap.xml'),'utf8');
for (const scenario of content.scenarios) {
  const page = join(root, 'solve', scenario.id, 'index.html');
  if (!existsSync(page)) { errors.push('场景页面缺失: ' + scenario.id); continue; }
  const html = readFileSync(page, 'utf8');
  if (!html.includes(scenario.title)) errors.push('场景标题未渲染: ' + scenario.id);
  // 生活助手以独立指南卡片呈现，不展示工作分类的通用流程面板。
  if (scenario.id !== 'life' && !html.includes(scenario.workflow.goal)) errors.push('场景工作流未渲染: ' + scenario.id);
}
for (const item of content.workScenarioCases) {
  const page = join(root, item.url, 'index.html');
  if (!existsSync(page)) { errors.push('工作场景详情缺失: ' + item.id); continue; }
  const html = readFileSync(page, 'utf8');
  if (!html.includes(item.title)) errors.push('工作场景标题未渲染: ' + item.id);
  if (!sitemap.includes(item.url)) errors.push('工作场景未进入站点地图: ' + item.id);
  // 分步页首次仅渲染当前步骤，其余步骤由同一构建数据在切换时展示。
  const guide = content.workScenarioGuides.find(guide => guide.id === 'wb-work-' + item.id);
  const stepHtml = guide?.steps.map(step => step.html).join('\n') ?? '';
  for (const image of item.images) if (!stepHtml.includes(image) || !resolveUrl(image, page)) errors.push('工作场景配图缺失: ' + item.id + ' / ' + image);
  for (const category of item.categoryIds) {
    const categoryHtml = readFileSync(join(root, 'solve', category, 'index.html'), 'utf8');
    auditWindow.document.body.innerHTML = categoryHtml;
    const linked = [...auditWindow.document.querySelectorAll('a[href]')].some(link => new URL(link.getAttribute('href'), 'http://local').pathname === item.url);
    if (!linked) errors.push('分类缺少场景入口: ' + category + ' / ' + item.id);
  }
}
for (const guide of content.scenarioGuides) {
  const page = join(root, 'learn', guide.id, 'index.html');
  if (!existsSync(page)) { errors.push('生活指南页面缺失: ' + guide.id); continue; }
  const html = readFileSync(page, 'utf8');
  if (!html.includes(guide.title)) errors.push('生活指南标题未渲染: ' + guide.id);
  if (html.includes('noindex, follow')) errors.push('已发布生活指南被排除索引: ' + guide.id);
  if (!sitemap.includes(guide.id)) errors.push('已发布生活指南未进入站点地图: ' + guide.id);
}
if(missingBytes.length) errors.push(...missingBytes.map(p=>'原始媒体字节未出现在交付中: '+p));
for(const lesson of content.lessons.filter(l=>l.status!=='published'))if(sitemap.includes(lesson.id))errors.push('尝鲜/规划页面进入站点地图: '+lesson.id);
const result={checkedAt:new Date().toISOString(),sourceIntegrity:validateSources(),htmlPages:files.filter(p=>p.endsWith('.html')).length,legacyRoutes:baseline.legacyRoutes.length,mediaFiles:baseline.files.length,preservedMediaBytes:baseline.files.length-missingBytes.length,renderedOriginalImages,renderedOriginalVideos,workScenarioCases:content.workScenarioCases.length,workScenarioImages:content.workScenarioCases.reduce((count,item)=>count+item.images.length,0),errors:[...new Set(errors)]};
mkdirSync('delivery',{recursive:true});writeFileSync('delivery/integrity-report.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));if(result.errors.length)process.exitCode=1;
