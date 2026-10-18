import { mount } from '@vue/test-utils';
import { defineComponent, ref } from 'vue';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useDocNavigationBounds } from './useDocNavigationBounds';

let footerTop = 600;
let nextFrame = 0;
let frames: Map<number, FrameRequestCallback>;
let reflow: ResizeObserverCallback;
let disconnect: ReturnType<typeof vi.fn>;
const originalHeight = window.innerHeight;

const subject = defineComponent({
  setup() {
    const footer = ref<HTMLElement | null>(null);
    useDocNavigationBounds(footer);
    return { footer };
  },
  template: '<div class="Layout bluebook-directory"><nav class="VPNav"/><main id="VPContent"/><footer id="contact" ref="footer"/></div>',
});
function flushFrames() {
  const pending = [...frames.values()];
  frames.clear();
  pending.forEach(callback => callback(0));
}
beforeEach(() => {
  footerTop = 600;
  frames = new Map();
  Object.defineProperty(window, 'innerHeight', { configurable: true, writable: true, value: 900 });
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => {
    frames.set(++nextFrame, callback);
    return nextFrame;
  });
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(id => { frames.delete(id); });
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function () {
    return { top: this.id === 'contact' ? footerTop : 0, bottom: 64 } as DOMRect;
  });
  disconnect = vi.fn();
  vi.stubGlobal('ResizeObserver', class {
    constructor(callback: ResizeObserverCallback) { reflow = callback; }
    observe() {}
    disconnect = disconnect;
  });
});
afterEach(() => {
  Object.defineProperty(window, 'innerHeight', { configurable: true, writable: true, value: originalHeight });
  vi.unstubAllGlobals();
});

describe('蓝皮书导航与页脚边界', () => {
  it('页脚进入视口时收缩导航区域，离开时恢复，并防止负尺寸', () => {
    const wrapper = mount(subject, { attachTo: document.body });
    const layout = wrapper.element as HTMLElement;
    flushFrames();
    expect(layout.style.getPropertyValue('--wb-doc-navigation-bottom')).toBe('300px');
    footerTop = 400;
    window.dispatchEvent(new Event('scroll'));
    flushFrames();
    expect(layout.style.getPropertyValue('--wb-doc-navigation-bottom')).toBe('500px');
    footerTop = 1200;
    window.dispatchEvent(new Event('scroll'));
    flushFrames();
    expect(layout.style.getPropertyValue('--wb-doc-navigation-bottom')).toBe('0px');
    footerTop = -20;
    window.dispatchEvent(new Event('scroll'));
    flushFrames();
    expect(layout.style.getPropertyValue('--wb-doc-navigation-bottom')).toBe('900px');
    expect(layout.hasAttribute('data-doc-navigation-hidden')).toBe(true);
    wrapper.unmount();
  });

  it('正文图片重排与窗口高度变化时同步边界，切离蓝皮书后清理状态', () => {
    const wrapper = mount(subject, { attachTo: document.body });
    const layout = wrapper.element as HTMLElement;
    flushFrames();
    footerTop = 700;
    reflow([], {} as ResizeObserver);
    flushFrames();
    expect(layout.style.getPropertyValue('--wb-doc-navigation-bottom')).toBe('200px');
    window.innerHeight = 800;
    window.dispatchEvent(new Event('resize'));
    flushFrames();
    expect(layout.style.getPropertyValue('--wb-doc-navigation-bottom')).toBe('100px');
    layout.className = 'Layout';
    window.dispatchEvent(new Event('learning:route-change'));
    flushFrames();
    expect(layout.style.getPropertyValue('--wb-doc-navigation-bottom')).toBe('');
    expect(layout.hasAttribute('data-doc-navigation-hidden')).toBe(false);
    wrapper.unmount();
    expect(disconnect).toHaveBeenCalledOnce();
    window.dispatchEvent(new Event('scroll'));
    expect(frames.size).toBe(0);
  });
});
