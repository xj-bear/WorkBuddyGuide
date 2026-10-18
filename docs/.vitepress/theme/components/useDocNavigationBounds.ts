import { onMounted, onUnmounted, type Ref } from 'vue';

// 固定导航与正文共享页脚边界，并继续使用各自的内部滚动。
export function useDocNavigationBounds(footer: Ref<HTMLElement | null>) {
  let frame = 0;
  let observer: ResizeObserver | undefined;
  let layout: HTMLElement | null = null;

  function update() {
    frame = 0;
    layout = footer.value?.closest<HTMLElement>('.Layout') ?? null;
    if (!layout) return;
    if (!layout.matches('.bluebook-directory, .bluebook-page')) {
      layout.style.removeProperty('--wb-doc-navigation-bottom');
      layout.removeAttribute('data-doc-navigation-hidden');
      return;
    }
    const footerTop = footer.value!.getBoundingClientRect().top;
    const inset = Math.max(0, Math.min(window.innerHeight, window.innerHeight - footerTop));
    layout.style.setProperty('--wb-doc-navigation-bottom', `${Math.ceil(inset)}px`);
    const navBottom = document.querySelector('.VPNav')?.getBoundingClientRect().bottom ?? 64;
    layout.toggleAttribute('data-doc-navigation-hidden', footerTop <= navBottom + 48);
  }

  function schedule() {
    if (!frame) frame = window.requestAnimationFrame(update);
  }

  onMounted(() => {
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    window.addEventListener('learning:route-change', schedule);
    observer = new ResizeObserver(schedule);
    if (footer.value) observer.observe(footer.value);
    const content = document.querySelector('#VPContent');
    if (content) observer.observe(content);
    schedule();
  });

  onUnmounted(() => {
    window.removeEventListener('scroll', schedule);
    window.removeEventListener('resize', schedule);
    window.removeEventListener('learning:route-change', schedule);
    observer?.disconnect();
    if (frame) window.cancelAnimationFrame(frame);
    layout?.style.removeProperty('--wb-doc-navigation-bottom');
    layout?.removeAttribute('data-doc-navigation-hidden');
  });
}
