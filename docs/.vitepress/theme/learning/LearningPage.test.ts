import { mount } from '@vue/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ref } from 'vue';
import { createProgressStore } from '../../../../learning/progress';
import type { Lesson, WorkScenarioCase } from '../../../../learning/types';
import LearningPage from './LearningPage.vue';

const fixtures = vi.hoisted(() => ({ bluebookLessons: [] as Lesson[], bluebookReadings: [], lessons: [] as Lesson[], scenarioGuides: [] as Lesson[], workScenarioCases: [] as WorkScenarioCase[], categorySlug: 'office' }));
vi.mock('../../learning.data', () => ({ data: { ...fixtures, scenarios: [
  { id: 'office', title: '办公文档', workflow: { sourceLessonIds: [], prepare: [], steps: [], deliverable: [], verify: [] } },
  { id: 'automation', title: '自动化任务', workflow: { sourceLessonIds: [], prepare: [], steps: [], deliverable: [], verify: [] } },
  { id: 'life', title: '生活助手', workflow: { sourceLessonIds: [], prepare: [], steps: [], deliverable: [], verify: [] } },
] } }));
vi.mock('vitepress', () => ({ useData: () => ({ params: ref({ categorySlug: fixtures.categorySlug }) }), useRoute: () => ({}), useRouter: () => ({}) }));
let store: ReturnType<typeof createProgressStore>;
vi.mock('./useLearningProgress', () => ({ useLearningProgress: () => ({
  records: ref(store.records), storageMode: ref('temporary'), statusFor: store.statusFor,
}) }));

const lesson = (id: string, number: number, overrides: Partial<Lesson> = {}): Lesson => ({
  id, number, level: 'L0', title: id, originalTitle: id, kind: 'practice', categoryIds: ['office'],
  status: 'published', match: 'A', summary: '', sourceRefs: [], contentVersion: 'v1', reviewedAt: null,
  imageCount: 0, prerequisiteIds: [], nextLessonIds: [], steps: [{ id: 'one', title: '阅读', lead: '',
    html: '', sourcePath: '', sourceHeading: '', sourceUrl: '', sourceMediaIds: [],
    confirmation: 'self_confirm', requiredForPractice: true, checklist: [] }], ...overrides,
});

beforeEach(() => {
  fixtures.categorySlug = 'office';
  fixtures.lessons.splice(0, fixtures.lessons.length, lesson('first', 1), lesson('second', 2), lesson('preview', 3, { status: 'preview' }));
  fixtures.bluebookLessons.splice(0, fixtures.bluebookLessons.length,
    lesson('wb-chapter-01', 1, { title: '第 1 章 初识 WorkBuddy', track: 'bluebook' }),
    lesson('wb-chapter-02', 2, { title: '第 2 章 下载与安装', track: 'bluebook' }));
  fixtures.scenarioGuides.splice(0, fixtures.scenarioGuides.length, lesson('life', 1, { track: 'scenario', categoryIds: ['life'] }));
  fixtures.workScenarioCases.splice(0, fixtures.workScenarioCases.length,
    { id: 'weekly-report', preparation: '本周日志与周报格式。', title: '从工作日志生成周报', categoryIds: ['office', 'automation'], pain: '周五需要回顾一周工作。', outcome: '有来源的周报草稿。', url: '/solve/cases/weekly-report/', relatedLessonIds: [], relatedChapterPaths: [], images: [] },
    { id: 'sales-dashboard', preparation: '销售表副本与指标口径。', title: '销售表做看板', categoryIds: ['data'], pain: '销售表难以看清趋势。', outcome: '可核对的网页看板。', url: '/solve/cases/sales-dashboard/', relatedLessonIds: [], relatedChapterPaths: [], images: [] },
  );
  store = createProgressStore({ storage: () => undefined });
  store.completeLesson(fixtures.lessons[0]); store.completeLesson(fixtures.scenarioGuides[0]);
});

describe('统一完成标签与路线计数', () => {
  it('章节路线独立统计，已完成的旧场景练习不算成章节完成', () => {
    const wrapper = mount(LearningPage, { props: { view: 'roadmap' } });
    expect(wrapper.get('.learning-progress-stats article strong').text()).toBe('0 / 2');
    const badges = wrapper.findAll('.learning-stage__lessons .learning-card-badge').map(item => item.text());
    expect(badges).toEqual(['可开始', '可开始']);
    expect(wrapper.findAll('.learning-roadmap-card').map(card => card.attributes('href'))).toEqual([
      '/learn/wb-chapter-01/?from=learn', '/learn/wb-chapter-02/?from=learn',
    ]);
    expect(wrapper.get('.learning-stages').text()).not.toContain('first');
    wrapper.unmount();
  });
  it('工作场景课程使用相同的完成标签和场景返回参数', () => {
    const wrapper = mount(LearningPage, { props: { view: 'scenario' } });
    const card = wrapper.get('.learning-scenario-course-card');
    expect(card.get('.learning-card-badge').text()).toBe('已标记完成');
    expect(card.attributes('href')).toBe('/learn/first/?from=solve&category=office');
    wrapper.unmount();
  });
  it('读完章节只计入章节路线，场景配套练习保持原有状态', () => {
    store.completeLesson(fixtures.bluebookLessons[0]);
    const wrapper = mount(LearningPage, { props: { view: 'roadmap' } });
    expect(wrapper.get('.learning-progress-stats article strong').text()).toBe('1 / 2');
    expect(wrapper.findAll('.learning-stage__lessons .learning-card-badge')[0].text()).toBe('已标记完成');
    expect(store.statusFor(fixtures.lessons[0])).toBe('marked_complete');
    expect(store.statusFor(fixtures.lessons[1])).toBe('not_started');
    wrapper.unmount();
  });
  it('场景案例按分类展示独立详情，优先于已有基础教程', () => {
    const wrapper = mount(LearningPage, { props: { view: 'scenario' } });
    const cards = wrapper.findAll('.learning-work-case-card');
    expect(cards).toHaveLength(1);
    expect(cards[0].attributes('href')).toBe('/solve/cases/weekly-report/?from=solve&category=office');
    expect(cards[0].text()).toContain('有来源的周报草稿');
    expect(cards[0].text()).toContain('工作痛点：');
    expect(cards[0].text()).toContain('需要准备：本周日志与周报格式。');
    expect(cards[0].find('.learning-number').exists()).toBe(false);
    expect(wrapper.text()).not.toContain('销售表做看板');
    expect(wrapper.html().indexOf('learning-work-case-card')).toBeLessThan(wrapper.html().indexOf('learning-scenario-course-card'));
    expect(wrapper.text()).toContain('相关基础教程');
    expect(wrapper.text()).toContain('安装并完成第一个任务');
    wrapper.unmount();
  });
  it('新增场景案例不计入课程数量或学习进度', () => {
    const wrapper = mount(LearningPage, { props: { view: 'roadmap' } });
    expect(wrapper.get('.learning-progress-stats article strong').text()).toBe('0 / 2');
    expect(wrapper.find('.learning-work-case-card').exists()).toBe(false);
    wrapper.unmount();
  });
  it('同一方案从另一分类进入时仍使用唯一详情地址', () => {
    fixtures.categorySlug = 'automation';
    const wrapper = mount(LearningPage, { props: { view: 'scenario' } });
    expect(wrapper.findAll('.learning-work-case-card')).toHaveLength(1);
    expect(wrapper.get('.learning-work-case-card').attributes('href')).toBe('/solve/cases/weekly-report/?from=solve&category=automation');
    wrapper.unmount();
  });
  it('生活助手只展示原有生活指南，不混入工作案例或工作入门链接', () => {
    fixtures.categorySlug = 'life';
    const wrapper = mount(LearningPage, { props: { view: 'scenario' } });
    expect(wrapper.findAll('.learning-life-card')).toHaveLength(1);
    expect(wrapper.find('.learning-work-case-card').exists()).toBe(false);
    expect(wrapper.find('.learning-scenario-foundations').exists()).toBe(false);
    wrapper.unmount();
  });
});
