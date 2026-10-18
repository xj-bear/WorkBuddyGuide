import {
  type AnalyticsEnv,
  type LiveTraffic,
  normalizeLiveTraffic,
  queryLiveTraffic,
} from "../lib/cloudflare-analytics";
import {
  type ArchiveTotals,
  type D1Database,
  formatShanghaiDate,
  getShanghaiDayStart,
  readArchiveTotals,
} from "../lib/traffic-archive";

interface Env extends AnalyticsEnv {
  TRAFFIC_DB: D1Database;
}

const PUBLIC_HOSTS = [
  "workbuddy-guide.pages.dev",
  "workbuddy.5678.fun",
];

function json(body: unknown, status = 200, cache = false): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": cache
        ? "public, s-maxage=300, stale-while-revalidate=600"
        : "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export function buildTrafficResponse(
  live: LiveTraffic,
  archive: ArchiveTotals,
  now: Date,
) {
  return {
    ...live,
    totalVisits: archive.visits + live.todayVisits,
    totalPageViews: archive.pageViews + live.todayPageViews,
    totalSince: archive.sinceDate,
    archivedThrough: archive.archivedThrough,
    updatedAt: now.toISOString(),
    archiveUpdatedAt: archive.updatedAt,
    timezone: "Asia/Shanghai",
    source: "cloudflare-rum+d1",
    stale: false,
    hosts: PUBLIC_HOSTS,
  };
}

export { getShanghaiDayStart, normalizeLiveTraffic };

export const onRequest: PagesFunction<Env> = async (context) => {
  if (context.request.method !== "GET" && context.request.method !== "HEAD") {
    return json({ error: "Method not allowed" }, 405);
  }

  const now = new Date();
  const todayStart = getShanghaiDayStart(now);

  try {
    const [live, archive] = await Promise.all([
      queryLiveTraffic(context.env, todayStart, now),
      readArchiveTotals(context.env.TRAFFIC_DB, formatShanghaiDate(todayStart)),
    ]);
    const traffic = buildTrafficResponse(live, archive, now);

    return context.request.method === "HEAD"
      ? new Response(null, {
          headers: {
            "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
            "Content-Type": "application/json; charset=utf-8",
          },
        })
      : json(traffic, 200, true);
  } catch (error) {
    console.error("Unable to load public traffic metrics", error);
    return json({ error: "Traffic metrics are temporarily unavailable" }, 502);
  }
};
