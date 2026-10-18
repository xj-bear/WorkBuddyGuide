import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

const nonempty = (value) => typeof value === 'string' && value.trim().length > 0;
const list = (value) => Array.isArray(value) && value.length > 0 && value.every(nonempty);
const escape = (value) => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const officialGuides = [
  { ids: [], title: '官方：新建任务、模式与工作空间', url: 'https://www.codebuddy.cn/docs/workbuddy/From-Beginner-to-Expert-Guide/Function-Description/Task-Bar' },
  { ids: ['wb-lesson-15', 'wb-lesson-16', 'wb-lesson-21'], title: '官方：定时任务配置', url: 'https://www.workbuddy.cn/docs/workbuddy/From-Beginner-to-Expert-Guide/Function-Description/Automation-Guide' },
  { ids: ['wb-lesson-24'], title: '官方：安装、启用和关闭技能', url: 'https://www.codebuddy.cn/docs/workbuddy/From-Beginner-to-Expert-Guide/Function-Description/Skills-Market' },
  { ids: ['wb-lesson-18'], title: '官方：小程序引用 ima 文件', url: 'https://www.codebuddy.cn/docs/workbuddymini/features/Attachments-and-Skills' },
  { ids: ['wb-lesson-20'], title: '官方：小程序连接电脑', url: 'https://www.codebuddy.cn/docs/workbuddymini/features/Multidevice' },
];

export function loadTutorials(root, ids) {
  const definitions = {};
  for (const file of ['basics', 'advanced', 'life']) {
    const entries = JSON.parse(readFileSync(path.join(root, 'learning/tutorials', file + '.json'), 'utf8'));
    for (const [id, definition] of Object.entries(entries)) {
      if (Object.hasOwn(definitions, id)) throw new Error('教学编号重复：' + id);
      definitions[id] = definition;
    }
  }
  if (Object.keys(definitions).length !== ids.length || ids.some(id => !Object.hasOwn(definitions, id))) throw new Error('全部 33 项教学定义必须齐全');
  for (const [id, item] of Object.entries(definitions)) {
    if (![item.pain, item.goal, item.outcome].every(nonempty) || !list(item.prerequisites) || !list(item.checks)) throw new Error('任务背景、前置条件或验收缺失：' + id);
    if (!Array.isArray(item.materials) || !Array.isArray(item.steps) || item.steps.length < 3) throw new Error('准备材料或操作路径缺失：' + id);
    const stepIds = new Set(['intro', 'prepare', 'self-check']);
    for (const step of item.steps) {
      if (!nonempty(step.id) || stepIds.has(step.id)) throw new Error('教学步骤编号重复：' + id + '/' + step.id);
      stepIds.add(step.id);
      if (!['reading', 'action', 'prompt', 'verify'].includes(step.kind) || ![step.title, step.purpose, step.location, step.expected, step.recovery].every(nonempty) || !list(step.actions)) throw new Error('教学动作、位置或结果说明缺失：' + id + '/' + step.id);
      for (const prompt of step.prompts ?? []) {
        if (![prompt.title, prompt.text, prompt.destination].every(nonempty) || !Array.isArray(prompt.replacements) || !Array.isArray(prompt.preparation)) throw new Error('Prompt 用法说明缺失：' + id + '/' + step.id);
      }
    }
    if (!item.steps.some(step => step.prompts?.length)) throw new Error('缺少可练习的 Prompt：' + id);
    for (const material of item.materials) {
      if (!nonempty(material.path) || !nonempty(material.description) || material.path.includes('..') || material.path.startsWith('/') || !existsSync(path.join(root, 'docs/public/practice/files', material.path))) throw new Error('练习材料不存在：' + id + '/' + material.path);
    }
  }
  return definitions;
}

export function teachLesson(lesson, definition) {
  const ref = lesson.referenceSteps[0];
  const make = (step) => {
    const html = '<p>' + escape(step.purpose) + '</p><ol>' + step.actions.map(action => '<li>' + escape(action) + '</li>').join('') + '</ol><p>' + escape(step.expected) + '</p>' + (step.prompts ?? []).map(prompt => '<pre><code>' + escape(prompt.text) + '</code></pre>').join('');
    return { id: step.id, kind: step.kind, title: step.title, lead: step.purpose, html,
      instruction: { location: step.location, actions: step.actions, expected: step.expected, recovery: step.recovery }, prompts: step.prompts ?? [],
      sourcePath: ref?.sourcePath ?? '', sourceHeading: ref?.sourceHeading ?? '', sourceUrl: ref?.sourceUrl ?? '', sourceMediaIds: [],
      confirmation: step.id === 'self-check' ? 'checklist' : 'none', requiredForPractice: step.kind !== 'reading',
      checklist: step.id === 'self-check' ? definition.checks.map((label, index) => ({ id: 'tutorial-check-' + index, label })) : [],
    };
  };
  const overview = { id: 'intro', kind: 'reading', title: '这次要解决什么问题', purpose: definition.pain, location: '本页 · 任务说明',
    actions: ['本次目标：' + definition.goal, '完成后得到：' + definition.outcome], expected: '知道本次练习的输入和交付物，再进入材料准备。', recovery: '如果你正在处理其他问题，先返回场景列表，选择与自己手头任务对应的教程。' };
  const hasMaterials = definition.materials.length > 0;
  const preparation = { id: 'prepare', kind: 'action', title: lesson.track === 'scenario' ? '准备本次任务' : '准备本次练习材料', purpose: lesson.track === 'scenario' ? '准备一个独立工作区，并按需要在对话中提供任务信息。' : '先把工具和输入准备齐，再把 Prompt 交给 WorkBuddy。', location: hasMaterials ? '本页下载区 → 电脑文件管理器' : 'WorkBuddy 桌面端 → 新建任务 → 工作目录选择器',
    actions: [...definition.prerequisites, ...(definition.materials.length ? ['下载并解压练习包，将 workbuddy-practice 文件夹放到自己容易找到的位置。', ...definition.materials.map(item => item.path + '：' + item.description), '工作区选 workbuddy-practice；input 保留原件，生成文件保存到 output。', '生成文件使用默认 Agent 执行模式：在输入框左侧 + 菜单的模式设置中，关闭“仅问答”和“计划”即可返回默认模式。旧版界面对应做一做（Craft）；仅问答（Ask）只用于阅读问答。后续步骤另有指定时再切换。'] : ['本次无需下载文件；先准备下面步骤要用的任务信息。'])],
    expected: hasMaterials ? '在文件管理器中能打开列出的输入文件，并找到 output 文件夹。' : '工作区已准备好，需要的任务信息已填写在 Prompt 中或可在对话里补充。', recovery: hasMaterials ? '打不开压缩包时，可逐个下载下方文件，并按显示的 input 路径新建目录；不要只修改扩展名伪造 Word 或 Excel 文件。' : '如果信息不足，先补充本任务需要的条件；只提供完成任务必需的信息，不需要准备下载资料。' };
  const verify = { id: 'self-check', kind: 'verify', title: '检查结果并标记完成', purpose: '对照自己的产物检查本次目标是否达到，自检勾选可选。', location: 'WorkBuddy 结果区 / output 文件夹 → 本页', actions: definition.checks, expected: definition.outcome, recovery: '有一项对不上时，回到对应操作步骤，带着具体差异向 WorkBuddy 提问；只复制了 Prompt 不代表已经产生结果。' };
  const steps = [overview, preparation, ...definition.steps, verify].map(make);
  return { ...lesson, title: definition.title ?? lesson.title, pain: definition.pain, goal: definition.goal, outcome: definition.outcome,
    summary: definition.goal, prerequisites: definition.prerequisites,
    materials: definition.materials.map(item => ({ ...item, url: '/practice/files/' + item.path })),
    externalSources: [...new Map([...(lesson.externalSources ?? []), ...officialGuides.filter(item => !item.ids.length || item.ids.includes(lesson.id)).map(({ title, url }) => ({ title, url }))].map(item => [item.url, item])).values()],
    steps, status: 'published', stepCountLabel: `${steps.length} 步 · 含准备、Prompt 与结果检查`,
    contentVersion: createHash('sha256').update(JSON.stringify({ definition, refs: lesson.sourceRefs, revision: 1 })).digest('hex').slice(0, 12),
  };
}
