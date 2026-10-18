import type { Lesson } from './types';

export const PROGRESS_STORAGE_KEY = 'workbuddy-learning-progress:v1';
export interface ProgressRecord {
  contentVersion: string;
  lastStepId: string | null;
  readComplete: boolean;
  practiceSelfConfirmed: boolean;
  markedComplete?: boolean;
  confirmedStepIds: string[];
  checklist: Record<string, string[]>;
  updatedAt: string;
  completedAt?: string;
}
export type ProgressStatus = 'not_started' | 'in_progress' | 'marked_complete';
export type StorageMode = 'persistent' | 'temporary';
type Storage = Pick<globalThis.Storage, 'getItem' | 'setItem' | 'removeItem'>;
type Records = Record<string, ProgressRecord>;

function isObject(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}
function isStrings(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(item => typeof item === 'string');
}
function isRecord(value: unknown): value is ProgressRecord {
  return isObject(value) && typeof value.contentVersion === 'string'
    && (value.lastStepId === null || typeof value.lastStepId === 'string')
    && typeof value.readComplete === 'boolean' && typeof value.practiceSelfConfirmed === 'boolean'
    && (value.markedComplete === undefined || typeof value.markedComplete === 'boolean')
    && isStrings(value.confirmedStepIds) && isObject(value.checklist)
    && Object.values(value.checklist).every(isStrings) && typeof value.updatedAt === 'string'
    && (value.completedAt === undefined || typeof value.completedAt === 'string');
}

function checkedItems(record: ProgressRecord, stepId: string): string[] {
  return Object.hasOwn(record.checklist, stepId) ? record.checklist[stepId] : [];
}

/** 浏览器存储仅在 initialize 中获取；SSR 导入和构建均不会访问 window。 */
export function createProgressStore(options: { storage?: () => Storage | undefined; now?: () => string } = {}) {
  let records: Records = {};
  let storageMode: StorageMode = 'temporary';
  let storage: Storage | undefined;
  let initialized = false;
  const now = options.now ?? (() => new Date().toISOString());

  function initialize() {
    if (initialized) return;
    initialized = true;
    try {
      storage = options.storage ? options.storage() : typeof window === 'undefined' ? undefined : window.localStorage;
      if (!storage) return;
      const raw = storage.getItem(PROGRESS_STORAGE_KEY);
      if (raw !== null) {
        const data: unknown = JSON.parse(raw);
        if (!isObject(data) || data.schemaVersion !== 1 || !isObject(data.lessons)
          || !Object.values(data.lessons).every(isRecord)) throw new Error('Unsupported progress data');
        records = data.lessons as Records;
      }
      storageMode = 'persistent';
    } catch {
      // 未知版本或损坏记录保留原样，当前会话使用内存。
      storage = undefined;
      storageMode = 'temporary';
    }
  }
  function save() {
    if (!storage) return;
    try {
      storage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify({ schemaVersion: 1, lessons: records }));
    } catch {
      storage = undefined;
      storageMode = 'temporary';
    }
  }
  function editable(lesson: Lesson): ProgressRecord | undefined {
    initialize();
    if (Object.hasOwn(records, lesson.id)) {
      const existing = records[lesson.id];
      return existing.contentVersion === lesson.contentVersion ? existing : undefined;
    }
    const record: ProgressRecord = {
      contentVersion: lesson.contentVersion, lastStepId: null,
      readComplete: false, practiceSelfConfirmed: false,
      confirmedStepIds: [], checklist: {}, updatedAt: now(),
    };
    records = { ...records, [lesson.id]: record };
    return record;
  }
  function update(record: ProgressRecord) { record.updatedAt = now(); save(); }
  function visitStep(lesson: Lesson, stepId: string) {
    if (!lesson.steps.some(step => step.id === stepId)) return;
    const record = editable(lesson);
    if (record) { record.lastStepId = stepId; update(record); }
  }
  function setChecklistItem(lesson: Lesson, stepId: string, itemId: string, checked: boolean) {
    const step = lesson.steps.find(step => step.id === stepId);
    if (!step?.checklist.some(item => item.id === itemId)) return;
    const record = editable(lesson);
    if (!record) return;
    const items = checkedItems(record, stepId);
    // 计算属性创建自有字段，避免 __proto__ 赋值触发原型 setter。
    record.checklist = { ...record.checklist,
      [stepId]: checked ? [...new Set([...items, itemId])] : items.filter(id => id !== itemId),
    };
    update(record);
  }
  function completeLesson(lesson: Lesson): { ok: boolean; missing: string[] } {
    initialize();
    if (lesson.status !== 'published') return { ok: false, missing: ['not_published'] };
    if (lesson.steps.length === 0) return { ok: false, missing: ['no_steps'] };
    const record = editable(lesson);
    if (!record) return { ok: false, missing: ['content_version_changed'] };
    record.markedComplete = true;
    record.completedAt ??= now();
    update(record);
    return { ok: true, missing: [] };
  }
  function resetLesson(id: string) {
    initialize();
    records = Object.fromEntries(Object.entries(records).filter(([lessonId]) => lessonId !== id));
    save();
  }
  function resetAll() {
    initialize();
    records = {};
    if (storage) {
      try { storage.removeItem(PROGRESS_STORAGE_KEY); }
      catch { storage = undefined; storageMode = 'temporary'; }
    }
  }
  function statusFor(lesson: Lesson): ProgressStatus {
    const record = Object.hasOwn(records, lesson.id) ? records[lesson.id] : undefined;
    if (!record) return 'not_started';
    if (lesson.status !== 'published') return 'in_progress';
    // 旧完成字段仅用于兼容，不将步骤确认或自检勾选解释为整项完成。
    if (record.markedComplete || record.readComplete || record.practiceSelfConfirmed) return 'marked_complete';
    return 'in_progress';
  }
  return {
    get records() { return structuredClone(records); }, get storageMode() { return storageMode; },
    initialize, visitStep, setChecklistItem, completeLesson, resetLesson, resetAll, statusFor,
  };
}
