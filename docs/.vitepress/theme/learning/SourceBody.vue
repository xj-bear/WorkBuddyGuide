<script setup lang="ts">
import { computed, defineAsyncComponent, onUnmounted, ref } from 'vue';
import type { GuidedStep } from '../../../../learning/types';
const MermaidDiagram = defineAsyncComponent(() => import('../components/MermaidDiagram.vue'));
import { mediaUrls } from './media.generated';
const props = defineProps<{ step: GuidedStep; reference?: boolean; promptInstructions?: boolean }>();
const notice = ref('');
const copyTimers = new Map<HTMLButtonElement, number>();
const blocks = computed(() => props.step.bodyBlocks?.length ? props.step.bodyBlocks : [{ kind: 'html', value: props.step.html }]);
function mediaError(event: Event) { if (event.target instanceof HTMLImageElement || event.target instanceof HTMLVideoElement) notice.value = '这份教程媒体加载失败。请重试，或通过右侧来源链接查看原文。'; }
function showCopyState(button: HTMLButtonElement, state: 'copied' | 'error', label: string) {
  const previousTimer = copyTimers.get(button);
  if (previousTimer) window.clearTimeout(previousTimer);
  button.dataset.copyState = state;
  button.setAttribute('aria-label', label);
  copyTimers.set(button, window.setTimeout(() => {
    delete button.dataset.copyState;
    button.setAttribute('aria-label', props.reference ? '复制原文片段' : props.promptInstructions ? '复制 Prompt' : '复制指令');
    copyTimers.delete(button);
  }, 1600));
}
onUnmounted(() => {
  copyTimers.forEach((timer) => window.clearTimeout(timer));
  copyTimers.clear();
});
function resolveMedia(html: string) {
  const firstHeading = html.match(/^\s*<h[2-4][^>]*>[\s\S]*?<\/h[2-4]>\s*/);
  if (firstHeading && firstHeading[0].includes(props.step.title)) html = html.slice(firstHeading[0].length);
  if (props.reference) html = html.replace(/<button\b([^>]*\bclass="copy"[^>]*)>/g, (_, attributes) => '<button' + attributes.replace(/(?:aria-label|title)="[^"]*"/g, '') + ' aria-label="复制原文片段" title="复制原文片段">');
  if (props.promptInstructions && !props.reference) {
    html = html.replace(/<div\b([^>]*\bclass="language-(?:text|txt|plain)(?:\s[^"<]*)?"[^>]*)>/g,
      (_, attributes) => '<div class="learning-prompt-guide"><strong>这段提示词可以复制给 WorkBuddy</strong><p>点击这段提示词右上角的“复制 Prompt”，打开 WorkBuddy，粘贴到当前任务的对话输入框。先核对文件名、日期和需要填写的内容，再发送。</p></div><div' + attributes + '>');
    html = html.replace(/<button\b([^>]*\bclass="copy"[^>]*)>/g, (_, attributes) => '<button' + attributes.replace(/(?:aria-label|title)="[^"]*"/g, '') + ' aria-label="复制 Prompt" title="复制 Prompt">');
  }
  return html.replace(/__WB_(asset-[a-f0-9]{16})__/g, (token, id) => mediaUrls[id] ?? mediaUrls[token] ?? token);
}
async function onClick(event: MouseEvent) {
  const button = (event.target as HTMLElement).closest('button.copy');
  if (!button) return;
  event.preventDefault();
  event.stopPropagation();
  const code = button.parentElement?.querySelector('pre code') ?? button.parentElement?.querySelector('pre');
  if (!code) return;
  try {
    await navigator.clipboard.writeText(code.textContent ?? '');
    showCopyState(button, 'copied', '已复制');
  } catch {
    const range = document.createRange();
    range.selectNodeContents(code);
    const selection = window.getSelection();
    selection?.removeAllRanges(); selection?.addRange(range);
    showCopyState(button, 'error', '复制不可用，指令已选中，请手动复制');
  }
}
</script>
<template>
  <div class="learning-source vp-doc" :class="{ 'learning-source--reference': reference, 'learning-source--prompts': promptInstructions && !reference }" @click="onClick" @error.capture="mediaError">
    <template v-for="(block, index) in blocks" :key="`${step.id}-${index}`">
      <MermaidDiagram v-if="block.kind === 'mermaid'" :graph="encodeURIComponent(block.value)" />
      <div v-else v-html="resolveMedia(block.value)"></div>
    </template>
    <p v-if="notice" class="learning-notice" role="status">{{ notice }}</p>
  </div>
</template>
