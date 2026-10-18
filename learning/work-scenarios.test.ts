// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { WorkScenarioCase } from './types';

const root = fileURLToPath(new URL('../', import.meta.url));
const indexFile = path.join(root, 'learning/work-scenarios.json');
const entries: Omit<WorkScenarioCase, 'url'>[] = existsSync(indexFile) ? JSON.parse(readFileSync(indexFile, 'utf8')) : [];
const courseIds = new Set(JSON.parse(readFileSync(path.join(root, 'learning/lesson-map.json'), 'utf8')).map((item: { id: string }) => item.id));
const workCategories = ['office', 'data', 'files', 'knowledge', 'research', 'creation', 'automation', 'agents'];

describe('围绕痛点、准备和交付的工作场景', () => {
  it('11个唯一工作方案覆盖原有八类分类，不使用文章篇号', () => {
    expect(entries).toHaveLength(11);
    expect(entries.every(item => !Object.hasOwn(item, 'articleNumber'))).toBe(true);
    expect(new Set(entries.map(item => item.id)).size).toBe(11);
    expect(new Set(entries.flatMap(item => item.categoryIds))).toEqual(new Set(workCategories));
    expect(entries.every(item => /^[a-z]+(?:-[a-z]+)*$/.test(item.id))).toBe(true);
  });

  it('跨分类案例共享一份详情，基础课程关联均真实存在', () => {
    for (const [id, categories] of [
      ['daily-intelligence', ['research', 'automation']],
      ['weekly-report', ['office', 'automation']],
      ['three-assistant-workflow', ['creation', 'agents']],
    ] as const) {
      expect(entries.find(item => item.id === id)?.categoryIds).toEqual(categories);
    }
    for (const item of entries) {
      expect(item.pain, item.id).toBeTruthy();
      expect(item.preparation, item.id).toBeTruthy();
      expect(item.outcome, item.id).toBeTruthy();
      expect(item.relatedLessonIds.length, item.id).toBeGreaterThan(0);
      for (const id of item.relatedLessonIds) expect(courseIds.has(id), item.id + '/' + id).toBe(true);
      for (const chapter of item.relatedChapterPaths) expect(existsSync(path.join(root, chapter)), chapter).toBe(true);
    }
  });

  it('每篇正文可独立阅读，准备、操作、检查和扩展链接齐全', () => {
    for (const item of entries) {
      const document = readFileSync(path.join(root, 'docs/solve/cases', item.id, 'source.md'), 'utf8');
      for (const heading of ['工作痛点与目标', '开始前准备什么', '分步解决问题', '检查交付结果', '相关学习']) {
        expect(document, item.id + '/' + heading).toMatch(new RegExp('^## .*' + heading, 'm'));
      }
      expect(document, item.id).not.toMatch(/公众号实战|连载第|稿件|回复【蓝皮书】|下期见|下一篇[，,]|我是大熊|aihot_actor=/);
      expect(document, item.id).toContain('**工作痛点：** ' + item.pain);
      expect(document, item.id).toContain('**解决后得到：** ' + item.outcome);
      expect(document, item.id).toContain('/learn/');
      expect(document, item.id).toContain('/bluebook/');
      expect((document.match(/^```/gm) ?? []).length % 2, item.id).toBe(0);
      const images = [...document.matchAll(/!\[[^\]]*\]\(([^)]+)\)/g)].map(match => match[1]);
      expect([...images].sort(), item.id).toEqual([...item.images].sort());
      for (const image of images) {
        expect(image, item.id).toMatch(/^\/solve\/20261018\//);
        expect(existsSync(path.join(root, 'docs/public', image)), image).toBe(true);
      }
    }
  });
});
