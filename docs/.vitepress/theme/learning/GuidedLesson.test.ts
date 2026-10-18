import { mount } from '@vue/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { nextTick, reactive, ref } from 'vue';
import { createProgressStore } from '../../../../learning/progress';
import type { Lesson, Scenario } from '../../../../learning/types';
import GuidedLesson from './GuidedLesson.vue';

let progress: any;
let store: ReturnType<typeof createProgressStore>;
const route = reactive({ path: '/learn/wb-lesson-02/' });
const router = { go: vi.fn(async (url: string) => { window.history.pushState({}, '', url); window.dispatchEvent(new Event('learning:route-change')); }) };
vi.mock('vitepress', () => ({ useRoute: () => route, useRouter: () => router }));
vi.mock('./useLearningProgress', () => ({ useLearningProgress: () => progress }));
const lesson = (specialId = 'self-check'): Lesson => ({
  id: 'wb-lesson-02', number: 2, level: 'L0', title: '演练任务', originalTitle: '演练任务',
  kind: 'practice', categoryIds: ['files', 'data'], status: 'published', match: 'A', summary: '',
  sourceRefs: [], contentVersion: 'v1', reviewedAt: '2026-10-17', imageCount: 0,
  prerequisiteIds: [], nextLessonIds: [], steps: [
    { id: 'first', title: '第一步', lead: '', html: '', sourcePath: '', sourceHeading: '', sourceUrl: '', sourceMediaIds: [], confirmation: 'self_confirm', requiredForPractice: true, checklist: [] },
    { id: specialId, title: '结果自检', lead: '', html: '', sourcePath: '', sourceHeading: '', sourceUrl: '', sourceMediaIds: [], confirmation: 'checklist', requiredForPractice: true, checklist: [{ id: 'check', label: '结果已核对' }] },
  ],
});
const scenarios: Scenario[] = [
  { id: 'files', title: '文件整理', description: '整理文件', icon: 'folder', workflow: { goal: '先看清目录内容，再安全整理副本。', prepare: ['准备练习副本'], steps: ['生成文件清单', '复核建议'], deliverable: ['文件清单'], verify: ['原文件没有被覆盖'], sourceLessonIds: [] } },
  { id: 'data', title: '数据分析', description: '分析表格', icon: 'chart', workflow: { goal: '先明确问题，再检查数据并解释结果。', prepare: ['保留原始文件'], steps: ['检查数据'], deliverable: ['汇总表'], verify: ['结果能回到源表核对'], sourceLessonIds: [] } },
  { id: 'life', title: '生活助手', description: '处理生活事务', icon: 'heart', workflow: { goal: '理清生活安排，事实由你核实，决定也由你来做。', prepare: ['准备相关资料'], steps: ['整理信息'], deliverable: ['一份准备清单'], verify: ['关键决定由本人确认'], sourceLessonIds: [] } },
];
beforeEach(() => {
  window.history.replaceState({}, '', '/learn/wb-lesson-02/?from=learn');
  store = createProgressStore({ storage: () => undefined }); store.initialize();
  const records = ref(store.records);
  const sync = (fn: (...args: any[]) => any) => (...args: any[]) => { const result = fn(...args); records.value = store.records; return result; };
  progress = { records, storageMode: ref('temporary'), initialize: () => {},
    visitStep: sync(store.visitStep), setChecklistItem: sync(store.setChecklistItem),
    completeLesson: sync(store.completeLesson), resetLesson: sync(store.resetLesson), statusFor: store.statusFor };
});
const wrappers: ReturnType<typeof mount>[] = [];
const open = (item = lesson(), lessons = [item]) => {
  const wrapper = mount(GuidedLesson, { props: { lesson: item, lessons, scenarios }, global: { stubs: { SourceBody: true } } });
  wrappers.push(wrapper); return wrapper;
};
afterEach(() => { wrappers.splice(0).forEach(wrapper => wrapper.unmount()); });
const lifeGuide = (): Lesson => ({
  ...lesson(), id: 'wb-life-trip-planning', number: 1, level: 'L1', track: 'scenario',
  title: '旅行规划：从一句需求到每天的行程', summary: '把自己的出行条件整理成每天能读懂的安排。', categoryIds: ['life'], pain: '攻略分散，路线不适合自己。', preparation: '出发地、目的地、日期、人数和预算。', outcome: '一份逐日行程表。',
});

describe('课程页面对抗回归', () => {
  it('工作案例使用同一分步界面，在案例地址切换并独立保存记录', async () => {
    const item = { ...lesson(), id: 'wb-work-batch-contracts', track: 'work-scenario', categoryIds: ['files', 'data'],
      pain: '批量合同容易填错客户信息。', preparation: '已审核的合同模板与客户名单。', outcome: '独立合同、邮件草稿与核对清单。' } as Lesson;
    window.history.replaceState({}, '', '/solve/cases/batch-contracts/?category=data');
    const wrapper = mount(GuidedLesson, { props: { lesson: item, lessons: [lesson()], scenarios, routeBase: '/solve/cases/batch-contracts/' }, global: { stubs: { SourceBody: true } } });
    wrappers.push(wrapper);
    await nextTick();
    expect(wrapper.get('.learning-lesson-heading .learning-eyebrow').text()).toBe('WORK / GUIDE');
    expect(wrapper.get('.learning-back').attributes('href')).toBe('/solve/data/');
    expect(wrapper.find('.learning-scenario-context').exists()).toBe(false);
    expect(wrapper.get('.learning-work-task-summary').text()).toContain('已审核的合同模板与客户名单。');
    expect(wrapper.get('.learning-work-task-summary').text()).toContain('批量合同容易填错客户信息。');
    expect(wrapper.get('.learning-source-aside').text()).not.toMatch(/公众号|连载|稿件/);
    await wrapper.get('.learning-step-controls button:last-child').trigger('click');
    expect(wrapper.get('.learning-step-heading h2').text()).toBe('结果自检');
    expect(window.location.pathname).toBe('/solve/cases/batch-contracts/');
    expect(window.location.search).toContain('step=self-check');
    expect(store.records[item.id].lastStepId).toBe('self-check');
    expect(store.records['wb-lesson-02']).toBeUndefined();
    await wrapper.get('.learning-step-controls .learning-button--primary').trigger('click');
    expect(wrapper.get('.learning-completion h1').text()).toBe('工作场景已标记完成');
    expect(wrapper.find('.learning-next').exists()).toBe(false);
  });
  it('同路径仅查询变化也同步步骤和返回场景', async () => {
    const wrapper = open();
    await router.go('/learn/wb-lesson-02/?from=solve&category=files&step=self-check');
    expect(wrapper.find('.learning-step-heading h2').text()).toBe('结果自检');
    expect(wrapper.find('.learning-back').attributes('href')).toBe('/solve/files/');
    expect(wrapper.get('.learning-scenario-context__title').text()).toContain('文件整理');
    expect(wrapper.get('.learning-scenario-context').text()).toContain('先看清目录内容，再安全整理副本。');
    expect(wrapper.get('.learning-scenario-context').text()).toContain('准备练习副本');
    expect(wrapper.get('.learning-scenario-context').text()).toContain('原文件没有被覆盖');
    expect(wrapper.get('.learning-scenario-context__link').attributes('href')).toBe('/solve/files/');
    expect(wrapper.get('.learning-step-context__label').text()).toBe('本步说明');
    await router.go('/learn/wb-lesson-02/?from=solve&category=data&step=first');
    expect(wrapper.find('.learning-step-heading h2').text()).toBe('第一步');
    expect(wrapper.find('.learning-back').attributes('href')).toBe('/solve/data/');
    expect(wrapper.get('.learning-scenario-context__title').text()).toContain('数据分析');
    await router.go('/learn/wb-lesson-02/?from=learn&step=first');
    expect(wrapper.find('.learning-scenario-context').exists()).toBe(false);
  });
  it.each(['constructor', '__proto__', 'toString'])('自检步骤名 %s 不读取原型属性', async id => {
    window.history.replaceState({}, '', '/learn/wb-lesson-02/?step=' + id);
    const wrapper = open(lesson(id)); await nextTick();
    expect(wrapper.find('input[type=checkbox]').exists()).toBe(true);
    expect((wrapper.find('input').element as HTMLInputElement).checked).toBe(false);
    await wrapper.find('input').setValue(true);
    expect(store.records['wb-lesson-02'].checklist[id]).toEqual(['check']);
  });
  it('尝鲜步骤自由切换，仅记录位置，不开放完成按钮', async () => {
    const item = lesson(); item.status = 'preview';
    item.steps.forEach(step => { step.confirmation = 'read_ack'; });
    const wrapper = open(item); await nextTick();
    expect(wrapper.find('.learning-confirm').exists()).toBe(false);
    const next = wrapper.findAll('.learning-step-controls button').find(button => button.text() === '下一步 →')!;
    await next.trigger('click'); await nextTick();
    expect(wrapper.get('.learning-step-heading h2').text()).toBe('结果自检');
    expect(store.records[item.id].lastStepId).toBe('self-check');
    expect(store.records[item.id].confirmedStepIds).toEqual([]);
    expect(wrapper.find('.learning-step-controls .learning-button--primary').exists()).toBe(false);
    expect(wrapper.find('.learning-completion').exists()).toBe(false);
    expect(store.statusFor(item)).toBe('in_progress');
  });
  it('切换下一步不强制滚动页面，保持当前阅读位置', async () => {
    const scrollIntoView = vi.fn();
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', { configurable: true, value: scrollIntoView });
    const wrapper = open(); await nextTick();
    document.body.appendChild(wrapper.element);
    const routerCalls = router.go.mock.calls.length;
    const scrollBefore = window.scrollY;
    await wrapper.get('.learning-step-controls button:last-child').trigger('click');
    expect(wrapper.get('.learning-step-heading h2').text()).toBe('结果自检');
    expect(scrollIntoView).not.toHaveBeenCalled();
    expect(router.go).toHaveBeenCalledTimes(routerCalls);
    expect(new URLSearchParams(window.location.search).get('step')).toBe('self-check');
    expect(window.history.state.scrollPosition).toBe(scrollBefore);
    expect(document.activeElement).toBe(wrapper.get('.learning-step-heading h2').element);
  });
  it.each(['concept', 'practice', 'challenge'] as const)('%s 普通步骤只有导航，不需要逐步确认', async kind => {
    const item = lesson(); item.kind = kind;
    const wrapper = open(item); await nextTick();
    expect(wrapper.find('.learning-confirm').exists()).toBe(false);
    expect(wrapper.find('.learning-confirmed').exists()).toBe(false);
    expect(wrapper.findAll('.learning-step-controls button').map(button => button.text())).toEqual(['← 上一步', '下一步 →']);
    expect(wrapper.get('.learning-step-nav').text()).not.toContain('✓');
    expect(store.statusFor(item)).toBe('in_progress');
    expect(store.records[item.id].confirmedStepIds).toEqual([]);
  });
  it('未勾自检也可直接从末步标记完成，不输出虚假确认', async () => {
    window.history.replaceState({}, '', '/learn/wb-lesson-02/?step=self-check');
    const wrapper = open(); await nextTick();
    expect(wrapper.get('.learning-checklist legend').text()).toBe('自检清单（可选）');
    expect(wrapper.find('.learning-confirm').exists()).toBe(false);
    const buttons = wrapper.findAll('.learning-step-controls .learning-button--primary');
    expect(buttons).toHaveLength(1); expect(buttons[0].text()).toBe('标记完成');
    await buttons[0].trigger('click'); await nextTick();
    expect(wrapper.get('.learning-completion h1').text()).toContain('标记');
    expect(wrapper.get('.learning-completion').text()).not.toContain('结果已核对');
    expect(wrapper.get('.learning-completion').text()).not.toContain('操作与自检已完成');
    expect(wrapper.get('.learning-completion').text()).toContain('本次未勾选自检项');
    expect(wrapper.get('.learning-artwork--celebrate img').attributes('src')).toBe('/images/workbuddy-celebrate.png');
    expect(store.statusFor(lesson())).toBe('marked_complete');
  });
  it('全部勾选只保存，不自动跳转或完成', async () => {
    window.history.replaceState({}, '', '/learn/wb-lesson-02/?step=self-check');
    const wrapper = open(); await nextTick();
    await wrapper.get('input[type=checkbox]').setValue(true);
    expect(store.records['wb-lesson-02'].checklist['self-check']).toEqual(['check']);
    expect(wrapper.get('.learning-step-heading h2').text()).toBe('结果自检');
    expect(wrapper.find('.learning-completion').exists()).toBe(false);
    expect(store.statusFor(lesson())).toBe('in_progress');
  });
  it('完成页只展示实际勾选项目，保留下一关的场景上下文', async () => {
    const item = lesson(); item.steps[1].checklist.push({ id: 'other', label: '未勾选的检查项' });
    const next = { ...lesson(), id: 'wb-lesson-03', number: 3, title: '下一项任务' };
    window.history.replaceState({}, '', '/learn/wb-lesson-02/?from=solve&category=files&step=self-check');
    const wrapper = open(item, [item, next]); await nextTick();
    await wrapper.findAll('input[type=checkbox]')[0].setValue(true);
    await wrapper.get('.learning-step-controls .learning-button--primary').trigger('click'); await nextTick();
    expect(wrapper.find('.learning-lesson-heading').exists()).toBe(false);
    expect(wrapper.get('.learning-completion__topics').text()).toContain('已勾选的自检项');
    expect(wrapper.get('.learning-completion__topics').text()).toContain('结果已核对');
    expect(wrapper.get('.learning-completion__topics').text()).not.toContain('未勾选的检查项');
    expect(wrapper.get('.learning-completion__continue').attributes('href')).toBe('/learn/wb-lesson-03/?from=solve&category=files');
    expect(wrapper.get('.learning-completion-breadcrumb').text()).toContain('演练任务');
  });
  it('完成后回看或取消自检不会撤销标记，也不把步骤变成已确认', async () => {
    window.history.replaceState({}, '', '/learn/wb-lesson-02/?step=self-check');
    const item = lesson(); const wrapper = open(item); await nextTick();
    await wrapper.get('input[type=checkbox]').setValue(true);
    await wrapper.get('.learning-step-controls .learning-button--primary').trigger('click'); await nextTick();
    const completedAt = store.records[item.id].completedAt;
    await wrapper.findAll('button').find(button => button.text() === '重新查看内容')!.trigger('click'); await nextTick();
    await router.go('/learn/wb-lesson-02/?step=self-check'); await nextTick();
    await wrapper.get('input[type=checkbox]').setValue(false);
    expect(store.statusFor(item)).toBe('marked_complete');
    expect(store.records[item.id].completedAt).toBe(completedAt);
    expect(wrapper.get('.learning-step-nav').text()).not.toContain('✓');
  });
  it('版本更新仍阻止覆盖旧记录，提示重新学习', async () => {
    const item = lesson(); store.completeLesson(item); progress.records.value = store.records;
    window.history.replaceState({}, '', '/learn/wb-lesson-02/?step=self-check');
    const wrapper = open({ ...item, contentVersion: 'v2' }); await nextTick();
    expect(wrapper.get('.learning-step-controls .learning-button--primary').attributes('disabled')).toBeDefined();
    expect(wrapper.text()).toContain('本关内容有更新');
    expect(store.records[item.id].contentVersion).toBe('v1');
  });
  it('版本变化且检查项 ID 相同时，不把旧勾选映射成新文案', async () => {
    const item = lesson(); store.setChecklistItem(item, 'self-check', 'check', true);
    store.completeLesson(item); progress.records.value = store.records;
    const previous = JSON.stringify(store.records[item.id]);
    const revised = lesson(); revised.contentVersion = 'v2';
    revised.steps[1].checklist[0].label = '新版独有检查项目';
    const wrapper = open(revised); await nextTick();
    expect(wrapper.find('.learning-completion').exists()).toBe(false);
    expect(wrapper.get('.learning-step-heading h2').text()).toBe('第一步');
    expect(store.statusFor(revised)).toBe('marked_complete');
    expect(JSON.stringify(store.records[item.id])).toBe(previous);
    await router.go('/learn/wb-lesson-02/?step=self-check'); await nextTick();
    expect((wrapper.get('input[type=checkbox]').element as HTMLInputElement).checked).toBe(false);
    expect(wrapper.get('.learning-checklist').attributes('disabled')).toBeDefined();
  });
  it('跨课程后退不污染离开课程的断点', async () => {
    const item = lesson(); const wrapper = open(item); await nextTick();
    expect(store.records[item.id].lastStepId).toBe('first');
    window.history.pushState({}, '', '/learn/wb-lesson-09/?step=self-check');
    window.dispatchEvent(new PopStateEvent('popstate')); await nextTick();
    expect(store.records[item.id].lastStepId).toBe('first');
  });
  it('生活指南使用独立轨道标识并返回生活助手分类', async () => {
    const item = lifeGuide();
    window.history.replaceState({}, '', `/learn/${item.id}/?from=solve&category=life`);
    expect(window.location.pathname).toBe(`/learn/${item.id}/`);
    expect(window.location.search).toContain('category=life');
    const wrapper = open(item); await nextTick();
    expect(wrapper.find('.learning-lesson-heading .learning-eyebrow').text()).toBe('LIFE / GUIDE');
    expect(wrapper.find('.learning-back').attributes('href')).toBe('/solve/life/');
    expect(wrapper.find('.learning-scenario-context').exists()).toBe(false);
    expect(wrapper.get('.learning-work-task-summary').text()).toContain('出发地、目的地、日期、人数和预算。');
    expect(wrapper.get('.learning-work-task-summary').text()).toContain('攻略分散，路线不适合自己。');
  });
  it('生活指南也能不勾选直接标记，返回生活助手且不跨到课程下一关', async () => {
    const item = lifeGuide(); const course = { ...lesson(), id: 'wb-lesson-02', number: 2, title: '课程第二关' };
    window.history.replaceState({}, '', `/learn/${item.id}/?from=solve&category=life&step=self-check`);
    const wrapper = open(item, [item, course]); await nextTick();
    expect(wrapper.find('.learning-confirm').exists()).toBe(false);
    await wrapper.get('.learning-step-controls .learning-button--primary').trigger('click'); await nextTick();
    expect(wrapper.get('.learning-completion h1').text()).toBe('生活指南已标记完成');
    expect(wrapper.find('.learning-next').exists()).toBe(false);
    expect(wrapper.find('.learning-completion__continue').exists()).toBe(false);
    expect(wrapper.get('.learning-completion .learning-actions a').attributes('href')).toBe('/solve/life/');
    expect(store.statusFor(course)).toBe('not_started');
  });
  it('非法步骤和分类回退到真实入口', () => {
    window.history.replaceState({}, '', '/learn/wb-lesson-02/?from=solve&category=../unknown&step=fake');
    const wrapper = open();
    expect(wrapper.find('.learning-step-heading h2').text()).toBe('第一步');
    expect(wrapper.find('.learning-back').attributes('href')).toBe('/learn/');
    expect(wrapper.find('.learning-scenario-context').exists()).toBe(false);
  });
  it('场景推荐跳过不属于当前场景的课程', async () => {
    const item = lesson();
    const unrelated = { ...lesson(), id: 'wb-lesson-03', number: 3, categoryIds: ['office'] as const as any };
    const related = { ...lesson(), id: 'wb-lesson-06', number: 6 };
    item.nextLessonIds = [unrelated.id];
    window.history.replaceState({}, '', '/learn/wb-lesson-02/?from=solve&category=files&step=self-check');
    const wrapper = open(item, [item, unrelated, related]); await nextTick();
    await wrapper.get('.learning-step-controls .learning-button--primary').trigger('click');
    expect(wrapper.get('.learning-completion__continue').attributes('href')).toBe('/learn/wb-lesson-06/?from=solve&category=files');
  });
  it('新版历史断点回到任务说明，保留旧完成标记', async () => {
    const old = lesson(); store.visitStep(old, 'self-check'); store.completeLesson(old); progress.records.value = store.records;
    const revised = lesson(); revised.contentVersion = 'tutorial-v2'; revised.steps[0].id = 'intro'; revised.steps[0].title = '这次要解决什么问题';
    const previous = JSON.stringify(store.records[old.id]);
    const wrapper = open(revised); await nextTick();
    expect(wrapper.get('.learning-step-heading h2').text()).toBe('这次要解决什么问题');
    expect(wrapper.find('.learning-completion').exists()).toBe(false);
    expect(JSON.stringify(store.records[old.id])).toBe(previous);
    expect(store.statusFor(revised)).toBe('marked_complete');
  });
});
