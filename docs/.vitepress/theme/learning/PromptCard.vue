<script setup lang="ts">
import { onUnmounted, ref } from 'vue';
import type { TutorialPrompt } from '../../../../learning/types';
const props = defineProps<{ prompt: TutorialPrompt; simple?: boolean }>();
const status = ref('复制 Prompt');
const copying = ref(false);
const code = ref<HTMLElement>();
let timer: ReturnType<typeof setTimeout> | undefined;
let active = true;
async function copy() {
  copying.value = true;
  if (timer) clearTimeout(timer);
  try {
    await navigator.clipboard.writeText(props.prompt.text);
    if (active) status.value = '已复制';
  } catch {
    if (active && code.value) {
      const range = document.createRange();
      range.selectNodeContents(code.value);
      const selection = window.getSelection();
      selection?.removeAllRanges(); selection?.addRange(range);
      status.value = '请手动复制';
    }
  } finally {
    if (active) {
      copying.value = false;
      timer = setTimeout(() => { status.value = '复制 Prompt'; }, 1600);
    }
  }
}
onUnmounted(() => { active = false; if (timer) clearTimeout(timer); });
</script>
<template>
  <section class="tutorial-prompt" aria-label="可复制的 Prompt 提示词">
    <header><div><p class="tutorial-prompt__label">Prompt（提示词）</p><h3>{{ prompt.title }}</h3></div><button class="learning-button" :disabled="copying" @click="copy"><span aria-live="polite">{{ status }}</span></button></header>
    <p class="tutorial-prompt__destination"><strong>粘贴位置</strong>{{ prompt.destination }}</p>
    <p class="tutorial-prompt__hint">点击“复制 Prompt”，切回 WorkBuddy，将提示词粘贴到当前任务的对话输入框，核对内容后再发送。</p>
    <div v-if="prompt.preparation.length" class="tutorial-prompt__instructions"><strong>发送前准备</strong><ul><li v-for="item in prompt.preparation" :key="item">{{ item }}</li></ul></div>
    <div v-if="prompt.replacements.length || !simple" class="tutorial-prompt__instructions"><strong>发送前改成自己的内容</strong><ul v-if="prompt.replacements.length"><li v-for="item in prompt.replacements" :key="item">{{ item }}</li></ul><p v-else>换成自己的材料后，先核对文件路径与任务条件。</p></div>
    <pre ref="code" tabindex="0"><code>{{ prompt.text }}</code></pre>
  </section>
</template>
