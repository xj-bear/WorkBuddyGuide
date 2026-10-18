import { mount, flushPromises } from '@vue/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';
import PromptCard from './PromptCard.vue';

const prompt = { title: '生成清单', text: '只读取 input/inbox，输出 output/inventory.xlsx。', destination: 'WorkBuddy → 当前任务的对话输入框', replacements: ['换成自己的目录时同步修改 input/inbox。'], preparation: ['先选择练习工作区。'] };
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers(); });
describe('Prompt 的用途与复制反馈', () => {
  it('说明去向、准备和替换内容，只复制 Prompt 正文，成功在按钮反馈', async () => {
    vi.useFakeTimers();
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    const wrapper = mount(PromptCard, { props: { prompt } });
    expect(wrapper.text()).toContain('Prompt（提示词）');
    expect(wrapper.text()).toContain(prompt.destination);
    expect(wrapper.text()).toContain('发送前准备');
    await wrapper.get('button').trigger('click'); await flushPromises();
    expect(writeText).toHaveBeenCalledWith(prompt.text);
    expect(wrapper.get('button').text()).toBe('已复制');
    expect(wrapper.find('.learning-notice').exists()).toBe(false);
    vi.advanceTimersByTime(1600); await wrapper.vm.$nextTick();
    expect(wrapper.get('button').text()).toBe('复制 Prompt');
    wrapper.unmount();
  });
  it('复制失败时不报假成功，选中文本并在按钮给出手动复制反馈', async () => {
    vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) } });
    const wrapper = mount(PromptCard, { props: { prompt }, attachTo: document.body });
    await wrapper.get('button').trigger('click'); await flushPromises();
    expect(wrapper.get('button').text()).toBe('请手动复制');
    expect(window.getSelection()?.toString()).toBe(prompt.text);
    wrapper.unmount();
  });
});
