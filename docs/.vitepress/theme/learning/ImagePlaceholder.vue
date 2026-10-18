<script setup lang="ts">
withDefaults(defineProps<{ label?: string; src?: string; alt?: string }>(), { label: 'WORKBUDDY / WORKSPACE' });
</script>
<template>
  <figure class="learning-illustration" :class="{ 'learning-illustration--generated': !!src }" role="img" :aria-label="alt || label">
    <img v-if="src" :src="src" :alt="alt || ''" loading="eager" decoding="async" />
    <template v-else>
      <span class="learning-illustration__cross" aria-hidden="true">✚</span>
      <div class="learning-illustration__window" aria-hidden="true"><span>WB / WORKSPACE</span><b>&gt; _</b><i></i></div>
    </template>
    <figcaption v-if="label" class="learning-illustration__label">{{ label }}</figcaption>
  </figure>
</template>
