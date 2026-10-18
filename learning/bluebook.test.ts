// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { prepareLearning } from './prepare.mjs';

let content: any;
const baseline = JSON.parse(readFileSync(new URL('./source-baseline.json', import.meta.url), 'utf8'));
beforeAll(async () => { content = await prepareLearning(); });

describe('按蓝皮书原有章节学习', () => {
  it('28 章按正文实际章号排列，每章对应唯一完整原文', () => {
    const chapters = baseline.documents.filter((doc: any) => doc.path.startsWith('docs/bluebook/') && /^第\s*\d+\s*章/.test(doc.title))
      .sort((a: any, b: any) => Number(a.title.match(/\d+/)[0]) - Number(b.title.match(/\d+/)[0]));
    expect(content.bluebookLessons).toHaveLength(28);
    expect(content.bluebookLessons.map((item: any) => item.title)).toEqual(chapters.map((doc: any) => doc.title));
    expect(content.bluebookLessons.map((item: any) => item.number)).toEqual(Array.from({ length: 28 }, (_, i) => i + 1));
    for (const [index, lesson] of content.bluebookLessons.entries()) {
      expect(lesson.sourceRefs.map((ref: any) => ref.path)).toEqual([chapters[index].path]);
      expect(lesson.track).toBe('bluebook');
      expect(lesson.materials ?? []).toHaveLength(0);
      expect(lesson.referenceSteps ?? []).toHaveLength(0);
      expect(lesson.steps.every((step: any) => !step.instruction)).toBe(true);
      expect(JSON.stringify(lesson.steps)).not.toMatch(/workbuddy-practice\.zip|input\/inbox\/brief.txt/);
      expect(lesson.nextLessonIds).toEqual(index < 27 ? [content.bluebookLessons[index + 1].id] : []);
    }
  });
  it('章节正文直接展示原图，不丢失或重复且不与场景练习共用记录', () => {
    const sceneIds = new Set([...content.lessons, ...content.scenarioGuides, ...content.workScenarioGuides].map((item: any) => item.id));
    for (const lesson of content.bluebookLessons) {
      const expected = baseline.media.filter((item: any) => item.documentPath === lesson.sourceRefs[0].path)
        .sort((a: any, b: any) => a.line - b.line).map((item: any) => item.id);
      expect(lesson.steps.flatMap((step: any) => step.sourceMediaIds)).toEqual(expected);
      expect(sceneIds.has(lesson.id)).toBe(false);
      expect(lesson.steps.at(-1).id).toBe('self-check');
    }
    expect(content.bluebookReadings.map((item: any) => item.title)).toEqual([
      '课外阅读：一章看懂 AI 工作系统', '附录 A 常用指令模板', '附录 B 场景速查表',
    ]);
  });
});
