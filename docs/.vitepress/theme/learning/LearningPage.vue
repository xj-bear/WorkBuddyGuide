<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useData, useRouter } from 'vitepress';
import { data } from '../../learning.data';
import bluebookParts from '../../../../learning/bluebook-parts.json';
import { useLearningProgress } from './useLearningProgress';
import PixelIcon from '../components/PixelIcon.vue';
import GuidedLesson from './GuidedLesson.vue';
import WorkScenarioCases from './WorkScenarioCases.vue';
import ImagePlaceholder from './ImagePlaceholder.vue';
import PixelArtwork from './PixelArtwork.vue';
import './learning.css';
import './work-scenarios.css';
const props = defineProps<{ view: 'roadmap' | 'scenarios' | 'scenario' | 'lesson' | 'about' }>();
const { params } = useData();
const router = useRouter();
const progress = useLearningProgress();
const resetPending = ref(false);
const resetNotice = ref(false);
function resetAll() { progress.resetAll(); resetPending.value = false; resetNotice.value = true; }
const levels = bluebookParts;
const courseLessons = computed(() => data.bluebookLessons);
const allGuides = computed(() => [...data.bluebookLessons, ...data.lessons, ...data.scenarioGuides]);
const lesson = computed(() => allGuides.value.find(item => item.id === params.value?.lessonId));
// 旧学习路线链接进入同章号的蓝皮书；场景配套练习保留原地址和内容。
function followBluebookRoute() {
  if (props.view !== 'lesson' || typeof window === 'undefined') return;
  if (new URLSearchParams(window.location.search).get('from') !== 'learn') return;
  const match = params.value?.lessonId?.match(/^wb-lesson-(\d+)$/);
  const chapter = match && data.bluebookLessons.find(item => item.number === Number(match[1]));
  if (chapter) void router.go(`/learn/${chapter.id}/?from=learn`);
}
onMounted(followBluebookRoute);
watch(() => params.value?.lessonId, followBluebookRoute);
const scenario = computed(() => data.scenarios.find(item => item.id === params.value?.categorySlug));
const workCases = computed(() => data.workScenarioCases ?? []);
const scenarioCases = computed(() => workCases.value.filter(item => item.categoryIds.includes(scenario.value?.id ?? 'life')));
const workScenarios = computed(() => data.scenarios.filter(item => item.id !== 'life'));
const scenarioIndex = computed(() => workScenarios.value.findIndex(item => item.id === scenario.value?.id));
const previousScenario = computed(() => scenarioIndex.value > 0 ? workScenarios.value[scenarioIndex.value - 1] : undefined);
const nextScenario = computed(() => scenarioIndex.value >= 0 ? workScenarios.value[scenarioIndex.value + 1] : undefined);
const scenarioLessons = computed(() => {
  const selected = scenario.value;
  return selected ? data.lessons.filter(item => item.categoryIds.includes(selected.id) && item.status === 'published') : [];
});
const scenarioGuides = computed(() => {
  const selected = scenario.value;
  return selected ? data.scenarioGuides.filter(item => item.categoryIds.includes(selected.id)) : [];
});
const scenarioSources = computed(() => data.lessons.filter(item => scenario.value?.workflow.sourceLessonIds.includes(item.id) && !item.categoryIds.includes(scenario.value?.id ?? 'life')));
const opened = computed(() => courseLessons.value.filter(item => item.status === 'published'));
const isDone = (item: typeof data.lessons[number]) => progress.statusFor(item) === 'marked_complete';
const completed = computed(() => opened.value.filter(isDone).length);
const achievementBadges = [
  { id: 'first-step', title: '迈出第一步', note: '读完 1 个章节', threshold: 1, icon: 'check-box' },
  { id: 'steady-progress', title: '持续前进', note: '读完 3 个章节', threshold: 3, icon: 'chart-line' },
  { id: 'five-tasks', title: '五章积累', note: '读完 5 个章节', threshold: 5, icon: 'book' },
];
const unlockedAchievements = computed(() => achievementBadges.filter(item => completed.value >= item.threshold));
const nextAchievement = computed(() => achievementBadges.find(item => completed.value < item.threshold));
const statusText = (item: typeof data.lessons[number]) => isDone(item) ? '已标记完成' : item.status === 'published' ? progress.statusFor(item) === 'in_progress' ? '继续学习' : '开始学习' : '待整理';
const statusBadge = (item: typeof data.lessons[number]) => isDone(item) ? '已标记完成' : item.status === 'published' ? progress.statusFor(item) === 'in_progress' ? '继续学习' : '可开始' : '待整理';
function scenarioCount(id: string, status: string) { return data.lessons.filter(item => item.categoryIds.includes(id as any) && item.status === status).length; }
function scenarioBadge(item: (typeof data.scenarios)[number]) {
  const cases = workCases.value.filter(entry => entry.categoryIds.includes(item.id)).length;
  if (cases) return `${cases} 个场景方案`;
  const available = scenarioCount(item.id, 'published') + scenarioCount(item.id, 'preview');
  return available ? `${available} 项可学` : '内容整理中';
}
function guideStepTitles(guide: typeof data.scenarioGuides[number]) { return guide.steps.filter(step => step.id !== 'self-check').map(step => step.title); }
function stageLessons(level: string) { return courseLessons.value.filter(item => item.level === level); }
function stageDone(level: string) { return stageLessons(level).filter(item => item.status === 'published' && isDone(item)).length; }
function stageOpen(level: string) { return stageLessons(level).filter(item => item.status === 'published').length; }
</script>
<template>
  <main v-if="view === 'lesson'" class="learning-shell learning-shell--lesson"><GuidedLesson v-if="lesson" :key="lesson.id" :lesson="lesson" :lessons="allGuides" :scenarios="data.scenarios" /><section v-else class="learning-empty"><h1>没有找到这项任务</h1><p>可以从学习路线重新选择一关。</p><a class="learning-button" href="/learn/">返回学习路线</a></section></main>
  <main v-else class="learning-shell learning-page">
    <template v-if="view === 'roadmap'">
      <header class="learning-page-heading learning-roadmap-heading"><div><p class="learning-eyebrow">ONE STEP AT A TIME</p><h1>学习路线<span class="learning-dot">.</span></h1><p>按蓝皮书四篇、28 章的原有顺序学习，逐节阅读图文、查看示例并记录进度。</p></div><PixelArtwork scene="roadmap" :message="'一步一步，\n解锁更多能力！'" /></header>
      <div class="learning-roadmap"><div class="learning-stages"><section v-for="level in levels" :key="level.id" class="learning-stage"><header><span class="learning-number">{{ level.label }}</span><h2>{{ level.title }}</h2><p>{{ stageDone(level.id) }} / {{ stageOpen(level.id) }} 章已完成</p></header><div class="learning-stage__lessons"><component :is="item.status === 'planned' || item.status === 'archived' ? 'div' : 'a'" v-for="item in stageLessons(level.id)" :key="item.id" :href="item.status === 'planned' || item.status === 'archived' ? undefined : `/learn/${item.id}/?from=learn`" class="learning-roadmap-card" :class="{ 'is-complete': isDone(item), 'is-planned': item.status === 'planned' || item.status === 'archived' }"><span class="learning-number">{{ String(item.number).padStart(2, '0') }}</span><div><h3>{{ item.title }}</h3><p>{{ item.stepCountLabel }}</p></div><span class="learning-card-badge" :class="{ 'is-complete': isDone(item), 'is-preview': item.status === 'preview', 'is-planned': item.status === 'planned' || item.status === 'archived' }">{{ statusBadge(item) }}</span></component></div></section><nav class="learning-bluebook-readings" aria-label="课外阅读与附录"><h2>课外阅读与附录</h2><a v-for="reading in data.bluebookReadings" :key="reading.url" :href="reading.url">{{ reading.title }} ↗</a></nav></div>
        <aside class="learning-progress-panel"><h2>我的学习进度</h2><div class="learning-progress-stats" aria-label="学习概览"><article><PixelIcon name="check-box" /><div><strong>{{ completed }}<small> / {{ opened.length }}</small></strong><span>已完成章节</span></div></article><article><PixelIcon name="chart-line" /><div><strong>{{ unlockedAchievements.length }}<small> / {{ achievementBadges.length }}</small></strong><span>已解锁徽章</span></div></article></div><p class="learning-muted">共 {{ courseLessons.length }} 章，按蓝皮书顺序学习。</p><section class="learning-achievements" aria-labelledby="learning-achievements-title"><header><h3 id="learning-achievements-title">学习成就</h3><span>{{ unlockedAchievements.length }} / {{ achievementBadges.length }}</span></header><ul><li v-for="badge in achievementBadges" :key="badge.id" :class="{ 'is-unlocked': completed >= badge.threshold }"><span class="learning-achievement-icon"><PixelIcon :name="badge.icon" /></span><span class="learning-achievement-copy"><b>{{ badge.title }}</b><small>{{ badge.note }}</small></span><span class="learning-achievement-state">{{ completed >= badge.threshold ? '已解锁' : '待解锁' }}</span></li></ul><p v-if="nextAchievement" class="learning-achievement-next">下一枚：{{ nextAchievement.title }} · 读完 {{ nextAchievement.threshold }} 个章节</p><p v-else class="learning-achievement-next">规划中的学习徽章已全部点亮。</p></section><section v-for="level in levels" :key="level.id" class="learning-stage-progress"><div><b>{{ level.label }} {{ level.title }}</b><span>{{ stageOpen(level.id) ? `${stageDone(level.id)}/${stageOpen(level.id)}` : "待开放" }}</span></div><progress :value="stageDone(level.id)" :max="stageOpen(level.id) || 1" :aria-label="`${level.title}完成进度`"></progress></section><p class="learning-note">完成状态由你自主标记，自检清单可选。记录仅保存在当前浏览器。</p><p v-if="progress.storageMode.value === 'temporary'" class="learning-notice" role="status">当前使用临时记录；关闭页面后进度可能丢失。</p><button class="learning-text-button" @click="resetPending = true; resetNotice = false">清除全部学习记录</button><div v-if="resetPending" class="learning-notice" role="alert"><p>仅清除当前浏览器的全部学习记录，操作后不能恢复。</p><button class="learning-button" @click="resetAll">确认清除全部</button><button class="learning-text-button" @click="resetPending = false">保留记录</button></div><p v-if="resetNotice" class="learning-note" role="status">全部学习记录已清除。</p></aside>
      </div>
    </template>
    <template v-else-if="view === 'scenarios'">
      <header class="learning-page-heading learning-scenario-heading"><div><p class="learning-eyebrow">WORK & LIFE SCENARIOS</p><h1>从工作到生活，你想解决哪类问题<span class="learning-dot">？</span></h1><p>从手头的真实任务出发，查看目标、准备材料、分步操作与结果验收。</p></div><nav class="learning-scenario-mode" aria-label="选择场景类型"><a href="/solve/" aria-current="page">工作场景</a><a href="/solve/life/">生活助手<span>{{ data.scenarioGuides.filter(guide => guide.categoryIds.includes('life')).length }} 个指南</span></a></nav></header>
      <section class="learning-work-catalog" aria-labelledby="work-catalog-title">
        <header class="learning-scenario-catalog__heading"><div><p class="learning-eyebrow">WORK SCENARIO LIBRARY</p><h2 id="work-catalog-title">工作场景</h2></div><p>从文档、数据到自动化协作，选择任务场景，按步骤完成并核验结果。</p></header>
        <div class="learning-scenario-grid"><a v-for="item in workScenarios" :key="item.id" :href="`/solve/${item.id}/`" class="learning-scenario-card"><span class="learning-corner-badge">{{ scenarioBadge(item) }}</span><PixelIcon :name="item.icon" /><h2>{{ item.title }}</h2><p>{{ item.description }}</p><p class="learning-scenario-availability">{{ workCases.filter(entry => entry.categoryIds.includes(item.id)).length }} 个场景方案 · {{ scenarioCount(item.id, "published") }} 个相关教程</p><span>选择要解决的问题 <span aria-hidden="true">→</span></span></a></div><p class="learning-note">按场景查找具体方案，也可以进入相关教程补充基础。</p>
      </section>
    </template>
    <template v-else-if="view === 'scenario'">
      <a v-if="scenario?.id !== 'life'" class="learning-back" href="/solve/">← 全部工作场景</a>
      <header class="learning-page-heading learning-scenario-heading"><div><p class="learning-eyebrow">{{ scenario?.id === 'life' ? 'WORK & LIFE SCENARIOS' : 'SCENARIO WORKFLOW' }}</p><h1 v-if="scenario?.id === 'life'">从工作到生活，你想解决哪类问题<span class="learning-dot">？</span></h1><h1 v-else>{{ scenario?.title ?? '未找到工作场景' }}</h1><p v-if="scenario?.id === 'life'">从手头的真实任务出发，查看目标、准备材料、分步操作与结果验收。</p><p v-else>{{ scenario?.description ?? '请返回全部场景重新选择。' }}</p></div><nav class="learning-scenario-mode" aria-label="选择场景类型"><a href="/solve/" :aria-current="scenario?.id !== 'life' ? 'page' : undefined">工作场景</a><a href="/solve/life/" :aria-current="scenario?.id === 'life' ? 'page' : undefined">生活助手<span>{{ data.scenarioGuides.filter(guide => guide.categoryIds.includes('life')).length }} 个指南</span></a></nav></header>
      <WorkScenarioCases v-if="scenario?.id !== 'life'" :cases="scenarioCases" :category="scenario?.id" />
      <nav v-if="scenario && scenario.id !== 'life'" class="learning-scenario-foundations" aria-label="场景入门参考"><strong>第一次使用 WorkBuddy？</strong><a href="/learn/wb-lesson-02/">安装并完成第一个任务 →</a><a href="/learn/wb-lesson-03/">认识模式与派活方式 →</a></nav>
      <section v-if="scenarioLessons.length" class="learning-scenario-course-list learning-scenario-course-list--top"><div class="learning-section-title"><div><p class="learning-eyebrow">COURSE TASKS</p><h2>相关基础教程</h2></div><span>补充工具用法与基础操作</span></div><div class="learning-scenario-lessons"><a v-for="item in scenarioLessons" :key="item.id" :href="`/learn/${item.id}/?from=solve&category=${scenario?.id}`" class="learning-roadmap-card learning-scenario-course-card"><span class="learning-number">{{ String(item.number).padStart(2, '0') }}</span><div><h3>{{ item.title }}</h3><p>{{ item.pain ?? item.summary }}</p><p v-if="item.outcome" class="learning-guide-outcome"><strong>完成后：</strong>{{ item.outcome }}</p><p class="learning-guide-meta">{{ item.stepCountLabel ?? `${item.steps.length} 步` }} · {{ item.imageCount }} 张参考图<span v-if="item.videoCount"> · {{ item.videoCount }} 段参考视频</span></p><p class="learning-guide-steps">{{ item.steps.filter(step => !['intro', 'prepare', 'self-check'].includes(step.id)).slice(0, 3).map(step => step.title).join(' → ') }}</p></div><span class="learning-card-badge">{{ statusText(item) }}</span></a></div></section>
      <section v-if="scenario?.id === 'life'" class="learning-life-catalog" aria-labelledby="life-catalog-title"><p class="learning-note">需要整理会议或工作资料？请前往<a href="/solve/knowledge/">工作场景 → 会议与知识</a>查看相关课程。</p>
        <header class="learning-scenario-catalog__heading"><div><p class="learning-eyebrow">LIFE SCENARIO LIBRARY</p><h2 id="life-catalog-title">生活助手场景</h2></div><p>把旅行、就医、家庭和日常安排拆成能逐步完成、由你核验的小任务。</p></header>
        <div class="learning-life-grid"><a v-for="guide in scenarioGuides" :key="guide.id" :href="`/learn/${guide.id}/?from=solve&category=life`" class="learning-life-card"><div class="learning-life-card__top"><span class="learning-number">{{ String(guide.number).padStart(2, '0') }}</span><span class="learning-card-badge">{{ guideStepTitles(guide).length }} 步</span></div><h3>{{ guide.title }}</h3><p>{{ guide.pain ?? guide.summary }}</p><p v-if="guide.outcome" class="learning-guide-outcome"><strong>完成后：</strong>{{ guide.outcome }}</p><div class="learning-life-card__footer"><span>{{ guide.imageCount }} 张参考图</span><span>查看指南 <span aria-hidden="true">→</span></span></div></a></div>
      </section>
      <details v-if="scenario && scenario.id !== 'life'" class="learning-scenario-workflow-toggle">
        <summary><strong>常见流程</strong><span>{{ scenario.workflow.steps.join(' → ') }}</span><span class="learning-scenario-workflow-toggle__action">展开查看准备和检查细节 ↓</span></summary>
        <section class="learning-scenario-workflow" aria-labelledby="workflow-title">
        <header><p class="learning-eyebrow">WORKFLOW GUIDE</p><h2 id="workflow-title">完整操作指南</h2><p>{{ scenario.workflow.goal }}</p></header>
        <div class="learning-scenario-workflow__grid">
          <section><span class="learning-number">01</span><h3>先准备什么？</h3><ul><li v-for="item in scenario.workflow.prepare" :key="item">{{ item }}</li></ul></section>
          <section><span class="learning-number">02</span><h3>一步一步怎么做？</h3><ol><li v-for="item in scenario.workflow.steps" :key="item">{{ item }}</li></ol></section>
          <section><span class="learning-number">03</span><h3>最后会得到什么？</h3><ul><li v-for="item in scenario.workflow.deliverable" :key="item">{{ item }}</li></ul></section>
          <section><span class="learning-number">04</span><h3>怎么确认没出错？</h3><ul><li v-for="item in scenario.workflow.verify" :key="item">{{ item }}</li></ul></section>
        </div>
        <nav v-if="scenarioSources.length || scenario.workflow.sourceLinks?.length" class="learning-scenario-workflow__sources" aria-label="来源课程"><span>对应教程</span><a v-for="item in scenarioSources" :key="item.id" :href="`/learn/${item.id}/?from=solve&category=${scenario.id}`">{{ item.title }} ↗</a><a v-for="item in scenario.workflow.sourceLinks" :key="item.url" :href="item.url">{{ item.title }} ↗</a></nav>
        </section>
      </details>
      <section v-if="scenario?.id !== 'life' && scenarioGuides.length" class="learning-scenario-guides"><div class="learning-section-title"><div><p class="learning-eyebrow">LIFE SCENARIO GUIDES</p><h2>生活实战指南</h2></div><span>独立于章节学习路线</span></div><div class="learning-scenario-lessons"><a v-for="guide in scenarioGuides" :key="guide.id" :href="`/learn/${guide.id}/?from=solve&category=${scenario?.id}`" class="learning-roadmap-card learning-scenario-guide-card"><span class="learning-number">{{ String(guide.number).padStart(2, '0') }}</span><div><h3>{{ guide.title }}</h3><p>{{ guide.pain ?? guide.summary }}</p><p v-if="guide.outcome" class="learning-guide-outcome"><strong>完成后：</strong>{{ guide.outcome }}</p><p class="learning-guide-meta">{{ guideStepTitles(guide).length }} 步 · {{ guide.imageCount }} 张参考图</p><p class="learning-guide-steps">{{ guideStepTitles(guide).join(' → ') }}</p></div><span class="learning-card-badge">{{ statusText(guide) }}</span></a></div></section>
      <section v-if="scenario && !scenarioCases.length && !scenarioLessons.length && !scenarioGuides.length" class="learning-empty"><PixelIcon name="folder-open" /><h2>这个场景的任务还在整理</h2><p>可以先查阅完整蓝皮书，或选择其他场景中的任务。</p><a class="learning-button" href="/bluebook/">查阅原文</a></section>
      <nav v-if="scenario && scenario.id !== 'life'" class="learning-scenario-pager" aria-label="切换场景"><a v-if="previousScenario" :href="`/solve/${previousScenario.id}/`" :aria-label="`上一个场景：${previousScenario.title}`"><span aria-hidden="true">←</span><span><small>上一个场景</small><b>{{ previousScenario.title }}</b></span></a><span class="learning-scenario-pager__count">{{ scenarioIndex + 1 }} / {{ workScenarios.length }}</span><a v-if="nextScenario" :href="`/solve/${nextScenario.id}/`" :aria-label="`下一个场景：${nextScenario.title}`"><span><small>下一个场景</small><b>{{ nextScenario.title }}</b></span><span aria-hidden="true">→</span></a></nav>
    </template>
    <template v-else-if="view === 'about'">
      <header class="learning-page-heading"><p class="learning-eyebrow">BUILT WITH THE COMMUNITY</p><h1>和 AI 一起，<br>把工作向前推一步<span class="learning-dot">。</span></h1></header><div class="learning-about"><div><h2>一本来自社区的实战读本</h2><p>本站学习路线由大熊的 AI 朋友整理，原蓝皮书与案例来自 WorkBuddyGuide 社区，希望把真实的使用经验，变成能跟着走的学习路线。</p><p>你可以一步一步认识 WorkBuddy，也可以从正在面对的问题出发，找到对应的原文和操作方法。</p><h2>关于这里的学习记录</h2><p>你可以自由浏览内容，使用可选自检清单，并自主标记完成。网页不会读取你在 WorkBuddy 中的任务结果。记录保存在当前浏览器，不跨设备同步。</p><h2>非官方声明</h2><p>本读本为社区学习资料，并非 WorkBuddy 官方产品或官方文档。产品功能、安装入口与服务说明请以官方信息为准。</p><a class="learning-button" href="/learn/">从第一步开始 →</a></div><ImagePlaceholder src="/images/workbuddy-about-workflow-pixel-v2.png" alt="大熊与 WorkBuddy 小伙伴一起整理文件、文档和表格" label="" /></div>
    </template>
  </main>
</template>
