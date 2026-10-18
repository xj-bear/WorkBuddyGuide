<script setup lang="ts">
import type { GuidedStep, PracticeMaterial } from '../../../../learning/types';
import PromptCard from './PromptCard.vue';
defineProps<{ step: GuidedStep; materials?: PracticeMaterial[]; simple?: boolean }>();
</script>
<template>
  <div v-if="step.instruction" class="tutorial-body">
    <p v-if="!simple" class="tutorial-location"><strong>操作位置</strong>{{ step.instruction.location }}</p>
    <section v-if="step.id === 'prepare' && materials?.length" class="tutorial-materials" aria-label="练习材料下载">
      <h3>下载本课练习材料</h3><p>全部为虚构教学样本。解压后选择 workbuddy-practice 作为工作区。</p>
      <a class="learning-button" href="/practice/workbuddy-practice.zip" download>下载完整练习包（ZIP） ↓</a>
      <ul><li v-for="material in materials" :key="material.path"><a :href="material.url" download>{{ material.path }} ↓</a><span>{{ material.description }}</span></li></ul>
    </section>
    <h3 v-if="step.id !== 'self-check'">{{ simple ? '跟着这样做' : step.kind === 'reading' ? '先了解这次任务' : '现在这样做' }}</h3><ol v-if="step.id !== 'self-check'" class="tutorial-actions"><li v-for="action in step.instruction.actions" :key="action">{{ action }}</li></ol>
    <PromptCard v-for="(prompt, index) in step.prompts" :key="`${step.id}-${index}`" :prompt="prompt" :simple="simple" />
    <section class="tutorial-expected"><h3>{{ simple ? '这一轮你会得到' : '完成后应该看到' }}</h3><p>{{ step.instruction.expected }}</p></section>
    <details class="tutorial-recovery"><summary>{{ simple ? '回复不符合预期时怎么办？' : '没有得到这个结果？' }}</summary><p>{{ step.instruction.recovery }}</p></details>
  </div>
</template>
