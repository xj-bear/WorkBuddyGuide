<script setup lang="ts">
import { onMounted, ref } from "vue";




const props = withDefaults(defineProps<{ endpoint?: string }>(), { endpoint: "/api/traffic" });

interface TrafficMetrics {
  todayVisits: number;
  todayPageViews: number;
  totalVisits: number;
  totalPageViews: number;
  totalSince: string;
  source: string;
  stale: boolean;
}

const traffic = ref<TrafficMetrics | null>(null);
const trafficState = ref<"loading" | "ready" | "error">("loading");
const numberFormatter = new Intl.NumberFormat("zh-CN");

const formatMetric = (value?: number) =>
  typeof value === "number" ? numberFormatter.format(value) : "—";

const formatTotalMetric = (value?: number) => {
  if (typeof value !== "number") return "—";
  if (value < 1000) return numberFormatter.format(value);

  return `${numberFormatter.format(
    Number((value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)),
  )}K`;
};

const totalMetricTitle = () =>
  traffic.value?.totalSince
    ? `自 ${traffic.value.totalSince} 起累计；完整日历史数据由 D1 永久保存`
    : "完整日历史数据由 D1 永久保存";

onMounted(async () => {
  try {
    const response = await fetch(props.endpoint, {
      headers: { Accept: "application/json" },
    });

    if (!response.ok) throw new Error(`Traffic API returned ${response.status}`);

    traffic.value = (await response.json()) as TrafficMetrics;
    trafficState.value = "ready";
  } catch {
    trafficState.value = "error";
  }
});
</script>
<template>
    <section
      v-if="trafficState === 'ready'"
      class="wb-traffic"
      :class="`wb-traffic--${trafficState}`"
      aria-label="网站访问数据"
      aria-live="polite"
    >
      <div class="wb-traffic__live">
        <span class="wb-traffic__dot" aria-hidden="true"></span>
        <b>{{ trafficState === "error" ? "OFFLINE" : "LIVE" }}</b>
      </div>
      <dl class="wb-traffic__metrics">
        <div title="Cloudflare Web Analytics Visits，不等同于严格去重用户数">
          <dt>今日访问</dt>
          <dd>{{ formatMetric(traffic?.todayVisits) }}</dd>
          <small>VISITS</small>
        </div>
        <div>
          <dt>今日浏览</dt>
          <dd>{{ formatMetric(traffic?.todayPageViews) }}</dd>
          <small>PV</small>
        </div>
        <div :title="totalMetricTitle()">
          <dt>累计访问</dt>
          <dd>{{ formatTotalMetric(traffic?.totalVisits) }}</dd>
          <small>VISITS</small>
        </div>
        <div :title="totalMetricTitle()">
          <dt>累计浏览</dt>
          <dd>{{ formatTotalMetric(traffic?.totalPageViews) }}</dd>
          <small>PV</small>
        </div>
      </dl>
    </section>
</template>
