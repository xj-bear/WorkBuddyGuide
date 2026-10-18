import { flushPromises, mount } from "@vue/test-utils";
import { afterEach, describe, expect, it, vi } from "vitest";

import HomePage from "./TrafficMetrics.vue";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("HomePage traffic metrics", () => {
  it("renders today's and cumulative Web Analytics metrics", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            todayVisits: 2930,
            todayPageViews: 10160,
            totalVisits: 252560,
            totalPageViews: 1165000,
            totalSince: "2026-07-10",
            source: "cloudflare-rum+d1",
            stale: false,
          }),
          { status: 200 },
        ),
      ),
    );

    const wrapper = mount(HomePage);
    await flushPromises();

    const traffic = wrapper.get(".wb-traffic");
    expect(traffic.classes()).toContain("wb-traffic--ready");
    expect(traffic.text()).toContain("2,930");
    expect(traffic.text()).toContain("10,160");
    expect(traffic.text()).toContain("252.6K");
    expect(traffic.text()).toContain("1,165K");
    expect(
      wrapper.get('[title*="D1 永久保存"]').attributes("title"),
    ).toContain("2026-07-10");
  });
});
