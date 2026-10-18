import { createHash } from 'node:crypto';

/** 生活指南从本人遇到的问题开始，操作和回复都在同一个 WorkBuddy 对话里完成。 */
export function createLifeScenarioGuide(lesson, definition, md) {
  const base = { sourcePath: '', sourceHeading: '', sourceUrl: '', sourceMediaIds: [], confirmation: 'none', requiredForPractice: false, checklist: [], lead: '' };
  const intro = { ...base, id: 'intro', kind: 'reading', title: '问题、痛点与解决办法',
    html: md.render(`### 你可能正在遇到\n\n${definition.pain}\n\n### 这次怎么解决\n\n${definition.approach}\n\n### 做完会得到\n\n${definition.outcome}`) };
  const prepare = { ...base, id: 'prepare', kind: 'reading', title: '先想好这些信息',
    html: md.render(`不用下载资料，也不用先准备文件夹。想好下面的信息，下一步直接填进提示词。暂时不知道的写“还没确定”。\n\n${definition.inputs.map(item => '- ' + item).join('\n')}\n\n### 可以像这样描述\n\n> ${definition.example}\n\n这是填写方式的示例，请换成自己的情况。`) };
  const actions = definition.steps.map(step => ({ ...base, id: step.id, kind: step.kind, title: step.title,
    html: md.render(step.actions.map(item => '- ' + item).join('\n') + '\n\n' + step.expected + '\n\n' + (step.prompts ?? []).map(prompt => '```text\n' + prompt.text + '\n```').join('\n\n')),
    instruction: { location: step.location, actions: step.actions, expected: step.expected, recovery: step.recovery }, prompts: step.prompts ?? [],
  }));
  const check = { ...base, id: 'self-check', kind: 'verify', title: '最后检查这次结果', html: '', confirmation: 'checklist',
    checklist: definition.checks.map((label, index) => ({ id: 'life-check-' + index, label })) };
  const chapters = [...new Map(lesson.sourceRefs.map(ref => {
    const url = '/' + ref.path.replace(/^docs\//, '').replace(/index\.md$/, '');
    return [url, { title: '蓝皮书：生活助手的使用方法', url }];
  })).values()];
  return { ...lesson, title: definition.title, pain: definition.pain, goal: definition.goal,
    preparation: definition.inputs.join('；'), outcome: definition.outcome, summary: definition.goal,
    materials: [], prerequisites: definition.prerequisites, steps: [intro, prepare, ...actions, check],
    externalSources: chapters, status: 'published', stepCountLabel: `${actions.length} 轮操作 · 直接在 WorkBuddy 对话中完成`,
    contentVersion: createHash('sha256').update(JSON.stringify({ definition, revision: 'life-task-v1' })).digest('hex').slice(0, 12),
  };
}
