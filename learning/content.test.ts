// @vitest-environment node
import { describe, expect, it, beforeAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { prepareLearning, validateSources } from './prepare.mjs';
import type { LearningContent } from './types';

let content: LearningContent;
const baseline = JSON.parse(readFileSync(new URL('./source-baseline.json', import.meta.url), 'utf8'));
beforeAll(async () => { content = await prepareLearning(); });

describe('冻结来源与课程内容', () => {
  it('来源与保留原图、裁切副本共 397 份文件通过哈希校验', () => {
    expect(validateSources()).toEqual({ files: 397, media: 301 });
  });
  it('26 个稳定编号按真实内容状态发布', () => {
    expect(content.lessons).toHaveLength(26);
    expect(new Set(content.lessons.map(item => item.id)).size).toBe(26);
		expect(content.lessons.every(item => item.status === 'published')).toBe(true);
		expect(content.lessons.filter(item => item.status === 'planned')).toHaveLength(0);
    expect(content.lessons.filter(item => item.status === 'preview')).toHaveLength(0);
    expect(content.lessons.filter(item => item.status === 'planned').every(item => !item.steps.length)).toBe(true);
  });
  it('工作场景案例独立于课程和生活指南生成，并使用统一详情地址', () => {
    expect(content.workScenarioCases).toHaveLength(11);
    expect(content.scenarioGuides).toHaveLength(7);
    const courseIds = new Set(content.lessons.map(item => item.id));
    for (const item of content.workScenarioCases) {
      expect(item.url).toBe('/solve/cases/' + item.id + '/');
      expect(courseIds.has(item.id)).toBe(false);
      expect(item.categoryIds).not.toContain('life');
    }
  });
  it('九类场景都包含可执行工作路线且来源课程存在', () => {
    expect(content.scenarios).toHaveLength(9);
    expect(content.scenarios.map(item => item.id)).toContain('life');
    const sprite = readFileSync(new URL('../docs/.vitepress/theme/components/PixelIconSprite.vue', import.meta.url), 'utf8');
    const iconIds = new Set([...sprite.matchAll(/<symbol id="wb-pixel-([^"]+)"/g)].map(match => match[1]));
    for (const scenario of content.scenarios) {
      expect(iconIds.has(scenario.icon), scenario.id + ' icon').toBe(true);
      expect(scenario.workflow.goal, scenario.id).toBeTruthy();
      expect(scenario.workflow.prepare.length, scenario.id).toBeGreaterThan(0);
      expect(scenario.workflow.steps.length, scenario.id).toBeGreaterThanOrEqual(3);
      expect(scenario.workflow.deliverable.length, scenario.id).toBeGreaterThan(0);
      expect(scenario.workflow.verify.length, scenario.id).toBeGreaterThan(0);
      for (const lessonId of scenario.workflow.sourceLessonIds) {
        expect(content.lessons.some(lesson => lesson.id === lessonId), scenario.id + ' ' + lessonId).toBe(true);
      }
    }
  });
  it('生活助手指南独立于 26 关路线并完整保留第 15 章图片', () => {
    const guides = (content as LearningContent & { scenarioGuides: any[] }).scenarioGuides;
    expect(guides).toHaveLength(7);
    expect(content.lessons).toHaveLength(26);
    expect(guides.every(guide => guide.track === 'scenario' && guide.categoryIds.includes('life'))).toBe(true);
    const chapter = 'docs/bluebook/第二篇 案例篇：从一项任务到一支 AI 团队/第 14 章 生活助手的价值，是减少琐碎/index.md';
    const expected = baseline.media.filter((media: any) => media.documentPath === chapter).sort((a: any, b: any) => a.line - b.line).map((media: any) => media.id);
    const actual = guides.flatMap(guide => guide.referenceSteps.flatMap((step: any) => step.sourceMediaIds));
    expect(actual).toEqual(expected);
    expect(new Set(actual).size).toBe(actual.length);
    expect(guides.every(guide => guide.steps.length >= 2 && guide.steps.at(-1).id === 'self-check')).toBe(true);
  });
  it('程序型教程按明确配置拆到原文三级步骤标题', () => {
    const lesson = content.lessons.find(item => item.number === 19)!;
    expect(lesson.referenceSteps!.map(step => step.title)).toEqual(expect.arrayContaining([
      '第一步：打开连接器',
      '第二步：找到飞书连接器',
      '第三步：创建飞书应用',
      '第四步：开通并授权',
      '第五步：在对话中启用连接器',
    ]));
  });
  it('每关原图数量、顺序与所选原文区段一致', () => {
    for (const lesson of content.lessons.filter(item => item.status !== 'planned')) {
      const expected = lesson.sourceRefs.flatMap(ref => baseline.media.filter((media: any) => media.documentPath === ref.path && media.line >= ref.startLine && media.line <= ref.endLine).sort((a: any, b: any) => a.line - b.line).map((media: any) => media.id));
      const actual = lesson.referenceSteps!.flatMap(step => step.sourceMediaIds);
      expect(actual, lesson.id).toEqual(expected);
      expect(new Set(actual).size, lesson.id).toBe(actual.length);
    }
  });
  it('三门补充课都可沿着对应场景完成实战和自检', () => {
    const word = content.lessons.find(item => item.number === 10)!;
    const compare = content.lessons.find(item => item.number === 12)!;
    const knowledge = content.lessons.find(item => item.number === 18)!;
    expect([word.status, compare.status, knowledge.status]).toEqual(['published', 'published', 'published']);
    expect(word.externalSources?.some(source => source.url.includes('/Practice-Two'))).toBe(true);
    expect(compare.steps[0].id).toBe('intro');
    expect(compare.steps.at(-1)?.id).toBe('self-check');
    expect(compare.categoryIds).toContain('office');
    expect(knowledge.categoryIds).toContain('knowledge');
    expect(knowledge.steps.some(step => step.prompts?.length)).toBe(true);
    expect(knowledge.externalSources?.map(source => source.url)).toContain('https://www.codebuddy.cn/docs/workbuddymini/features/Attachments-and-Skills');
    const text = knowledge.steps.map(step => step.html).join(' ').replace(/<[^>]*>/g, ' ');
    expect(text).not.toMatch(/不会外泄|浏览知识库中的全部内容|先浏览全部内容/);
    expect(text).toContain('同意授权后选择知识库');
    expect(text).toContain('勾选本次3条');
    expect(knowledge.sourceCaveat).toContain('不能视为官方保证');
  });
  it('安装与文件清单展示 20 张配图，销售 PPT 图不被误用', () => {
    const lesson = content.lessons.find(item => item.number === 2)!;
    expect(lesson.imageCount).toBe(20);
    const images = lesson.referenceSteps!.flatMap(step => step.sourceMediaIds);
    expect(images).toHaveLength(20);
    const source = lesson.sourceRefs.find(ref => ref.path.includes('第 4 章'))!;
    const original = baseline.media.filter((media: any) => media.documentPath === source.path);
    expect(images).toEqual(expect.arrayContaining(original.slice(0, 4).map((media: any) => media.id)));
    for (const media of original.slice(4)) expect(images).not.toContain(media.id);
  });
  it('媒体标记可全部映射且没有遗留相对图路径', () => {
    const registry = readFileSync(new URL('../docs/.vitepress/theme/learning/media.generated.ts', import.meta.url), 'utf8');
    for (const lesson of [...content.lessons, ...content.scenarioGuides]) for (const step of lesson.referenceSteps ?? []) {
      for (const match of step.html.matchAll(/__WB_(asset-[a-f0-9]{16})__/g)) expect(registry).toContain(JSON.stringify(match[1]));
      expect(step.html).not.toMatch(/(?:src|href)=["'](?:\.\/|\.\.\/|assets\/)/);
      expect(step.html).not.toMatch(/<h1(?:\s|>)/);
    }
  });
  it('下载入口使用新版官网，中文标点不进入地址', () => {
    const html = content.lessons[1].referenceSteps!.map(step => step.html).join('\n');
    expect(html).toContain('href="https://www.workbuddy.cn/"');
    expect(html).toContain('立即下载 WorkBuddy');
    expect(html).not.toMatch(/href="https:\/\/www.workbuddy.cn\/(?:%|，|）)/);
    expect(html).not.toContain('href="https://www.codebuddy.cn/work/"');
  });
  it('每项教程可自由浏览并有明确的可选自检', () => {
    for (const lesson of content.lessons) {
      expect(new Set(lesson.steps.map(step => step.id)).size).toBe(lesson.steps.length);
      if (lesson.status === 'published') {
        expect(lesson.steps.at(-1)?.id).toBe('self-check');
        expect(lesson.steps.at(-1)?.checklist.length).toBeGreaterThan(0);
      } else expect(lesson.steps.some(step => step.id === 'self-check')).toBe(false);
    }
  });
});
