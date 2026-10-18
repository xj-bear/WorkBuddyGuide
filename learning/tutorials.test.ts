// @vitest-environment node
import { existsSync } from 'node:fs';
import { beforeAll, describe, it, expect } from 'vitest';
import { prepareLearning } from './prepare.mjs';

let content: any;
beforeAll(async () => { content = await prepareLearning(); });

describe('可跟做的教学内容', () => {
  it('26 项场景配套课程保留原有教学闭环', () => {
    const lessons = content.lessons;
    expect(lessons).toHaveLength(26);
    for (const lesson of lessons) {
      expect(lesson.status, lesson.id).toBe('published');
      expect(lesson.pain, lesson.id).toBeTruthy();
      expect(lesson.goal, lesson.id).toBeTruthy();
      expect(lesson.outcome, lesson.id).toBeTruthy();
      expect(lesson.steps[0].id, lesson.id).toBe('intro');
      expect(lesson.steps[1].id, lesson.id).toBe('prepare');
      expect(lesson.steps.at(-1).id, lesson.id).toBe('self-check');
      expect(lesson.steps.some((step: any) => step.prompts?.length), lesson.id).toBe(true);
      for (const step of lesson.steps) {
        expect(step.instruction?.location, lesson.id + step.id).toBeTruthy();
        expect(step.instruction?.actions.length, lesson.id + step.id).toBeGreaterThan(0);
        expect(step.instruction?.expected, lesson.id + step.id).toBeTruthy();
        expect(step.instruction?.recovery, lesson.id + step.id).toBeTruthy();
        expect(step.lead).not.toMatch(/已核对的原文片段|照着本节的动作/);
        for (const prompt of step.prompts ?? []) {
          expect(prompt.destination).toBeTruthy();
          expect(prompt.text.trim()).not.toBe('');
          expect(Array.isArray(prompt.preparation)).toBe(true);
          expect(Array.isArray(prompt.replacements)).toBe(true);
        }
      }
    }
  });
  it('练习材料真实存在，并可独立下载', () => {
    for (const lesson of [...content.lessons, ...content.scenarioGuides]) {
      for (const material of lesson.materials ?? []) {
        expect(existsSync(new URL('../docs/public' + material.url, import.meta.url)), material.url).toBe(true);
      }
    }
    expect(existsSync(new URL('../docs/public/practice/workbuddy-practice.zip', import.meta.url))).toBe(true);
  });
  it('文件整理只有主线 Prompt，原文和附录属于参考层', () => {
    const lesson = content.lessons.find((item: any) => item.number === 6);
    expect(lesson.steps.flatMap((step: any) => step.prompts ?? [])).toHaveLength(1);
    expect(lesson.steps.map((step: any) => step.title).join(' ')).not.toContain('A.1');
    expect(lesson.referenceSteps.some((step: any) => step.title.includes('A.1'))).toBe(true);
    const prompt = lesson.steps.flatMap((step: any) => step.prompts ?? [])[0].text;
    expect(prompt).toContain('output/inventory.xlsx');
    expect(prompt).toContain('output/proposed-actions.md');
  });
  it('公司研究主线不混入缺失上下文的股票交易任务', () => {
    const lesson = content.lessons.find((item: any) => item.number === 25);
    expect(/第一轮的技术面分析|强烈推荐|关键支撑位/.test(JSON.stringify(lesson.steps))).toBe(false);
  });
});
