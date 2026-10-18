import { describe, expect, it } from 'vitest';
import { chineseSearchTokens, learningSearchSections } from './search.mjs';
const content = { lessons: [
  { id: 'wb-lesson-02', number: 2, title: '安装与演练目录', originalTitle: '第一份清单', summary: '生成文件清单', status: 'published', steps: [{ title: '任务', html: '<p>保留原文件</p>' }] },
  { id: 'wb-lesson-08', status: 'preview' }, { id: 'wb-lesson-10', status: 'planned' },
] };
describe('学习课程搜索索引', () => {
  it('中文连续短语的构建和查询分词一致', () => {
    const source = chineseSearchTokens('并在演练目录生成清单 WorkBuddy');
    expect(chineseSearchTokens('演练目录').every(token => source.includes(token))).toBe(true);
    expect(source).toContain('WorkBuddy');
    expect(source).toContain('演练');
  });
  it('完整课程按真实标题和正文进入索引', () => {
    const sections = learningSearchSections('/docs/learn/wb-lesson-02/index.md', content)!;
    expect(sections[0].titles[0]).toContain('安装与演练目录');
    expect(sections[0].text).toContain('保留原文件');
    expect(sections[0].text).not.toContain('<p>');
  });
  it.each(['08', '10'])('未完整开放的 %s 不进入索引', number => {
    expect(learningSearchSections(`/docs/learn/wb-lesson-${number}/index.md`, content)).toEqual([]);
  });
  it('原文章节仍交给原生索引', () => {
    expect(learningSearchSections('/docs/bluebook/index.md', content)).toBeUndefined();
  });
  it('分步工作案例仍索引真实内容与自检，不被标成课程关卡', () => {
    const workContent = { ...content, workScenarioGuides: [{ caseId: 'batch-contracts', title: '批量合同', originalTitle: '合同', summary: '客户数据', track: 'work-scenario', status: 'published', steps: [{ title: '核对', html: '<p>不覆盖模板</p>', checklist: [{ label: '客户编号准确' }] }] }] };
    const sections = learningSearchSections('/docs/solve/cases/batch-contracts/index.md', workContent)!;
    expect(sections[0].titles).toEqual(['批量合同']);
    expect(sections[0].text).toContain('不覆盖模板');
    expect(sections[0].text).toContain('客户编号准确');
  });
});
