import { createHash } from 'node:crypto';
import bluebookParts from './bluebook-parts.json' with { type: 'json' };

const hash = value => createHash('sha256').update(value).digest('hex');
const chapterId = number => 'wb-chapter-' + String(number).padStart(2, '0');

/** 直接按原书章号和二级标题拆分；场景任务继续使用独立的教学定义。 */
export function createBluebookLessons(baseline, readSource, makeStep) {
  const chapters = baseline.documents.filter(document => document.path.startsWith('docs/bluebook/') && /^第\s*\d+\s*章/.test(document.title))
    .map(document => ({ ...document, number: Number(document.title.match(/\d+/)[0]) }))
    .sort((a, b) => a.number - b.number);
  return chapters.map((document, index) => {
    const lines = readSource(document.path).split(/\r?\n/);
    if (lines.at(-1) === '') lines.pop();
    const ref = { path: document.path, title: document.title, heading: document.title, anchor: document.headings[0].anchor,
      startLine: 1, endLine: lines.length, sha256: hash(lines.join('\n')) };
    const starts = [document.headings[0].line + 1, ...document.headings.filter(heading => heading.level === 2).map(heading => heading.line)];
    const steps = starts.flatMap((start, sectionIndex) => {
      const end = (starts[sectionIndex + 1] ?? lines.length + 1) - 1;
      if (!lines.slice(start - 1, end).join('\n').replace(/^#{1,6}\s.*$/gm, '').trim()) return [];
      const heading = document.headings.find(item => item.line === start);
      const step = makeStep(ref, start, end, sectionIndex + 1, heading?.title ?? '本章导读', false);
      return [{ ...step, id: 'section-' + (sectionIndex + 1), lead: '', confirmation: 'none' }];
    });
    steps.push({ id: 'self-check', title: '本章回顾', lead: '按自己的理解回顾本章，自检可选；实际操作与结果由你核对。',
      html: '', sourcePath: ref.path, sourceHeading: ref.heading, sourceUrl: document.route, sourceMediaIds: [],
      confirmation: 'checklist', requiredForPractice: false,
      checklist: [{ id: 'read', label: '已阅读本章图文与示例。' }, { id: 'review', label: '能复述本章要点，并记录仍需确认的问题。' }],
    });
    const part = bluebookParts.find(item => document.number >= item.first && document.number <= item.last);
    const media = baseline.media.filter(item => item.documentPath === document.path);
    return { id: chapterId(document.number), number: document.number, level: part.id, track: 'bluebook',
      title: document.title, originalTitle: document.title, kind: 'concept', status: 'published', match: 'A',
      summary: part.label + ' · ' + part.title + '：' + part.description, stepCountLabel: (steps.length - 1) + ' 节 · 按原文顺序阅读',
      categoryIds: [], sourceRefs: [ref], steps, materials: [],
      imageCount: media.filter(item => item.mediaKind === 'image').length, videoCount: media.filter(item => item.mediaKind === 'video').length,
      prerequisiteIds: [], nextLessonIds: chapters[index + 1] ? [chapterId(chapters[index + 1].number)] : [],
      contentVersion: hash('bluebook-v1:' + ref.sha256).slice(0, 12), reviewedAt: null,
    };
  });
}
