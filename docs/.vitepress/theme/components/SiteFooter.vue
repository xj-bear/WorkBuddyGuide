<script setup lang="ts">
import { ref } from 'vue';
import { siteAssets } from '../../site';
import TrafficMetrics from './TrafficMetrics.vue';
import { useDocNavigationBounds } from './useDocNavigationBounds';
const footer = ref<HTMLElement | null>(null);
useDocNavigationBounds(footer);
const contacts = [
  { title: '加入AI互助群', alt: 'AI互助群二维码', path: siteAssets.discussionQr, note: '一起交流真实任务' },
  { title: '公众号：大熊的AI朋友', alt: '大熊的AI朋友公众号二维码', path: siteAssets.publicAccountQr, note: '获取更多工作方法' },
];
</script>
<template>
  <footer ref="footer" class="site-footer" id="contact">
    <div class="site-footer__top">
      <div class="site-footer__intro"><a class="site-footer__brand" href="/">WorkBuddy 蓝皮书</a><p>从一项任务，到自己的 AI 工作团队。</p><p>大熊的 AI 朋友 · 社区实战读本</p><a v-if="siteAssets.pdf" :href="siteAssets.pdf" target="_blank" rel="noopener noreferrer">获取蓝皮书 PDF ↗</a><span v-else class="site-footer__pending">蓝皮书 PDF · 整理中</span></div>
      <div class="site-footer__contacts"><figure v-for="contact in contacts" :key="contact.title" class="site-footer__contact"><div v-if="contact.path" class="site-footer__code"><img :src="contact.path" :alt="contact.alt" width="104" height="104"></div><div v-else class="site-footer__code site-footer__code--pending" aria-label="二维码待补充">二维码待补充</div><figcaption><b>{{ contact.title }}</b><small>{{ contact.note }}</small></figcaption></figure></div>
    </div>
    <nav class="site-footer__links" aria-label="页脚导航"><a href="/learn/">学习路线</a><a href="/solve/">实战场景</a><a href="/cases/">社区案例</a><a href="/reading-guide">阅读指南</a><a href="/help/">帮助与交流</a><a href="/community/case-contributing">参与共创</a><a href="#VPContent">回到顶部 ↑</a></nav>
    <TrafficMetrics v-if="siteAssets.trafficEndpoint" :endpoint="siteAssets.trafficEndpoint" />
    <div class="site-footer__legal"><p>非官方社区学习资料。原蓝皮书与案例保留原作者署名，来源：<a href="https://github.com/AlephAITech/WorkBuddyGuide" target="_blank" rel="noreferrer">WorkBuddyGuide</a>。</p><p>Pixel icons by <a href="https://github.com/hackernoon/pixel-icon-library" target="_blank" rel="noreferrer">HackerNoon</a> · <a href="https://github.com/hackernoon/pixel-icon-library#license-free--starter--pro" target="_blank" rel="noreferrer">许可</a>（统一配色与 Sprite 封装） · <a href="/about/">关于与学习记录说明</a></p></div>
  </footer>
</template>

<style scoped>
.site-footer .site-footer__contacts{display:grid;grid-template-columns:repeat(2,minmax(0,190px));justify-content:center;align-items:start;gap:28px}
.site-footer .site-footer__contact{display:flex;flex-direction:column;align-items:center;min-width:0;margin:0;text-align:center}
.site-footer .site-footer__code{display:grid;place-items:center;width:104px;height:104px;margin:0;background:#fff;border-radius:4px}
.site-footer .site-footer__code img{display:block;width:104px;height:104px;max-width:100%;object-fit:contain}
.site-footer .site-footer__code--pending{border:1px dashed var(--vp-c-divider);color:var(--vp-c-text-2);font-size:11px}
.site-footer .site-footer__contact figcaption{display:flex;flex-direction:column;align-items:center;gap:6px;min-height:0;margin-top:12px;text-align:center}
.site-footer .site-footer__contact b{font-size:13px;font-weight:650;line-height:1.7;overflow-wrap:anywhere}
.site-footer .site-footer__contact small{font-size:11px;line-height:1.7;color:var(--vp-c-text-2)}
@media(max-width:767px){.site-footer .site-footer__contacts{grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.site-footer .site-footer__contact b{font-size:12px}}
</style>
