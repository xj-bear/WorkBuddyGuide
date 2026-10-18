// 函数会由 VitePress 同时序列化到浏览器；保持自包含，构建与查询使用同一分词。
export function chineseSearchTokens(text) {
  return (text.match(/[\p{Script=Han}]+|[A-Za-z0-9_]+/gu) || []).flatMap(word => {
    if (!/\p{Script=Han}/u.test(word)) return [word];
    const chars = Array.from(word);
    return [...chars, ...chars.slice(1).map((char, index) => chars[index] + char)];
  });
}

// VitePress 的虚拟动态页面没有实体 Markdown；为完整开放课程补充实际正文索引。
// 返回 undefined 让普通蓝皮书继续使用框架原生的分段索引。
export function learningSearchSections(file, content) {
  const normalized = file.replaceAll('\\', '/');
  const workMatch = normalized.match(/\/solve\/cases\/([a-z-]+)\/index\.md$/);
  const match = normalized.match(/\/learn\/(wb-(?:lesson-\d+|chapter-\d+|life-[a-z-]+))\/index\.md$/);
  if (!match && !workMatch) return undefined;
  const lesson = workMatch ? (content.workScenarioGuides ?? []).find(item => item.caseId === workMatch[1]) : [...(content.bluebookLessons ?? []), ...content.lessons, ...(content.scenarioGuides ?? [])].find(item => item.id === match[1]);
  if (!lesson || lesson.status !== 'published') return [];
  const text = [lesson.originalTitle, lesson.summary, ...lesson.steps.map(step => step.title + ' ' + step.html.replace(/<[^>]*>/g, ' ') + ' ' + (step.checklist ?? []).map(check => check.label).join(' '))].join(' ');
  return [{ titles: [lesson.track === 'bluebook' || lesson.track === 'scenario' || lesson.track === 'work-scenario' ? lesson.title : `第 ${String(lesson.number).padStart(2, '0')} 关 · ${lesson.title}`], text }];
}
