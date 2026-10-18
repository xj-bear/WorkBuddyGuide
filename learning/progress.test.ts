import { describe, expect, it } from 'vitest';
import { createProgressStore, PROGRESS_STORAGE_KEY } from './progress';
import type { GuidedStep, Lesson } from './types';

const step = (id: string, overrides: Partial<GuidedStep> = {}): GuidedStep => ({
  id, title: id, lead: '', html: '', sourcePath: '', sourceHeading: '', sourceUrl: '', sourceMediaIds: [],
  confirmation: 'self_confirm', requiredForPractice: true, checklist: [], ...overrides,
});
const lesson = (overrides: Partial<Lesson> = {}): Lesson => ({
  id: 'lesson-1', number: 1, level: 'L0', title: 'Lesson', originalTitle: '', kind: 'practice',
  categoryIds: [], status: 'published', match: 'A', summary: '', sourceRefs: [],
  steps: [step('first'), step('second', { checklist: [{ id: 'result', label: '检查结果' }] })],
  contentVersion: 'version-1', reviewedAt: null, imageCount: 0, prerequisiteIds: [], nextLessonIds: [], ...overrides,
});
function memoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => { data.set(key, value); },
    removeItem: (key: string) => { data.delete(key); },
  };
}
function ready() {
  const storage = memoryStorage();
  return { storage, store: createProgressStore({ storage: () => storage }) };
}

describe('轻量学习完成标记', () => {
  it.each(['concept', 'practice', 'challenge'] as const)('%s 允许不逐步确认和不勾自检时主动标记完成', kind => {
    const { store } = ready(); const item = lesson({ kind });
    expect(store.completeLesson(item)).toEqual({ ok: true, missing: [] });
    expect(store.statusFor(item)).toBe('marked_complete');
    expect(store.records[item.id].markedComplete).toBe(true);
    expect(store.records[item.id].confirmedStepIds).toEqual([]);
    expect(store.records[item.id].readComplete).toBe(false);
    expect(store.records[item.id].practiceSelfConfirmed).toBe(false);
    expect(store.records[item.id].checklist).toEqual({});
  });
  it('浏览、跳步和勾选仅保存位置与清单，不自动完成', () => {
    const { store } = ready(); const item = lesson();
    store.visitStep(item, 'second');
    expect(store.records[item.id].lastStepId).toBe('second');
    expect(store.statusFor(item)).toBe('in_progress');
    store.setChecklistItem(item, 'second', 'result', true);
    expect(store.statusFor(item)).toBe('in_progress');
    expect(store.records[item.id].confirmedStepIds).toEqual([]);
    expect(store.records[item.id].completedAt).toBeUndefined();
  });
  it.each(['constructor', '__proto__', 'toString'])('步骤 ID %s 不读取或修改字典原型', stepId => {
    const { storage, store } = ready();
    const item = lesson({ steps: [step(stepId, { checklist: [{ id: 'result', label: '检查结果' }] })] });
    store.setChecklistItem(item, stepId, 'result', true);
    expect(store.records[item.id].checklist[stepId]).toEqual(['result']);
    expect(store.completeLesson(item).ok).toBe(true);
    const reloaded = createProgressStore({ storage: () => storage }); reloaded.initialize();
    expect(reloaded.records[item.id].checklist[stepId]).toEqual(['result']);
    reloaded.setChecklistItem(item, stepId, 'result', false);
    expect(reloaded.records[item.id].checklist[stepId]).toEqual([]);
    expect(reloaded.statusFor(item)).toBe('marked_complete');
    expect(Object.prototype).not.toHaveProperty('result');
  });
  it('外部更改快照不影响实际进度和完成标记', () => {
    const { store } = ready(); const item = lesson(); store.visitStep(item, 'first');
    const snapshot = store.records;
    snapshot[item.id].markedComplete = true;
    snapshot[item.id].confirmedStepIds.push('first');
    snapshot[item.id].checklist.second = ['result'];
    snapshot[item.id].contentVersion = 'tampered'; snapshot.extra = { ...snapshot[item.id] };
    expect(store.records[item.id].confirmedStepIds).toEqual([]);
    expect(store.records[item.id].checklist).toEqual({});
    expect(store.records[item.id].contentVersion).toBe(item.contentVersion);
    expect(store.records).not.toHaveProperty('extra');
    expect(store.statusFor(item)).toBe('in_progress');
    expect(store.completeLesson(item).ok).toBe(true);
  });
  it('取消自检或回看不撤销完成，重复标记不改完成时间', () => {
    const storage = memoryStorage(); let ticks = 0;
    const store = createProgressStore({ storage: () => storage, now: () => String(++ticks) });
    const item = lesson(); store.completeLesson(item);
    const completedAt = store.records[item.id].completedAt;
    store.setChecklistItem(item, 'second', 'result', true);
    store.setChecklistItem(item, 'second', 'result', false);
    store.visitStep(item, 'first'); store.completeLesson(item);
    expect(store.records[item.id].completedAt).toBe(completedAt);
    expect(store.statusFor(item)).toBe('marked_complete');
    const reloaded = createProgressStore({ storage: () => storage }); reloaded.initialize();
    expect(reloaded.statusFor(item)).toBe('marked_complete');
    expect(reloaded.records[item.id].completedAt).toBe(completedAt);
  });
  it('非法步骤或检查项不产生记录', () => {
    const { store } = ready(); const item = lesson();
    store.visitStep(item, 'unknown');
    store.setChecklistItem(item, 'second', 'unknown', true);
    expect(store.records).toEqual({});
  });
  it.each(['preview', 'planned', 'archived'] as const)('%s 不能标记完成', status => {
    const { store } = ready(); const item = lesson({ status }); store.visitStep(item, 'first');
    expect(store.completeLesson(item)).toEqual({ ok: false, missing: ['not_published'] });
    expect(store.records[item.id].markedComplete).not.toBe(true);
    expect(store.statusFor(item)).toBe('in_progress');
  });
  it('没有步骤的内容不能完成', () => {
    const { store } = ready(); const item = lesson({ steps: [] });
    expect(store.completeLesson(item)).toEqual({ ok: false, missing: ['no_steps'] });
    expect(store.statusFor(item)).not.toBe('marked_complete');
  });
  it.each(['readComplete', 'practiceSelfConfirmed'] as const)('旧 %s 完成记录继续有效且不被改写', flag => {
    const { storage, store } = ready(); const item = lesson(); store.visitStep(item, 'second');
    const old = store.records[item.id]; old[flag] = true; old.confirmedStepIds = ['first'];
    old.completedAt = '2026-10-16T12:00:00Z';
    storage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify({ schemaVersion: 1, lessons: { [item.id]: old } }));
    const raw = storage.getItem(PROGRESS_STORAGE_KEY);
    const reloaded = createProgressStore({ storage: () => storage }); reloaded.initialize();
    expect(reloaded.statusFor(item)).toBe('marked_complete');
    expect(reloaded.records[item.id]).toEqual(old);
    expect(storage.getItem(PROGRESS_STORAGE_KEY)).toBe(raw);
    expect(reloaded.completeLesson(item).ok).toBe(true);
    expect(reloaded.records[item.id].completedAt).toBe(old.completedAt);
    expect(reloaded.records[item.id].lastStepId).toBe('second');
    expect(reloaded.records[item.id].confirmedStepIds).toEqual(['first']);
  });
  it('旧步骤确认不会被误认为整项完成', () => {
    const { storage, store } = ready(); const item = lesson(); store.visitStep(item, 'first');
    const old = store.records[item.id]; old.confirmedStepIds = ['first', 'second'];
    storage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify({ schemaVersion: 1, lessons: { [item.id]: old } }));
    const reloaded = createProgressStore({ storage: () => storage }); reloaded.initialize();
    expect(reloaded.statusFor(item)).toBe('in_progress');
  });
  it('版本变更保留历史完成，显式重置后开始新版本', () => {
    const { store } = ready(); const item = lesson(); store.completeLesson(item);
    const previous = JSON.stringify(store.records[item.id]);
    const revised = { ...item, contentVersion: 'version-2' }; store.visitStep(revised, 'first');
    expect(store.completeLesson(revised).missing).toEqual(['content_version_changed']);
    expect(store.statusFor(revised)).toBe('marked_complete');
    expect(JSON.stringify(store.records[item.id])).toBe(previous);
    store.resetLesson(item.id); expect(store.statusFor(revised)).toBe('not_started');
    store.visitStep(revised, 'first'); expect(store.records[item.id].contentVersion).toBe('version-2');
  });
});

describe('学习进度存储降级与清除', () => {
  it('按独立存储规格恢复 lessons 数据，后续写出保持 schemaVersion 和 lessons 契约', () => {
    const fixture = {
      schemaVersion: 1,
      lessons: {
        'lesson-1': {
          contentVersion: 'version-1', lastStepId: 'first', readComplete: false,
          practiceSelfConfirmed: false, confirmedStepIds: ['first'], checklist: {},
          updatedAt: '2026-10-17T00:00:00.000Z',
        },
      },
    };
    const storage = memoryStorage({ [PROGRESS_STORAGE_KEY]: JSON.stringify(fixture) });
    const store = createProgressStore({ storage: () => storage });
    store.initialize();
    expect(store.storageMode).toBe('persistent');
    expect(store.records['lesson-1']).toEqual(fixture.lessons['lesson-1']);
    store.visitStep(lesson(), 'second');
    const written = JSON.parse(storage.getItem(PROGRESS_STORAGE_KEY)!);
    expect(Object.keys(written).sort()).toEqual(['lessons', 'schemaVersion']);
    expect(written.schemaVersion).toBe(1);
    expect(written.lessons['lesson-1'].confirmedStepIds).toEqual(['first']);
    expect(written.lessons['lesson-1'].lastStepId).toBe('second');
    expect(written).not.toHaveProperty('records');
  });
  it('支持持久化读取，初始化幂等', () => {
    const { storage, store } = ready();
    const item = lesson();
    store.visitStep(item, 'first');
    const reloaded = createProgressStore({ storage: () => storage });
    reloaded.initialize();
    expect(reloaded.records[item.id].lastStepId).toBe('first');
    reloaded.initialize();
    expect(reloaded.storageMode).toBe('persistent');
  });
  it.each(['{broken', JSON.stringify({ schemaVersion: 99, lessons: {} }), JSON.stringify({ schemaVersion: 1, lessons: { a: {} } })])(
    '损坏或未知存储保持原文且仅在内存中继续：%s', raw => {
      const storage = memoryStorage({ [PROGRESS_STORAGE_KEY]: raw });
      const store = createProgressStore({ storage: () => storage });
      store.visitStep(lesson(), 'first');
      expect(store.storageMode).toBe('temporary');
      expect(store.records['lesson-1'].lastStepId).toBe('first');
      store.resetAll();
      expect(storage.getItem(PROGRESS_STORAGE_KEY)).toBe(raw);
    },
  );
  it('新完成字段类型非法时保留原始存储并降级', () => {
    const valid = ready(); const item = lesson(); valid.store.visitStep(item, 'first');
    const record = { ...valid.store.records[item.id], markedComplete: 'true' };
    const raw = JSON.stringify({ schemaVersion: 1, lessons: { [item.id]: record } });
    const storage = memoryStorage({ [PROGRESS_STORAGE_KEY]: raw });
    const store = createProgressStore({ storage: () => storage }); store.initialize();
    expect(store.storageMode).toBe('temporary');
    expect(store.records).toEqual({});
    expect(storage.getItem(PROGRESS_STORAGE_KEY)).toBe(raw);
  });
  it('禁用存储和配额失败保留本次会话进度', () => {
    const denied = createProgressStore({ storage: () => { throw new Error('denied'); } });
    denied.visitStep(lesson(), 'first');
    expect(denied.storageMode).toBe('temporary');
    expect(denied.records['lesson-1'].lastStepId).toBe('first');
    const storage = memoryStorage();
    storage.setItem = () => { throw new Error('quota'); };
    const quota = createProgressStore({ storage: () => storage });
    quota.visitStep(lesson(), 'first');
    expect(quota.storageMode).toBe('temporary');
    expect(quota.records['lesson-1'].lastStepId).toBe('first');
  });
  it('重置单关保留其他关，全部重置保留无关存储', () => {
    const { storage, store } = ready();
    storage.setItem('unrelated-preferences', 'keep');
    store.visitStep(lesson(), 'first');
    store.visitStep(lesson({ id: 'lesson-2' }), 'first');
    store.resetLesson('lesson-1');
    expect(Object.keys(store.records)).toEqual(['lesson-2']);
    expect(JSON.parse(storage.getItem(PROGRESS_STORAGE_KEY)!).lessons['lesson-2']).toBeDefined();
    store.resetAll();
    expect(store.records).toEqual({});
    expect(storage.getItem(PROGRESS_STORAGE_KEY)).toBeNull();
    expect(storage.getItem('unrelated-preferences')).toBe('keep');
  });
  it('存储获取延迟至初始化，不访问 SSR 全局', () => {
    let accessed = 0;
    const store = createProgressStore({ storage: () => { accessed++; return undefined; } });
    expect(accessed).toBe(0);
    expect(store.statusFor(lesson())).toBe('not_started');
    store.initialize();
    expect(accessed).toBe(1);
    expect(store.storageMode).toBe('temporary');
  });
});
