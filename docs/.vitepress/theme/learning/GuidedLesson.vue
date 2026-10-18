<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRoute } from 'vitepress';
import bluebookParts from '../../../../learning/bluebook-parts.json';
import type { Lesson, Scenario } from '../../../../learning/types';
import { useLearningProgress } from './useLearningProgress';
import SourceBody from './SourceBody.vue';
import TeachingStep from './TeachingStep.vue';
import './teaching.css';
import PixelIcon from '../components/PixelIcon.vue';
import PixelArtwork from './PixelArtwork.vue';
import './completion.css';
import './lesson-illustration.css';
const props = defineProps<{ lesson: Lesson; lessons: Lesson[]; scenarios: Scenario[]; routeBase?: string }>();
const route = useRoute();
const progress = useLearningProgress();
let previousScrollBehavior: string | undefined;
const activeId = ref(props.lesson.steps[0]?.id ?? '');
const showSummary = ref(false);
const restartPending = ref(false);
const messages = ref<string[]>([]);
const from = ref('learn');
const category = ref('');
const isBluebook = computed(() => props.lesson.track === 'bluebook');
const chapterPart = computed(() => bluebookParts.find(part => part.id === props.lesson.level));
const isLifeScenario = computed(() => props.lesson.track === 'scenario');
const isWorkScenario = computed(() => props.lesson.track === 'work-scenario');
const isScenarioGuide = computed(() => props.lesson.track === 'scenario' || isWorkScenario.value);
const guideLabel = computed(() => isWorkScenario.value ? '工作场景指南' : '生活实战指南');
const pageUrl = computed(() => props.routeBase ?? `/learn/${props.lesson.id}/`);
const record = computed(() => progress.records.value[props.lesson.id]);
const versionChanged = computed(() => !!record.value && record.value.contentVersion !== props.lesson.contentVersion);
const done = computed(() => progress.statusFor(props.lesson) === 'marked_complete');
const activeIndex = computed(() => props.lesson.steps.findIndex(step => step.id === activeId.value));
const step = computed(() => props.lesson.steps[activeIndex.value]);
const backUrl = computed(() => from.value === 'solve' && category.value ? `/solve/${category.value}/` : '/learn/');
const backLabel = computed(() => from.value === 'solve' && category.value === 'life' ? '返回生活助手' : from.value === 'solve' && category.value ? '返回工作场景' : '返回学习路线');
const checked = (itemId: string) => !versionChanged.value && !!record.value && Object.hasOwn(record.value.checklist, activeId.value) && record.value.checklist[activeId.value].includes(itemId);
const nextLesson = computed(() => {
  if (isScenarioGuide.value) return undefined;
  const courseLessons = props.lessons.filter(item => (isBluebook.value ? item.track === 'bluebook' : item.track !== 'bluebook' && item.track !== 'scenario' && item.track !== 'work-scenario') && (from.value !== 'solve' || !category.value || item.categoryIds.includes(category.value as any)));
  return courseLessons.find(item => props.lesson.nextLessonIds.includes(item.id) && item.status === 'published') ?? courseLessons.find(item => item.number > props.lesson.number && item.status === 'published');
});
const levelTitles = { L0: '认知起步', L1: '单点技能', L2: '组合自动化', L3: '进阶调教' };
const completionTopics = computed(() => versionChanged.value ? [] : [...new Set(props.lesson.steps.flatMap(item =>
  item.checklist.filter(check => record.value && Object.hasOwn(record.value.checklist, item.id)
    && record.value.checklist[item.id].includes(check.id)).map(check => check.label)))]);
const completionLead = computed(() => versionChanged.value ? '历史完成标记已保留；当前内容已更新，可回看或重新学习。' : '完成标记已保存，可继续下一项或回看内容。');
const stepLead = computed(() => isLifeScenario.value ? '' : step.value?.id === 'self-check'
  ? '自检用于回顾与核对，可按需要选择。' : step.value?.lead);
const context = computed(() => from.value === 'solve' && category.value ? `from=solve&category=${encodeURIComponent(category.value)}` : 'from=learn');
const currentScenario = computed(() => !isScenarioGuide.value && from.value === 'solve' && category.value
  ? props.scenarios.find(item => item.id === category.value)
  : undefined);
const plannedSources = computed(() => props.lesson.sourceRefs.map(ref => ({ title: ref.heading, url: "/" + ref.path.replace(/^docs\//, "").replace(/index\.md$/, "").replace(/\.md$/, "") + (ref.anchor ? "#" + ref.anchor : "") })));
const sourceLinks = computed(() => isLifeScenario.value ? props.lesson.externalSources ?? [] : [...new Map([...(props.lesson.referenceSteps ?? props.lesson.steps).filter(item => item.sourceUrl).map(item => [item.sourceUrl, { url: item.sourceUrl, title: item.sourceHeading }]), ...(props.lesson.externalSources ?? []).map(item => [item.url, item])]).values()]);
const currentSourceType = computed(() => step.value?.sourceUrl.startsWith('http') ? '官方产品文档' : step.value?.sourcePath.includes('/cases/') ? '社区案例' : '蓝皮书原文');
function loadLocation() {
  if (typeof window === 'undefined') return;
  const currentPath = window.location.pathname.replace(/\.html$/, '').replace(/\/$/, '');
  if (currentPath !== pageUrl.value.replace(/\.html$/, '').replace(/\/$/, '')) return;
  const query = new URLSearchParams(window.location.search);
  from.value = isWorkScenario.value || query.get('from') === 'solve' ? 'solve' : 'learn';
  const requestedCategory = query.get('category') ?? '';
  category.value = props.lesson.categoryIds.includes(requestedCategory as any) ? requestedCategory : isWorkScenario.value ? props.lesson.categoryIds[0] : '';
  const explicit = props.lesson.steps.find(item => item.id === query.get('step'));
  const saved = !query.has('step') && !versionChanged.value ? props.lesson.steps.find(item => item.id === record.value?.lastStepId) : undefined;
  activeId.value = (explicit ?? saved ?? props.lesson.steps[0])?.id ?? '';
  showSummary.value = done.value && !versionChanged.value && !explicit;
  if (!showSummary.value && activeId.value && props.lesson.status !== 'planned') progress.visitStep(props.lesson, activeId.value);
}
async function selectStep(id: string) {
  if (!props.lesson.steps.some(item => item.id === id)) return;
  messages.value = [];
  showSummary.value = false;
  document.querySelector<HTMLElement>('.learning-step-heading h2')?.focus({ preventScroll: true });
  activeId.value = id;
  progress.visitStep(props.lesson, id);
  const scrollPosition = window.scrollY;
  const currentBody = document.querySelector<HTMLElement>('.learning-step-body');
  if (currentBody) currentBody.style.minHeight = '';
  const nextUrl = `${pageUrl.value}?${context.value}&step=${encodeURIComponent(id)}`;
  window.history.replaceState({ ...window.history.state, scrollPosition }, '');
  window.history.pushState({ scrollPosition }, '', nextUrl);
  window.dispatchEvent(new Event('learning:route-change'));
  await nextTick();
  document.querySelector<HTMLElement>('.learning-step-heading h2')?.focus({ preventScroll: true });
  const updatedBody = document.querySelector<HTMLElement>('.learning-step-body');
  const root = document.documentElement;
  for (let attempt = 0; updatedBody && attempt < 3; attempt++) {
    root.scrollTop = scrollPosition;
    const missingScroll = scrollPosition - root.scrollTop;
    if (missingScroll <= 1) break;
    updatedBody.style.minHeight = `${Math.ceil(updatedBody.getBoundingClientRect().height + missingScroll + 2)}px`;
  }
  root.scrollTop = scrollPosition;
}
function finish() {
  const result = progress.completeLesson(props.lesson);
  if (result.ok) { showSummary.value = true; messages.value = []; return; }
  messages.value = result.missing.map(code => ({ content_version_changed: '本关内容已经更新，请选择重新学习后记录新版本进度。', not_published: '本关尚未完整开放，暂不能标记完成。', no_steps: '本关步骤仍在整理。', not_initialized: '学习记录尚未准备好，请稍后重试。' } as Record<string, string>)[code] ?? '暂时无法保存完成标记，请稍后重试。');
}
function restart() {
  progress.resetLesson(props.lesson.id);
  restartPending.value = false;
  showSummary.value = false;
  selectStep(props.lesson.steps[0].id);
}
function onStepSelect(event: Event) { selectStep((event.target as HTMLSelectElement).value); }
function onChecklist(itemId: string, event: Event) {
  progress.setChecklistItem(props.lesson, activeId.value, itemId, (event.target as HTMLInputElement).checked);
}
onMounted(() => {
  progress.initialize();
  previousScrollBehavior = document.documentElement.style.scrollBehavior;
  document.documentElement.style.scrollBehavior = 'auto';
  loadLocation();
  window.addEventListener('popstate', loadLocation);
  window.addEventListener('learning:route-change', loadLocation);
});
onUnmounted(() => {
  window.removeEventListener('popstate', loadLocation);
  window.removeEventListener('learning:route-change', loadLocation);
  if (previousScrollBehavior !== undefined) document.documentElement.style.scrollBehavior = previousScrollBehavior;
});
watch(() => route.path, loadLocation);
</script>
<template>
  <div class="learning-guided" :class="{ 'learning-guided--complete': showSummary }">
    <nav v-if="showSummary" class="learning-completion-breadcrumb" aria-label="当前位置"><a :href="backUrl">{{ isScenarioGuide ? backLabel.replace('返回', '') : '学习路线' }}</a><span aria-hidden="true">›</span><span>{{ isBluebook ? chapterPart?.label + ' · ' + chapterPart?.title : isScenarioGuide ? guideLabel : `${lesson.level} ${levelTitles[lesson.level]}` }}</span><span aria-hidden="true">›</span><span aria-current="page">{{ isBluebook || isScenarioGuide ? lesson.title : `#${String(lesson.number).padStart(2, '0')} ${lesson.title}` }}</span></nav>
    <a v-if="!showSummary" class="learning-back" :href="backUrl">← {{ backLabel }}</a>
    <header v-if="!showSummary" class="learning-lesson-heading" :class="{ 'learning-lesson-heading--illustrated': lesson.id === 'wb-lesson-03' }"><div class="learning-lesson-heading__copy"><p class="learning-eyebrow">{{ isBluebook ? `${chapterPart?.label} / 第 ${lesson.number} 章` : isScenarioGuide ? (isWorkScenario ? 'WORK / GUIDE' : 'LIFE / GUIDE') : `${lesson.level} / TASK ${String(lesson.number).padStart(2, '0')}` }}</p><h1>{{ lesson.title }}</h1><p v-if="lesson.summary && !currentScenario" class="learning-lesson-summary">{{ lesson.summary }}</p></div><figure v-if="lesson.id === 'wb-lesson-03'" class="learning-lesson-heading__visual"><img :src="'/images/workbuddy-lesson-ask-craft-plan.png'" alt="WorkBuddy 用户在 AI 小伙伴陪伴下，查看提问、创作和清单工作区三种模式" width="1900" height="828" decoding="async" /></figure></header>
    <p v-if="progress.storageMode.value === 'temporary'" class="learning-notice">当前使用临时记录，关闭页面后进度可能丢失。</p>
    <section v-if="lesson.status === 'planned' || lesson.status === 'archived' || !lesson.steps.length" class="learning-empty"><PixelIcon name="book" /><h2>这项任务还在准备中</h2><p>步骤整理与核验完成后，这里会开放学习。你可以先查阅已有原文。</p><p v-for="source in plannedSources" :key="source.url"><a class="learning-back" :href="source.url">{{ source.title }} ↗</a></p><a class="learning-button" :href="backUrl">{{ backLabel }}</a></section>
    <template v-else>
      <div v-if="versionChanged" :class="isScenarioGuide ? 'learning-version-note' : 'learning-notice'"><strong>{{ isScenarioGuide ? '指南已更新。' : '本关内容有更新。' }}</strong>{{ isScenarioGuide ? '原有记录已保留，可直接阅读新版。' : '你的原有学习记录已保留。可以继续查看新内容，或选择重新学习来记录新版本进度。' }}<button class="learning-text-button" @click="restartPending = true">重新学习</button></div>
      <section v-if="restartPending" class="learning-restart" role="alert"><h2>确认重新学习这一关？</h2><p>这会清除本关在当前浏览器中的阅读位置、自检勾选与完成标记。</p><button class="learning-button learning-button--primary" @click="restart">确认清除并重新学习</button><button class="learning-button" @click="restartPending = false">保留记录</button></section>
      <section v-if="!showSummary && currentScenario" class="learning-scenario-context" aria-label="当前场景背景">
        <header class="learning-scenario-context__header">
          <div><p class="learning-eyebrow">当前场景</p><h2 class="learning-scenario-context__title">{{ currentScenario.title }}</h2></div>
          <a class="learning-scenario-context__link" :href="backUrl">查看完整场景 <span aria-hidden="true">→</span></a>
        </header>
        <p class="learning-scenario-context__goal">{{ currentScenario.workflow.goal }}</p>
        <p v-if="lesson.summary" class="learning-scenario-context__task"><strong>本次任务</strong>{{ lesson.summary }}</p>
        <details class="learning-scenario-context__details">
          <summary>展开查看准备、流程、交付与验收</summary>
          <div class="learning-scenario-context__grid">
            <section><h3>开始前准备</h3><ul><li v-for="item in currentScenario.workflow.prepare" :key="item">{{ item }}</li></ul></section>
            <section><h3>推荐流程</h3><ol><li v-for="item in currentScenario.workflow.steps" :key="item">{{ item }}</li></ol></section>
            <section><h3>预期交付</h3><ul><li v-for="item in currentScenario.workflow.deliverable" :key="item">{{ item }}</li></ul></section>
            <section><h3>完成前核验</h3><ul><li v-for="item in currentScenario.workflow.verify" :key="item">{{ item }}</li></ul></section>
          </div>
        </details>
      </section>
      <section v-if="showSummary" class="learning-completion" aria-labelledby="learning-completion-title">
        <PixelArtwork scene="celebrate" message="干得漂亮！" />
        <h1 id="learning-completion-title" class="learning-completion__title"><span v-if="isScenarioGuide">{{ isWorkScenario ? '工作场景已标记完成' : '生活指南已标记完成' }}</span><template v-else>你已标记<span class="learning-completion__level">第 {{ String(lesson.number).padStart(2, '0') }} {{ isBluebook ? '章' : '关' }}</span>完成</template></h1>
        <p class="learning-completion__lead">{{ completionLead }}</p>
        <section class="learning-completion__topics" aria-labelledby="learning-completion-topics"><h2 id="learning-completion-topics">{{ completionTopics.length ? '已勾选的自检项' : '本次学习记录' }}</h2><p v-if="!completionTopics.length" class="learning-muted">{{ versionChanged ? '内容已更新，旧版本自检勾选已保留。重新学习后可记录当前版本。' : '本次未勾选自检项，不影响完成标记。' }}</p><ul v-else><li v-for="item in completionTopics" :key="item"><PixelIcon name="check-box" /><span>{{ item }}</span></li></ul></section>
        <section v-if="nextLesson" class="learning-completion__recommendation" aria-labelledby="learning-next-title"><h2 id="learning-next-title">{{ isBluebook ? '下一章' : '下一关推荐' }}</h2><a class="learning-next" :href="`/learn/${nextLesson.id}/?${context}`"><PixelIcon name="newspaper" /><span class="learning-next__copy"><strong>#{{ String(nextLesson.number).padStart(2, '0') }} {{ nextLesson.title }}</strong><small>{{ isBluebook ? nextLesson.stepCountLabel : `${nextLesson.level} ${levelTitles[nextLesson.level]}` + ' · ' + (nextLesson.kind === 'concept' ? '概念阅读' : nextLesson.kind === 'challenge' ? '综合挑战' : '动手实战') }}</small></span><PixelIcon name="arrow-right" /></a></section>
        <div class="learning-actions"><a class="learning-button" :href="backUrl">{{ backLabel }}</a><a v-if="nextLesson" class="learning-button learning-button--primary learning-completion__continue" :href="`/learn/${nextLesson.id}/?${context}`">{{ isBluebook ? '继续下一章' : '继续下一关' }} <span aria-hidden="true">→</span></a><button v-else class="learning-button learning-button--primary" @click="selectStep(lesson.steps[0].id)">重新查看内容</button></div>
        <div class="learning-completion__secondary"><button v-if="nextLesson" class="learning-text-button" @click="selectStep(lesson.steps[0].id)">重新查看内容</button><button class="learning-text-button" @click="restartPending = true">重新学习</button></div>
        <p class="learning-completion__note">完成状态由你自主标记，仅保存在当前浏览器。</p>
      </section>
      <div v-else-if="step" class="learning-workspace">
        <nav class="learning-step-nav" :aria-label="isBluebook ? '本章目录' : isScenarioGuide ? '操作流程' : '本关步骤'"><p class="learning-eyebrow">{{ isBluebook ? '本章目录' : isScenarioGuide ? '操作流程' : '本关步骤' }}</p><ol><li v-for="(item, index) in lesson.steps" :key="item.id"><button :aria-current="item.id === activeId ? 'step' : undefined" @click="selectStep(item.id)"><span class="learning-step-index">{{ index + 1 }}</span><span>{{ item.title }}</span></button></li></ol><a :href="backUrl">{{ backLabel }} →</a></nav>
        <div class="learning-step-mobile"><label for="learning-step-select">当前步骤</label><select id="learning-step-select" :value="activeId" @change="onStepSelect"><option v-for="(item, index) in lesson.steps" :key="item.id" :value="item.id">{{ index + 1 }}. {{ item.title }}</option></select></div>
        <article class="learning-step-body"><div class="learning-step-heading"><p class="learning-eyebrow">STEP {{ activeIndex + 1 }} / {{ lesson.steps.length }}</p><h2 tabindex="-1">{{ step.title }}</h2><div v-if="stepLead" class="learning-step-context"><p class="learning-step-context__label">本步说明</p><p>{{ stepLead }}</p></div></div><TeachingStep v-if="step.instruction" :key="step.id" :step="step" :materials="lesson.materials" :simple="isLifeScenario" /><SourceBody v-else-if="step.id !== 'self-check'" :key="step.id" :step="step" :prompt-instructions="isWorkScenario" />
          <fieldset v-if="step.checklist.length" class="learning-checklist" :disabled="versionChanged"><legend>自检清单（可选）</legend><p class="learning-muted">勾选自动保存，可按需要使用。</p><label v-for="item in step.checklist" :key="item.id"><input type="checkbox" :checked="checked(item.id)" @change="onChecklist(item.id, $event)"><span>{{ item.label }}</span></label></fieldset>

          <details v-if="lesson.referenceSteps?.length && (!isLifeScenario || activeIndex === lesson.steps.length - 1)" class="tutorial-references">
            <summary>{{ isLifeScenario ? '想了解更多？查看原文与示例' : '原文、原图与案例（参考阅读）' }}</summary>
            <p v-if="isLifeScenario">这是原书的相关内容，按需阅读即可。</p><p v-else>这里保留原书中的图文、案例结果和模板，不代表当前练习已完成。实际操作以本页教学步骤为准；示例输出、目录结构和配置片段按原文阅读，不作为 Prompt 发送。</p>
            <details v-for="reference in lesson.referenceSteps" :key="reference.id" class="tutorial-reference"><summary>{{ reference.title }}</summary><SourceBody :step="reference" reference /></details>
          </details>
          <div v-if="messages.length" class="learning-notice" role="status"><p v-for="message in messages" :key="message">{{ message }}</p></div>
          <div class="learning-step-controls"><button class="learning-button" :disabled="activeIndex === 0" @click="selectStep(lesson.steps[activeIndex - 1].id)">← 上一步</button><button v-if="activeIndex < lesson.steps.length - 1" class="learning-button" @click="selectStep(lesson.steps[activeIndex + 1].id)">下一步 →</button><button v-else-if="lesson.status === 'published'" class="learning-button learning-button--primary" :disabled="versionChanged" @click="finish">标记完成</button><a v-else class="learning-button" :href="backUrl">{{ backLabel }}</a></div>
        </article>
        <aside class="learning-source-aside"><details open>
          <summary>{{ isScenarioGuide ? '本次任务与相关学习' : '来源与相关知识' }}</summary>
          <dl v-if="isScenarioGuide" class="learning-work-task-summary">
            <div><dt>{{ isLifeScenario ? '你遇到的问题' : '工作痛点' }}</dt><dd>{{ lesson.pain }}</dd></div>
            <div><dt>需要准备</dt><dd>{{ lesson.preparation }}</dd></div>
            <div><dt>解决后得到</dt><dd>{{ lesson.outcome }}</dd></div>
          </dl>
          <p v-else class="learning-muted">{{ isBluebook ? '本章来源：' : '本课参考：' }}{{ currentSourceType }}。{{ isBluebook ? '图文与示例按原章节顺序呈现，可通过下方链接查阅完整章节。' : '操作步骤已按练习任务重新编排；原文与案例可在正文下方展开查看。' }}</p>
          <p v-if="lesson.sourceCaveat" class="learning-notice">{{ lesson.sourceCaveat }}</p>
          <a v-if="step.sourceUrl" class="learning-current-source" :href="step.sourceUrl" :target="step.sourceUrl.startsWith('http') ? '_blank' : undefined" :rel="step.sourceUrl.startsWith('http') ? 'noreferrer' : undefined">{{ isBluebook ? '完整章节：' : '本课来源：' }}{{ step.sourceHeading }} ↗</a>
          <h3 v-if="isScenarioGuide">相关基础知识</h3>
          <ul v-if="!isBluebook"><li v-for="source in sourceLinks" :key="source.url"><a :href="source.url" target="_blank" rel="noreferrer">{{ source.title }} ↗</a></li></ul>
          <p v-if="!sourceLinks.length" class="learning-muted">暂无相关学习链接。</p>
        </details></aside>
      </div>
    </template>
  </div>
</template>
