// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest';
import { prepareLearning } from './prepare.mjs';

let guides: any[];
beforeAll(async () => { guides = (await prepareLearning()).scenarioGuides; });

describe('面向普通用户的生活指南', () => {
  it('七个指南按问题、解决办法、准备信息、实操和检查组织', () => {
    expect(guides).toHaveLength(7);
    for (const guide of guides) {
      expect(guide.steps[0].id).toBe('intro');
      expect(guide.steps[0].html).toContain('你可能正在遇到');
      expect(guide.steps[0].html).toContain('这次怎么解决');
      expect(guide.steps[0].html).toContain('做完会得到');
      expect(guide.steps[1].id).toBe('prepare');
      expect(guide.steps[1].html).toContain('可以像这样描述');
      expect(guide.steps[0].instruction).toBeUndefined();
      expect(guide.materials).toEqual([]);
      expect(guide.steps.at(-1).id).toBe('self-check');
      const main = JSON.stringify(guide.steps);
      expect(main, guide.id).not.toMatch(/output\/life\/|input\/life\/|workbuddy-practice|工作目录选择器|默认执行模式|\.md\b/);
      expect(guide.steps.some((step: any) => step.prompts?.length)).toBe(true);
      expect(guide.externalSources).toHaveLength(1);
    }
  });
  it('旅行从实际需求开始，旧的建任务链接仍能进入真正操作', () => {
    const trip = guides.find(item => item.id === 'wb-life-trip-planning');
    const start = trip.steps.find((step: any) => step.id === 'open-trip-task');
    expect(start.title).toBe('打开 WorkBuddy，发出第一条旅行需求');
    expect(start.prompts[0].text).toContain('出发城市：');
    expect(start.prompts[0].text).toContain('同行人数：');
    expect(start.instruction.actions.join(' ')).toContain('对话输入框');
    expect(trip.steps.map((step: any) => step.id)).toEqual(['intro', 'prepare', 'open-trip-task', 'compare-route-options', 'draft-chosen-route', 'verify-live-travel-facts', 'self-check']);
  });
});
