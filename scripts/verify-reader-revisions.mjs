// 验证本地网页的阅读和复制交互，不向 WorkBuddy 发送任务。
import { createRequire } from 'node:module';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const root = path.resolve(import.meta.dirname, '..');
const content = JSON.parse(await readFile(path.join(root, 'learning/content.generated.json'), 'utf8'));
const base = process.env.WORKBUDDY_CHECK_URL ?? 'http://127.0.0.1:5184';
const out = path.join(root, 'artifacts/reader-revisions-2026-10-18');
await mkdir(out, { recursive: true });
const report = { screens: [], cases: [], errors: [] };
const check = (condition, message) => { if (!condition) throw new Error(message); };
const browser = await chromium.launch({ headless: true, executablePath: process.env.WORKBUDDY_BROWSER_EXECUTABLE });
try {
  for (const width of [1440, 390]) {
    const context = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 1000 } });
    await context.addInitScript(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async text => { window.__readerCopied = text; } } }));
    const page = await context.newPage();
    page.on('pageerror', error => report.errors.push(String(error)));
    const visit = async route => {
      const response = await page.goto(base + route);
      check(response?.ok(), '页面不可用：' + route);
      await page.waitForLoadState('networkidle');
      check(!await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), '横向溢出：' + width + route);
    };
    const snapshot = async name => {
      await page.evaluate(() => Promise.all([...document.images].map(img => img.decode().catch(() => {}))));
      await page.screenshot({ path: path.join(out, `${name}-${width}.png`), fullPage: true });
    };
    const nextWithoutDrift = async id => {
      const next = page.locator('.learning-step-controls button').filter({ hasText: '下一步' });
      await next.scrollIntoViewIfNeeded();
      const box = await next.boundingBox();
      const before = await page.evaluate(() => scrollY);
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      await page.waitForTimeout(200);
      const delta = await page.evaluate(() => scrollY) - before;
      check(Math.abs(delta) <= 1, `下一步漂移：${width}/${id}/${delta}`);
      return delta;
    };
    for (const item of content.workScenarioCases) {
      const promptStep = content.workScenarioGuides.find(guide => guide.id === 'wb-work-' + item.id).steps.find(step => step.html?.includes('language-text'));
      check(!!promptStep, '方案缺少提示词步骤：' + item.id);
      await visit(`${item.url}?from=solve&category=${item.categoryIds[0]}&step=${promptStep.id}`);
      const prompts = page.locator('.learning-source--prompts div.language-text');
      const count = await prompts.count();
      check(count > 0, '没有提示词：' + item.id);
      check(await page.locator('.learning-prompt-guide').count() === count, '提示词缺少复制说明：' + item.id);
      check((await page.locator('.learning-prompt-guide').first().innerText()).includes('对话输入框'), '未明确粘贴位置：' + item.id);
      check(await prompts.locator('pre').evaluateAll(blocks => blocks.every(block => block.scrollWidth <= block.clientWidth + 1)), '提示词在手机上被截断：' + item.id);
      const expected = await prompts.first().locator('pre code').textContent();
      check(await prompts.first().locator('button.copy').evaluate(button => getComputedStyle(button, '::before').content.includes('复制 Prompt')), '复制按钮文字未更新：' + item.id);
      await prompts.first().locator('button.copy').click();
      await page.waitForFunction(expected => window.__readerCopied === expected, expected, { timeout: 2000 });
      check(await page.evaluate(() => window.__readerCopied) === expected, '提示词复制正文不一致：' + item.id);
      check(await prompts.first().locator('button.copy').getAttribute('data-copy-state') === 'copied', '无复制反馈：' + item.id);
      if (item.id === 'monthly-report-merge') await snapshot('monthly-prompt');
      report.cases.push({ width, id: item.id, promptHelpAndCopy: 'passed' });
    }
    for (const lesson of content.scenarioGuides) {
      const prefix = `/learn/${lesson.id}/?from=solve&category=life&step=`;
      await visit(prefix + 'intro');
      const intro = await page.locator('.learning-step-body').innerText();
      check(['你可能正在遇到', '这次怎么解决', '做完会得到'].every(text => intro.includes(text)), '生活指南缺少问题与办法：' + lesson.id);
      check(await page.locator('.learning-scenario-context').count() === 0, '生活指南重复分类说明：' + lesson.id);
      if (lesson.id === 'wb-life-trip-planning') await snapshot('travel-intro');
      await nextWithoutDrift(lesson.id + '/prepare');
      check((await page.locator('.learning-step-body').innerText()).includes('可以像这样描述'), '准备步骤缺少例子：' + lesson.id);
      await nextWithoutDrift(lesson.id + '/first-action');
      check(await page.locator('.tutorial-location, .tutorial-materials').count() === 0, '生活指南仍有目录或下载模板：' + lesson.id);
      check((await page.locator('.tutorial-prompt__hint').first().innerText()).includes('对话输入框'), '生活提示词缺少粘贴说明：' + lesson.id);
      const firstPrompt = page.locator('.tutorial-prompt').first();
      await firstPrompt.getByRole('button', { name: '复制 Prompt', exact: true }).click();
      check(await page.evaluate(() => window.__readerCopied) === await firstPrompt.locator('pre code').textContent(), '生活提示词复制错误：' + lesson.id);
      check(await firstPrompt.getByRole('button', { name: '已复制', exact: true }).count() === 1, '生活提示词无反馈：' + lesson.id);
      if (lesson.id === 'wb-life-trip-planning') await snapshot('travel-first-prompt');
      for (let index = 3; index < lesson.steps.length; index++) {
        await nextWithoutDrift(lesson.id + '/' + lesson.steps[index].id);
        check(!await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), '生活步骤横向溢出：' + lesson.id);
        check(!/output\/life|input\/life|workbuddy-practice|工作目录选择器/.test(await page.locator('.learning-step-body').innerText()), '生活指南仍依赖旧文件流程：' + lesson.id);
      }
      check(await page.locator('.learning-checklist input').count() > 0, '生活指南无结果核对：' + lesson.id);
      await page.locator('.learning-step-controls button').filter({ hasText: '标记完成' }).click();
      check(await page.locator('.learning-completion__title').innerText() === '生活指南已标记完成', '生活指南无法完成：' + lesson.id);
      report.cases.push({ width, id: lesson.id, plainLanguage: 'passed', steps: lesson.steps.length, copyAndCompletion: 'passed', nextWithoutDrift: 'passed' });
    }
    await visit('/');
    await page.locator('.site-footer').scrollIntoViewIfNeeded();
    await page.evaluate(() => Promise.all([...document.querySelectorAll('.site-footer img')].map(img => img.decode())));
    const contacts = await page.locator('.site-footer__contact').evaluateAll(figures => figures.map(figure => {
      const image = figure.querySelector('img');
      const title = figure.querySelector('b');
      const imageBox = image.getBoundingClientRect();
      const titleBox = title.getBoundingClientRect();
      return { title: title.textContent, imageWidth: imageBox.width, imageHeight: imageBox.height, centerDelta: (imageBox.x + imageBox.width / 2) - (titleBox.x + titleBox.width / 2), textAlign: getComputedStyle(title).textAlign, loaded: image.naturalWidth > 0 };
    }));
    check(contacts.length === 2, '页脚二维码数量错误');
    check(contacts[0].title === '加入AI互助群' && contacts[1].title === '公众号：大熊的AI朋友', '页脚标题未更新');
    check(contacts.every(item => item.imageWidth === 104 && item.imageHeight === 104 && Math.abs(item.centerDelta) < 1 && item.textAlign === 'center' && item.loaded), '二维码未缩小居中：' + JSON.stringify(contacts));
    await page.locator('.site-footer').screenshot({ path: path.join(out, `footer-${width}.png`) });
    await visit('/learn/');
    check(await page.locator('.learning-roadmap-card').count() === 28, '学习路线28章异常');
    await visit('/solve/life/');
    check(await page.locator('.learning-life-card').count() === 7, '生活指南入口异常');
    report.screens.push({ width, contacts, roadmap: 28, lifeGuides: 7 });
    await context.close();
  }
  check(report.errors.length === 0, report.errors.join('\n'));
} catch (error) {
  report.errors.push(String(error));
  process.exitCode = 1;
} finally {
  await browser.close();
  await writeFile(path.join(out, 'browser-check.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
}
