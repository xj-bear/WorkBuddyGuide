<script setup lang="ts">
import { siteAssets } from '../../site';
</script>
<template><aside class="reader-download" id="bluebook-download"><div><b>完整蓝皮书 · 在线与离线阅读</b><p>原教程图文完整保留，下载版与在线学习路线分别维护。</p></div><a v-if="siteAssets.pdf" :href="siteAssets.pdf" download>下载 PDF ↓</a><span v-else>PDF 整理中</span></aside></template>
<style scoped>.reader-download{display:flex;align-items:center;justify-content:space-between;gap:24px;border:1px solid var(--vp-c-divider);padding:20px;margin-bottom:32px;background:var(--vp-c-bg-soft);font-size:13px;line-height:1.8}.reader-download p{color:var(--vp-c-text-2);font-size:12px;margin-top:6px}.reader-download a,.reader-download>span{flex-shrink:0;font-size:12px;color:var(--vp-c-brand-1)}@media(max-width:500px){.reader-download{align-items:flex-start;flex-direction:column;gap:12px}}</style>
