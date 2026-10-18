import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';

// 正文只维护一份；按 Markdown 行区间拆分，避免误拆指令代码中的标题。
export function createWorkScenarioGuides(root, cases, md) {
  return cases.map((item, caseIndex) => {
    const sourcePath = `docs/solve/cases/${item.id}/source.md`;
    const source = readFileSync(path.join(root, sourcePath), 'utf8').replace(/^---\s*\n[\s\S]*?\n---\s*\n/, '');
    const lines = source.split(/\r?\n/);
    const tokens = md.parse(source, {});
    const headings = tokens.flatMap((token, index) => token.type === 'heading_open'
      ? [{ level: Number(token.tag.slice(1)), title: tokens[index + 1].content, line: token.map[0] }]
      : []);
    const sections = headings.filter(heading => heading.level === 2 || heading.level === 3);
    let processLead = '';
    let actionIndex = 0;
    const steps = sections.flatMap((heading, index) => {
      let markdown = lines.slice(heading.line + 1, sections[index + 1]?.line ?? lines.length).join('\n').trim();
      if (heading.title === '分步解决问题') { processLead = markdown; return []; }
      const id = heading.title === '工作痛点与目标' ? 'intro' : heading.title === '开始前准备什么' ? 'prepare'
        : heading.title === '检查交付结果' ? 'verify' : heading.title === '相关学习' ? 'related' : `action-${++actionIndex}`;
      if (id === 'action-1' && processLead) markdown = processLead + '\n\n' + markdown;
      const checklist = id === 'verify' ? [...markdown.matchAll(/^- (.+)$/gm)].map((match, i) => ({
        id: `verify-${i + 1}`, label: md.renderInline(match[1]).replace(/<[^>]+>/g, ''),
      })) : [];
      if (id === 'verify') markdown = markdown.replace(/^- .+$/gm, '').trim();
      return [{ id, title: heading.level === 3 ? heading.title.replace(/^\d+[.、．]\s*/, '') : heading.title,
        lead: '', html: md.render(markdown), sourcePath, sourceHeading: '相关基础教程与完整蓝皮书', sourceUrl: '',
        sourceMediaIds: [], confirmation: checklist.length ? 'checklist' : 'none', requiredForPractice: false, checklist }];
    });
    if (steps.length < 6 || !steps.some(step => step.id === 'verify' && step.checklist.length)) {
      throw new Error(`工作场景缺少操作或验收步骤：${item.id}`);
    }
    const related = sections.find(heading => heading.title === '相关学习');
    const relatedMarkdown = related ? lines.slice(related.line + 1).join('\n') : '';
    const externalSources = [...relatedMarkdown.matchAll(/\[([^\]]+)\]\((?:<([^>]+)>|([^\s)]+))\)/g)]
      .map(match => ({ title: match[1], url: match[2] ?? match[3] }));
    return { id: `wb-work-${item.id}`, caseId: item.id, number: caseIndex + 1, level: 'L1', track: 'work-scenario',
      title: item.title, originalTitle: item.title, kind: 'practice', categoryIds: item.categoryIds, status: 'published', match: 'A',
      summary: item.pain + item.outcome, pain: item.pain, preparation: item.preparation, outcome: item.outcome, sourceRefs: [], steps, externalSources,
      contentVersion: createHash('sha256').update(source).digest('hex'), reviewedAt: '2026-10-18', imageCount: item.images.length,
      prerequisiteIds: [], nextLessonIds: [] };
  });
}
