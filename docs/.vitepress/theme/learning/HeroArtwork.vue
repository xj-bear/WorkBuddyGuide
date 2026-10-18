<script setup lang="ts">
import { ref } from 'vue';
const paused = ref(false);
const source = '/images/workbuddy-workspace-pixel-v2.png';
// These regions reference the original PNG; no character is redrawn in CSS.
const stars = [[398, 319, 484, 407], [1087, 530, 1144, 592], [241, 498, 285, 545], [833, 230, 876, 274], [970, 406, 1009, 448], [328, 612, 363, 648]];
const clip = ([left, top, right, bottom]: number[]) => `inset(${top / 1086 * 100}% ${(1448 - right) / 1448 * 100}% ${(1086 - bottom) / 1086 * 100}% ${left / 1448 * 100}%)`;
</script>

<template>
  <div class="learning-hero-animation" :class="{ 'is-paused': paused }">
    <figure class="learning-hero-animation__stage" role="img" aria-label="WorkBuddy 用户使用笔记本电脑工作，身边的 AI 小伙伴与像素星点轻轻跃动">
      <img class="learning-hero-animation__layer learning-hero-animation__worker" :src="source" alt="" width="1448" height="1086" decoding="async" />
      <img class="learning-hero-animation__layer" :src="source" :style="{ clipPath: clip([1095, 734, 1335, 901]) }" alt="" aria-hidden="true" />
      <img class="learning-hero-animation__layer learning-hero-animation__buddy" :src="source" :style="{ clipPath: clip([216, 709, 403, 899]) }" alt="" aria-hidden="true" />
      <img v-for="(star, index) in stars" :key="index" class="learning-hero-animation__layer learning-hero-animation__star" :src="source" :style="{ clipPath: clip(star), animationDelay: `${index * -.43}s` }" alt="" aria-hidden="true" />
    </figure>
    <button class="learning-hero-animation__toggle" type="button" :aria-pressed="paused" @click="paused = !paused">{{ paused ? '播放动效' : '暂停动效' }}</button>
  </div>
</template>

<style scoped>
.learning-hero-animation{position:relative;min-width:0}
.learning-hero-animation__stage{position:relative;aspect-ratio:4/3;margin:0;isolation:isolate}
.learning-hero-animation__layer{position:absolute;inset:0;display:block;width:100%;height:100%;object-fit:contain;image-rendering:pixelated;pointer-events:none}
.learning-hero-animation__worker{clip-path:polygon(37% 25.5%,62% 25.5%,62% 56%,78% 56%,78% 67.5%,75.6% 67.5%,75.6% 83.1%,28% 83.1%,28% 46%,37% 46%);animation:workbuddy-work 2.4s steps(2,end) infinite}
.learning-hero-animation__buddy{animation:workbuddy-hop 3.6s steps(3,end) infinite}
.learning-hero-animation__star{animation:workbuddy-twinkle 3.2s steps(2,end) infinite}
.learning-hero-animation__toggle{position:absolute;right:0;bottom:-8px;min-height:44px;padding:8px 4px;border:0;background:transparent;color:var(--learn-muted);font-size:11px!important;text-decoration:underline;text-underline-offset:4px}
.is-paused .learning-hero-animation__layer{animation-play-state:paused}
@keyframes workbuddy-work{0%,100%{transform:translateY(0)}50%{transform:translateY(-2px)}}
@keyframes workbuddy-hop{0%,15%,45%,100%{transform:translateY(0)}25%,35%{transform:translateY(-6px)}}
@keyframes workbuddy-twinkle{0%,70%,100%{opacity:1}35%,50%{opacity:.25}}
@media(prefers-reduced-motion:reduce){.learning-hero-animation__layer{animation:none!important}.learning-hero-animation__toggle{display:none}}
</style>
