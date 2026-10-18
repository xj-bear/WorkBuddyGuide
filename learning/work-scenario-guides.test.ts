// @vitest-environment node
import { beforeAll, describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createMarkdownRenderer } from 'vitepress';
import { createWorkScenarioGuides } from './work-scenario-guides.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const cases = JSON.parse(readFileSync(new URL('./work-scenarios.json', import.meta.url), 'utf8'));
let guides: ReturnType<typeof createWorkScenarioGuides>;
beforeAll(async () => {
  const md = await createMarkdownRenderer(root + 'docs', { codeCopyButtonTitle: '复制指令' });
  guides = createWorkScenarioGuides(root, cases, md);
});

describe('工作案例分步内容', () => {
  it('11 个案例均生成准备、操作、自检与相关学习，使用独立记录 ID', () => {
    expect(guides).toHaveLength(11);
    for (const guide of guides) {
      expect(guide.id).toMatch(/^wb-work-/);
      expect(guide.track).toBe('work-scenario');
      expect(guide.steps.map(step => step.id)).toEqual(['intro', 'prepare', 'action-1', 'action-2', 'action-3', 'verify', 'related']);
      expect(guide.steps.find(step => step.id === 'verify')!.checklist.length).toBeGreaterThan(0);
      expect(guide.externalSources.some(source => source.url.startsWith('/learn/'))).toBe(true);
      expect(guide.externalSources.some(source => source.url.startsWith('/bluebook/'))).toBe(true);
    }
  });
  it('每张图片与每个指令完整保留在所属步骤，不把整篇文章重复到每一步', () => {
    for (const [index, guide] of guides.entries()) {
      const source = readFileSync(`${root}docs/solve/cases/${guide.caseId}/source.md`, 'utf8');
      const html = guide.steps.map(step => step.html).join('\n');
      for (const image of cases[index].images) expect(html).toContain(`src="${image}"`);
      expect((html.match(/class="copy"/g) ?? []).length).toBe((source.match(/^```text/gm) ?? []).length);
      expect(guide.steps[0].html).toContain(cases[index].pain);
      expect(guide.steps[0].html).toContain(cases[index].outcome);
      expect(guide.preparation).toBe(cases[index].preparation);
      expect(html).not.toMatch(/公众号实战|连载第|稿件|已实测|复现通过/);
      expect(guide.steps[0].html).not.toContain('class="copy"');
      expect(guide.steps[1].html).not.toContain('<h1');
    }
  });
});
