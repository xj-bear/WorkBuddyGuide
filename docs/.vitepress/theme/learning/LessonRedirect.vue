<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useData, useRouter } from 'vitepress';
const { params } = useData();
const router = useRouter();
const target = computed(() => '/learn/' + encodeURIComponent(params.value.lessonId) + '/');
onMounted(() => { void router.go(target.value + window.location.search + window.location.hash); });
</script>
<template><main class="learning-shell"><h1>前往课程</h1><p>课程使用统一的新地址。<a :href="target">点击继续学习 →</a></p></main></template>
