<script setup lang="ts">
import { computed } from 'vue';
import { data } from '../../learning.data';
import { useLearningProgress } from './useLearningProgress';
import PixelIcon from '../components/PixelIcon.vue';
import HeroArtwork from './HeroArtwork.vue';
import PixelArtwork from './PixelArtwork.vue';
import './learning.css';
const progress = useLearningProgress();
const published = computed(() => data.bluebookLessons.filter(lesson => lesson.status === 'published'));
const recommended = computed(() => published.value.filter(lesson => [1, 2, 3].includes(lesson.number)).sort((a, b) => a.number - b.number));
const resume = computed(() => data.bluebookLessons.filter(lesson => progress.records.value[lesson.id]?.lastStepId && progress.statusFor(lesson) === 'in_progress').sort((a, b) => (progress.records.value[b.id]?.updatedAt ?? '').localeCompare(progress.records.value[a.id]?.updatedAt ?? ''))[0]);
</script>
<template>
  <main class="learning-shell learning-home">
    <section class="learning-hero">
      <div><p class="learning-eyebrow">YOUR FIRST AI TEAM</p><h1>WorkBuddy<br><span>实战蓝皮书</span></h1><p class="learning-hero__lead">从第一项任务开始，<br>一步步拥有自己的 AI 工作团队。</p><div class="learning-tags"><span>办公提效</span><span>数据分析</span><span>自动化工作</span><span>Agent 协作</span></div></div>
      <div class="learning-hero__art"><HeroArtwork /><p class="learning-hero__message">让 AI<br>真正为你工作</p></div>
    </section>
    <section class="learning-entries" aria-label="选择学习方式">
      <a href="/learn/" class="learning-entry learning-entry--mint"><PixelIcon name="book" /><div><p class="learning-eyebrow">FOLLOW THE PATH</p><h2>我想一步一步学</h2><p>从入门到进阶，沿着清晰的路线，<br>逐章读懂，再动手实践。</p><ul><li><PixelIcon name="check-box" /><span>按蓝皮书四篇顺序学习</span></li><li><PixelIcon name="check-box" /><span>{{ data.bluebookLessons.length }} 章原书图文与示例</span></li><li><PixelIcon name="check-box" /><span>自由浏览，自检可选，标记完成</span></li></ul></div><span class="learning-entry__arrow" aria-hidden="true">→</span><PixelArtwork scene="path" /></a>
      <a href="/solve/" class="learning-entry"><PixelIcon name="folder-open" /><div><p class="learning-eyebrow">START WITH A PROBLEM</p><h2>我想解决一个问题</h2><p>选择手头的工作场景，<br>找到相关案例与操作指南。</p><ul><li><PixelIcon name="check-box" /><span>按真实工作场景查找</span></li><li><PixelIcon name="check-box" /><span>直接进入相关教程</span></li><li><PixelIcon name="check-box" /><span>按自己的进度练习</span></li></ul></div><span class="learning-entry__arrow" aria-hidden="true">→</span><PixelArtwork scene="solve" /></a>
    </section>
    <a v-if="resume" class="learning-resume" :href="`/learn/${resume.id}/?from=learn`"><PixelIcon name="refresh" />继续上次学习：{{ resume.title }} <span aria-hidden="true">→</span></a>
    <section class="learning-latest"><div class="learning-section-title"><h2>从这里开始</h2><a href="/learn/">查看学习路线 →</a></div><div class="learning-latest__grid"><a v-for="lesson in recommended" :key="lesson.id" class="learning-lesson-card" :href="`/learn/${lesson.id}/?from=learn`"><span class="learning-card-badge">章节学习</span><span class="learning-number">{{ String(lesson.number).padStart(2, '0') }}</span><div><h3>{{ lesson.title }}</h3><p>{{ lesson.stepCountLabel }}</p></div><span aria-hidden="true">→</span></a></div></section>
  </main>
</template>
