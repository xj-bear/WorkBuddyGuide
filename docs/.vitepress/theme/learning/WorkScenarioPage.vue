<script setup lang="ts">
import { computed } from 'vue';
import { data } from '../../learning.data';
import GuidedLesson from './GuidedLesson.vue';
import './learning.css';
import './work-scenarios.css';

const props = defineProps<{ caseId: string }>();
const guide = computed(() => data.workScenarioGuides.find(item => item.caseId === props.caseId));
</script>

<template>
  <main class="learning-shell learning-shell--lesson">
    <GuidedLesson v-if="guide" :key="guide.id" :lesson="guide" :lessons="[]" :scenarios="data.scenarios" :route-base="`/solve/cases/${caseId}/`" />
    <section v-else class="learning-empty"><h1>没有找到这个场景</h1><a class="learning-button" href="/solve/">返回工作场景</a></section>
  </main>
</template>
