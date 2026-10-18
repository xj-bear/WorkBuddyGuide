import { defineAsyncComponent, h } from "vue";
import DefaultTheme from "vitepress/theme-without-fonts";
import GroupQrMenu from "./components/GroupQrMenu.vue";
import HomePage from "./components/HomePage.vue";
import LearningPage from "./learning/LearningPage.vue";
import PixelIconSprite from "./components/PixelIconSprite.vue";
import { useData } from "vitepress";
import LessonRedirect from "./learning/LessonRedirect.vue";
import CommunityCases from "./components/CommunityCases.vue";
import ReaderDownload from "./components/ReaderDownload.vue";
import SiteFooter from "./components/SiteFooter.vue";
import ImageLightbox from "./components/ImageLightbox.vue";
import WorkScenarioPage from "./learning/WorkScenarioPage.vue";

import "./fonts.css";
import "./style.css";
import "./editorial.css";

const scrollActiveSidebarItemIntoView = () => {
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      const sidebar = document.querySelector<HTMLElement>(".VPSidebar");
      const activeItem = sidebar?.querySelector<HTMLElement>(
        ".VPSidebarItem.is-active",
      );

      if (!sidebar || !activeItem) return;

      const sidebarRect = sidebar.getBoundingClientRect();
      const activeRect = activeItem.getBoundingClientRect();
      const isVisible =
        activeRect.top >= sidebarRect.top &&
        activeRect.bottom <= sidebarRect.bottom;

      if (!isVisible) {
        sidebar.scrollTo({
          top:
            sidebar.scrollTop +
            activeRect.top -
            sidebarRect.top -
            sidebar.clientHeight / 2 +
            activeRect.height / 2,
          behavior: "smooth",
        });
      }
    });
  });
};

export default {
  extends: DefaultTheme,
  Layout: () =>
    h(DefaultTheme.Layout, null, {
      "doc-before": () => useData().page.value.relativePath === "bluebook/index.md" ? h(ReaderDownload) : null,
      "layout-bottom": () => [h(PixelIconSprite), h(SiteFooter), h(ImageLightbox)],
    }),
  enhanceApp({ app, router }) {
    app.component("GroupQrMenu", GroupQrMenu);
    app.component("HomePage", HomePage);
    app.component("LearningPage", LearningPage);
    app.component("LessonRedirect", LessonRedirect);
    app.component("CommunityCases", CommunityCases);
    app.component("WorkScenarioPage", WorkScenarioPage);
    app.component(
      "MermaidDiagram",
      defineAsyncComponent(() => import("./components/MermaidDiagram.vue")),
    );

    if (typeof window !== "undefined") {
      const previousAfterRouteChange = router.onAfterRouteChange;

      router.onAfterRouteChange = async (to) => {
        await previousAfterRouteChange?.(to);
        window.dispatchEvent(new Event("learning:route-change"));
        scrollActiveSidebarItemIntoView();
      };

      scrollActiveSidebarItemIntoView();
    }
  },
};
