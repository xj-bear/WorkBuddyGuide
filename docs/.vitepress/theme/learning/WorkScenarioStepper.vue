<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRoute } from 'vitepress';
import { buildWorkScenarioSteps, type WorkScenarioStep } from './workScenarioSteps';
import './work-scenario-stepper.css';

const route = useRoute();
const steps = ref<WorkScenarioStep[]>([]);
const activeIndex = ref(0);
let observer: IntersectionObserver | undefined;

const activeStep = computed(() => steps.value[activeIndex.value]);
const previousStep = computed(() => steps.value[activeIndex.value - 1]);
const nextStep = computed(() => steps.value[activeIndex.value + 1]);

function setActive(id: string) {
  const index = steps.value.findIndex(step => step.id === id);
  if (index >= 0) activeIndex.value = index;
}

function watchHeadings() {
  observer?.disconnect();
  if (typeof document === 'undefined') return;

  const content = document.querySelector('.vp-doc');
  if (!content) return;

  const headings = [...content.querySelectorAll('h2, h3')].map((heading) => {
    const cleanHeading = heading.cloneNode(true) as HTMLElement;
    cleanHeading.querySelectorAll('.header-anchor').forEach(anchor => anchor.remove());
    return { id: heading.id, tagName: heading.tagName, textContent: heading.textContent, title: cleanHeading.textContent };
  });
  steps.value = buildWorkScenarioSteps(headings);
  activeIndex.value = 0;

  if (typeof IntersectionObserver === 'undefined') return;
  observer = new IntersectionObserver((entries) => {
    const visible = entries
      .filter(entry => entry.isIntersecting)
      .sort((left, right) => left.boundingClientRect.top - right.boundingClientRect.top);
    if (visible[0]) setActive(visible[0].target.id);
  }, { rootMargin: '-100px 0px -70% 0px' });

  for (const step of steps.value) {
    const heading = document.getElementById(step.id);
    if (heading) observer.observe(heading);
  }
}

function goTo(step: WorkScenarioStep | undefined) {
  if (!step) return;
  setActive(step.id);
  document.getElementById(step.id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function selectStep(event: Event) {
  const id = (event.target as HTMLSelectElement).value;
  goTo(steps.value.find(step => step.id === id));
}

onMounted(() => {
  void nextTick(watchHeadings);
  window.addEventListener('learning:route-change', watchHeadings);
});

watch(() => route.path, () => { void nextTick(watchHeadings); });
onUnmounted(() => {
  observer?.disconnect();
  window.removeEventListener('learning:route-change', watchHeadings);
});
</script>

<template>
  <section v-if="steps.length" class="work-scenario-stepper" aria-label="案例步骤导航">
    <header class="work-scenario-stepper__header">
      <div>
        <p class="learning-eyebrow">WORK SCENARIO · STEP {{ activeIndex + 1 }} / {{ steps.length }}</p>
        <h2>按步骤完成并核对</h2>
      </div>
      <div class="work-scenario-stepper__current" aria-live="polite">
        <span>当前步骤</span>
        <strong>{{ activeStep?.title }}</strong>
      </div>
    </header>
    <progress :value="activeIndex + 1" :max="steps.length" :aria-label="`当前第 ${activeIndex + 1} 步，共 ${steps.length} 步`"></progress>
    <nav aria-label="选择案例步骤">
      <ol class="work-scenario-stepper__list">
        <li v-for="(step, index) in steps" :key="step.id">
          <button :class="{ 'is-active': index === activeIndex }" :aria-current="index === activeIndex ? 'step' : undefined" @click="goTo(step)">
            <span>{{ String(index + 1).padStart(2, '0') }}</span><span>{{ step.title }}</span>
          </button>
        </li>
      </ol>
      <label class="work-scenario-stepper__mobile-select">选择步骤
        <select :value="activeStep?.id" @change="selectStep">
          <option v-for="(step, index) in steps" :key="step.id" :value="step.id">{{ index + 1 }}. {{ step.title }}</option>
        </select>
      </label>
    </nav>
    <div class="work-scenario-stepper__controls">
      <button :disabled="!previousStep" @click="goTo(previousStep)">← 上一步</button>
      <button :disabled="!nextStep" @click="goTo(nextStep)">下一步 →</button>
    </div>
  </section>
</template>
