import { describe, expect, it } from 'vitest';
import { buildWorkScenarioSteps } from './workScenarioSteps';

describe('buildWorkScenarioSteps', () => {
  it('keeps preparation, numbered actions, checks, and related learning in source order', () => {
    const headings = [
      { id: 'problem', tagName: 'H2', textContent: '适用问题' },
      { id: 'prepare', tagName: 'H2', textContent: '准备条件' },
      { id: 'process', tagName: 'H2', textContent: '处理过程' },
      { id: 'step-1', tagName: 'H3', textContent: '1. 检查输入材料' },
      { id: 'step-2', tagName: 'H3', textContent: '2. 生成结果' },
      { id: 'verify', tagName: 'H2', textContent: '结果核对' },
      { id: 'learn', tagName: 'H2', textContent: '相关学习' },
    ];

    expect(buildWorkScenarioSteps(headings)).toEqual([
      { id: 'problem', title: '适用问题', level: 2 },
      { id: 'prepare', title: '准备条件', level: 2 },
      { id: 'step-1', title: '1. 检查输入材料', level: 3 },
      { id: 'step-2', title: '2. 生成结果', level: 3 },
      { id: 'verify', title: '结果核对', level: 2 },
      { id: 'learn', title: '相关学习', level: 2 },
    ]);
  });

  it('skips empty headings and assigns stable unique anchors when heading IDs are absent or repeated', () => {
    const headings = [
      { id: '', tagName: 'H2', textContent: '准备 条件' },
      { id: '', tagName: 'H3', textContent: '准备 条件' },
      { id: 'empty', tagName: 'H2', textContent: '  ' },
    ];

    expect(buildWorkScenarioSteps(headings)).toEqual([
      { id: 'work-step-准备-条件', title: '准备 条件', level: 2 },
      { id: 'work-step-准备-条件-2', title: '准备 条件', level: 3 },
    ]);
    expect(headings.map(heading => heading.id)).toEqual([
      'work-step-准备-条件',
      'work-step-准备-条件-2',
      'empty',
    ]);
  });

  it('uses the visible heading text instead of VitePress permalink accessibility text', () => {
    const headings = [
      { id: 'process', tagName: 'H2', textContent: '处理过程 Permalink to "处理过程"', title: '处理过程' },
      { id: 'step', tagName: 'H3', textContent: '第一步 Permalink to "第一步"', title: '第一步' },
    ];

    expect(buildWorkScenarioSteps(headings)).toEqual([
      { id: 'step', title: '第一步', level: 3 },
    ]);
  });
});
