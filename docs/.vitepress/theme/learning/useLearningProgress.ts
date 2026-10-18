import { onMounted, ref, type Ref } from 'vue';
import { createProgressStore, type ProgressRecord, type StorageMode } from '../../../../learning/progress';
import type { Lesson } from '../../../../learning/types';

// 只在浏览器初始化后共享，服务端不读取或产生用户记录。
const store = createProgressStore();
const records: Ref<Record<string, ProgressRecord>> = ref({});
const storageMode: Ref<StorageMode> = ref('temporary');

function sync() {
  records.value = store.records;
  storageMode.value = store.storageMode;
}

export function useLearningProgress() {
  function initialize() {
    if (typeof window === 'undefined') return;
    store.initialize();
    sync();
  }
  function mutate<T>(action: () => T): T {
    if (typeof window === 'undefined') return undefined as T;
    const result = action();
    sync();
    return result;
  }
  onMounted(initialize);
  return {
    records, storageMode, initialize,
    visitStep: (lesson: Lesson, stepId: string) => mutate(() => store.visitStep(lesson, stepId)),
    setChecklistItem: (lesson: Lesson, stepId: string, itemId: string, checked: boolean) =>
      mutate(() => store.setChecklistItem(lesson, stepId, itemId, checked)),
    completeLesson: (lesson: Lesson) => typeof window === 'undefined'
      ? { ok: false, missing: ['not_initialized'] }
      : mutate(() => store.completeLesson(lesson)),
    resetLesson: (id: string) => mutate(() => store.resetLesson(id)),
    resetAll: () => mutate(() => store.resetAll()),
    statusFor: (lesson: Lesson) => {
      // 建立响应式依赖，独立存储核心无需依赖 Vue。
      void records.value;
      return store.statusFor(lesson);
    },
  };
}
