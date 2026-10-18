import { mount, flushPromises } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import SourceBody from './SourceBody.vue';
import type { GuidedStep } from '../../../../learning/types';
const step: GuidedStep = {
  id: 'first', title: '阅读指令', lead: '', sourcePath: '', sourceHeading: '', sourceUrl: '',
  sourceMediaIds: [], confirmation: 'self_confirm', requiredForPractice: true, checklist: [],
  html: '<div class="language-text"><button class="copy" aria-label="复制指令"></button><pre><code>只生成清单，不移动文件。</code></pre></div>',
};
afterEach(() => { vi.unstubAllGlobals(); document.body.innerHTML = ''; });
describe('原文渲染交互', () => {
  it('场景文本提示词旁明确说明复制后粘贴到 WorkBuddy，且只复制正文', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    const wrapper = mount(SourceBody, { props: { step, promptInstructions: true } });
    expect(wrapper.get('.learning-prompt-guide').text()).toContain('WorkBuddy');
    expect(wrapper.get('.learning-prompt-guide').text()).toContain('当前任务的对话输入框');
    await wrapper.get('button.copy').trigger('click'); await flushPromises();
    expect(writeText).toHaveBeenCalledWith('只生成清单，不移动文件。');
    wrapper.unmount();
  });
  it('参考原文不被标成可直接执行的提示词', () => {
    const wrapper = mount(SourceBody, { props: { step, promptInstructions: true, reference: true } });
    expect(wrapper.find('.learning-prompt-guide').exists()).toBe(false);
    wrapper.unmount();
  });
  it('复制只写入指令，不触发确认', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    const wrapper = mount(SourceBody, { props: { step } });
    await wrapper.find('button').trigger('click'); await flushPromises();
    expect(writeText).toHaveBeenCalledWith('只生成清单，不移动文件。');
    expect(wrapper.find('button').attributes('data-copy-state')).toBe('copied');
    expect(wrapper.find('button').attributes('aria-label')).toBe('已复制');
    expect(wrapper.find('.learning-notice').exists()).toBe(false);
    expect(wrapper.emitted()).not.toHaveProperty('confirm');
    wrapper.unmount();
  });
  it('复制权限失败时提供手动选中文本，不报假成功', async () => {
    vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) } });
    const wrapper = mount(SourceBody, { props: { step }, attachTo: document.body });
    await wrapper.find('button').trigger('click'); await flushPromises();
    expect(wrapper.find('button').attributes('data-copy-state')).toBe('error');
    expect(wrapper.find('button').attributes('aria-label')).toBe('复制不可用，指令已选中，请手动复制');
    expect(wrapper.find('.learning-notice').exists()).toBe(false);
    expect(window.getSelection()?.toString()).toBe('只生成清单，不移动文件。');
    wrapper.unmount();
  });
  it('媒体失败提示查看原文，不把失败图片换成生成图', async () => {
    const wrapper = mount(SourceBody, { props: { step: { ...step, html: '<img src="/missing.png" alt="原截图">' } } });
    await wrapper.find('img').trigger('error');
    expect(wrapper.text()).toContain('教程媒体加载失败');
    expect(wrapper.find('img').attributes('src')).toBe('/missing.png');
    wrapper.unmount();
  });
});
