<script setup lang="ts">
import type { WorkScenarioCase } from '../../../../learning/types';

defineProps<{ cases: WorkScenarioCase[]; category?: string }>();
</script>

<template>
  <section v-if="cases.length" class="learning-work-case-list" aria-labelledby="work-cases-title">
    <div class="learning-section-title">
      <div><p class="learning-eyebrow">WORK SCENARIOS</p><h2 id="work-cases-title">按具体问题找方案</h2></div>
      <span>从准备材料到结果核对</span>
    </div>
    <div class="learning-life-grid">
      <a v-for="item in cases" :key="item.id" :href="category ? `${item.url}?from=solve&category=${category}` : item.url" class="learning-life-card learning-work-case-card">
        <div class="learning-life-card__top"><span class="learning-card-badge">场景方案</span></div>
        <h3>{{ item.title }}</h3>
        <p><strong>工作痛点：</strong>{{ item.pain }}</p>
        <p class="learning-guide-preparation"><strong>需要准备：</strong>{{ item.preparation }}</p>
        <p class="learning-guide-outcome"><strong>解决后得到：</strong>{{ item.outcome }}</p>
        <div class="learning-life-card__footer"><span>操作说明 · 配图 · 指令</span><span>查看方案 <span aria-hidden="true">→</span></span></div>
      </a>
    </div>
  </section>
</template>

<style scoped>
.learning-work-case-list { margin: 28px 0 36px; }
.learning-work-case-card .learning-guide-outcome { margin-top: 12px; }
.learning-work-case-card .learning-guide-preparation { margin-top: 12px; }
</style>
