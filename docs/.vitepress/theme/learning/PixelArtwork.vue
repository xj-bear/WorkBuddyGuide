<script setup lang="ts">
defineProps<{ scene: 'path' | 'solve' | 'roadmap' | 'celebrate'; message?: string }>();
const images = {
  path: '/images/workbuddy-learning-path.png',
  solve: '/images/workbuddy-problem-solving.png',
  roadmap: '/images/workbuddy-roadmap.png',
  celebrate: '/images/workbuddy-celebrate.png',
};
</script>

<template>
  <span class="learning-artwork" :class="`learning-artwork--${scene}`" aria-hidden="true">
    <span class="learning-artwork__crop"><img :src="images[scene]" alt="" width="512" height="384" decoding="async" /></span>
    <span v-if="message" class="learning-artwork__message">{{ message }}</span>
  </span>
</template>

<style scoped>
.learning-artwork{position:relative;display:block;flex-shrink:0;pointer-events:none}
.learning-artwork img{display:block;width:100%;height:auto;object-fit:contain;image-rendering:pixelated}
.learning-artwork__crop{display:block}
.learning-artwork--path,.learning-artwork--solve{display:flex;justify-content:center;align-items:flex-end;width:164px;height:112px}
.learning-artwork--path .learning-artwork__crop,.learning-artwork--solve .learning-artwork__crop,.learning-artwork--celebrate .learning-artwork__crop{position:relative;overflow:hidden;height:100%}
/* Normalize the visible alpha bounds; the source PNGs have different padding. */
.learning-artwork--path .learning-artwork__crop{aspect-ratio:855/625}
.learning-artwork--solve .learning-artwork__crop{aspect-ratio:1196/815}
.learning-artwork--path img{position:absolute;width:169.357%;max-width:none;left:-44.444%;top:-46.56%}
.learning-artwork--solve img{position:absolute;width:122.408%;max-width:none;left:-11.037%;top:-21.104%}
.learning-artwork__message{position:absolute;top:4%;right:0;max-width:126px;padding:9px 12px;border:1.5px solid var(--learn-ink);border-radius:4px;background:var(--learn-surface);color:var(--learn-ink);font-size:12px;font-weight:750;line-height:1.6;white-space:pre-line;text-align:left}
.learning-artwork--roadmap{width:280px;padding-right:112px}
.learning-artwork--celebrate{width:352px;max-width:100%;height:156px;margin:0 auto;padding-right:112px}
.learning-artwork--celebrate .learning-artwork__crop{aspect-ratio:1092/712}
.learning-artwork--celebrate img{position:absolute;width:132.601%;max-width:none;left:-17.491%;top:-26.966%}
.learning-artwork--celebrate .learning-artwork__message{right:0;top:6%;font-size:14px}
.learning-artwork__message:after{content:'';position:absolute;left:-5px;bottom:12px;width:8px;height:8px;border-left:1.5px solid var(--learn-ink);border-bottom:1.5px solid var(--learn-ink);background:var(--learn-surface);transform:rotate(45deg)}
@media(max-width:767px){.learning-artwork--roadmap{width:236px;padding-right:100px}.learning-artwork--celebrate{width:304px;height:140px;padding-right:90px}.learning-artwork__message{font-size:11px;padding:7px 9px;max-width:112px}.learning-artwork--celebrate .learning-artwork__message{font-size:12px}}
</style>
