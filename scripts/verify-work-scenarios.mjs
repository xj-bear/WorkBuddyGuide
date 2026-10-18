// 使用本地预览和独立浏览器验证网站，不执行场景中的 WorkBuddy 指令。
import { createRequire } from 'node:module';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const urlIndex = process.argv.indexOf('--url');
const base = urlIndex >= 0 ? process.argv[urlIndex + 1] : 'http://127.0.0.1:5174';
const content = JSON.parse(await readFile(path.join(root, 'learning/content.generated.json'), 'utf8'));
const out = path.join(root, 'artifacts/work-scenarios-2026-10-18');
await mkdir(out, { recursive: true });
const report = { scope: '本站场景图文与导航验收，未运行 WorkBuddy 任务', categories: [], details: [], errors: [] };
const browser = await chromium.launch({ headless: true, ...(process.env.WORKBUDDY_BROWSER_EXECUTABLE ? { executablePath: process.env.WORKBUDDY_BROWSER_EXECUTABLE } : {}) });
const check = (condition, message) => { if (!condition) throw new Error(message); };
const course = content.lessons.find(item => item.id === 'wb-lesson-06');
const progressKey = 'workbuddy-learning-progress:v1';
const history = JSON.stringify({ schemaVersion: 1, lessons: { [course.id]: {
  contentVersion: course.contentVersion, lastStepId: course.steps[0].id, readComplete: false,
  practiceSelfConfirmed: false, markedComplete: true, confirmedStepIds: [], checklist: {},
  updatedAt: '2026-10-17T00:00:00.000Z', completedAt: '2026-10-17T00:00:00.000Z',
} } });

try {
  for (const width of [1440, 390]) {
    const context = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 1000 } });
    await context.addInitScript(({ key, history }) => {
      if (!localStorage.getItem(key)) localStorage.setItem(key, history);
      Object.defineProperty(navigator, 'clipboard', { value: { writeText: async text => { window.__scenarioCopiedText = text; } }, configurable: true });
    }, { key: progressKey, history });
    const page = await context.newPage();
    page.on('pageerror', error => report.errors.push(String(error)));
    const visit = async route => {
      const response = await page.goto(base + route);
      check(response?.ok(), '页面不可访问：' + route);
      await page.waitForLoadState('networkidle');
      check(!await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), '横向溢出：' + width + '/' + route);
    };

    await visit('/solve/');
    check(await page.locator('.learning-scenario-card').count() === 8, '八类工作场景入口变化');
    await page.screenshot({ path: path.join(out, `overview-${width}.png`), fullPage: true });

    for (const category of content.scenarios.filter(item => item.id !== 'life')) {
      await visit('/solve/' + category.id + '/');
      const expected = content.workScenarioCases.filter(item => item.categoryIds.includes(category.id));
      const hrefs = await page.locator('.learning-work-case-card').evaluateAll(cards => cards.map(card => card.getAttribute('href')));
      check(JSON.stringify(hrefs) === JSON.stringify(expected.map(item => item.url)), '场景卡片或跨分类地址不一致：' + category.id);
      check(await page.getByRole('heading', { name: '相关基础教程', exact: true }).isVisible(), '基础教程入口缺失：' + category.id);
      report.categories.push({ width, id: category.id, cases: hrefs.length });
      if (category.id === 'automation') await page.screenshot({ path: path.join(out, `automation-${width}.png`), fullPage: true });
    }

    for (const item of content.workScenarioCases) {
      report.currentPage = { width, id: item.id };
      await visit(item.url);
      const heading = await page.locator('.vp-doc h1').evaluate(element => {
        const text = element.cloneNode(true);
        text.querySelectorAll('.header-anchor').forEach(anchor => anchor.remove());
        return text.textContent.trim();
      });
      check(heading === item.title, '案例标题不一致：' + item.id);
      check(await page.locator('.vp-doc h2').count() >= 5, '案例说明不完整：' + item.id);
      for (const image of await page.locator('.vp-doc img').all()) {
        await image.scrollIntoViewIfNeeded();
        const imageHandle = await image.elementHandle();
        try {
          await page.waitForFunction(element => element.complete, imageHandle, { timeout: 15000 });
        } finally {
          await imageHandle.dispose();
        }
        check(await image.evaluate(element => element.naturalWidth > 0), '案例图片不可访问：' + item.id);
      }
      const image = page.locator('.vp-doc img').first();
      if (await image.count()) {
        await image.click();
        await page.locator('.wb-image-lightbox').waitFor();
        await page.locator('.wb-image-lightbox__close').click();
        await page.locator('.wb-image-lightbox').waitFor({ state: 'hidden' });
      }
      const copy = page.locator('.vp-doc div[class*="language-"] button.copy').first();
      check(await copy.count() === 1, '场景缺少可复制指令：' + item.id);
      const expectedPrompt = await page.locator('.vp-doc div[class*="language-"] pre code').first().textContent();
      await copy.evaluate(element => element.scrollIntoView({ block: 'center', behavior: 'instant' }));
      await copy.hover();
      await copy.click();
      await page.waitForFunction(expected => window.__scenarioCopiedText?.trimEnd() === expected.trimEnd(), expectedPrompt);
      check(!await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), '图文交互后横向溢出：' + item.id);
      await page.evaluate(() => scrollTo(0, 0));
      if (['file-archive', 'sales-dashboard'].includes(item.id)) await page.screenshot({ path: path.join(out, `${item.id}-${width}.png`), fullPage: true });
      report.details.push({ width, id: item.id, images: await page.locator('.vp-doc img').count(), imageZoom: 'passed', copy: 'passed' });
    }

    await visit('/solve/life/');
    check(await page.locator('.learning-life-card').count() === 7, '生活助手七项指南发生变化');
    check(await page.locator('.learning-work-case-card').count() === 0, '工作案例混入生活助手');
    await visit('/learn/');
    check((await page.locator('.learning-progress-stats article strong').first().innerText()).replace(/\s+/g, '') === '1/26', '教程进度统计变化');
    check(await page.evaluate(key => localStorage.getItem(key), progressKey) === history, '场景浏览改写了历史课程进度');
    await context.close();
  }
  check(report.errors.length === 0, report.errors.join('\n'));
  report.historyCompatibility = '26关仍独立统计，历史记录原样保留，生活助手7项可用';
} catch (error) {
  report.errors.push(String(error));
  process.exitCode = 1;
} finally {
  await browser.close();
  await writeFile(path.join(out, 'browser-check.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
}
