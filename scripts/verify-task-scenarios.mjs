// 只检查本地工作方案的页面与交互，不执行 WorkBuddy 任务。
import { createRequire } from 'node:module';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const root = path.resolve(import.meta.dirname, '..');
const content = JSON.parse(await readFile(path.join(root, 'learning/content.generated.json'), 'utf8'));
const base = process.env.WORKBUDDY_CHECK_URL ?? 'http://127.0.0.1:5184';
const out = path.join(root, 'artifacts/task-scenarios-2026-10-18');
await mkdir(out, { recursive: true });
const report = { screens: [], cases: [], errors: [] };
const check = (condition, message) => { if (!condition) throw new Error(message); };
const forbidden = /公众号实战|公众号场景|连载第|稿件/;
const browser = await chromium.launch({ headless: true, ...(process.env.WORKBUDDY_BROWSER_EXECUTABLE ? { executablePath: process.env.WORKBUDDY_BROWSER_EXECUTABLE } : {}) });
try {
  for (const width of [1440, 390]) {
    const context = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 1000 } });
    await context.addInitScript(() => Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async text => { window.__taskCopied = text; } } }));
    const page = await context.newPage();
    page.on('pageerror', error => report.errors.push(String(error)));
    const visit = async route => {
      const response = await page.goto(base + route);
      check(response?.ok(), '页面不可用：' + route);
      await page.waitForLoadState('networkidle');
      check(!await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), '横向溢出：' + width + route);
    };
    for (const category of content.scenarios.filter(item => item.id !== 'life')) {
      await visit('/solve/' + category.id + '/');
      const expected = content.workScenarioCases.filter(item => item.categoryIds.includes(category.id));
      const cards = page.locator('.learning-work-case-card');
      check(await cards.count() === expected.length, '分类缺少工作方案：' + category.id);
      check(await cards.locator('.learning-number').count() === 0, '卡片仍使用文章篇号');
      for (const [index, item] of expected.entries()) {
        const text = await cards.nth(index).innerText();
        check(text.includes(item.pain) && text.includes(item.preparation) && text.includes(item.outcome), '卡片缺少痛点、准备或交付：' + item.id);
      }
      if (category.id === 'office') await page.screenshot({ path: path.join(out, `office-${width}.png`), fullPage: true });
    }
    for (const item of content.workScenarioCases) {
      await visit(`${item.url}?from=solve&category=${item.categoryIds[0]}&step=intro`);
      check(await page.locator('.learning-step-heading h2').innerText() === '工作痛点与目标', '首步不是工作问题：' + item.id);
      const text = await page.locator('.learning-step-body').innerText();
      check(text.includes(item.pain) && text.includes(item.outcome), '首步未说明痛点与目标：' + item.id);
      check((await page.locator('.learning-work-task-summary').innerText()).includes(item.preparation), '任务概要缺少准备材料：' + item.id);
      check(!forbidden.test(await page.locator('main.learning-shell').innerText()), '方案仍关联连载稿件：' + item.id);
      check(await page.locator('.learning-scenario-context').count() === 0, '详情混入泛分类介绍：' + item.id);
      if (item.id === 'batch-contracts') await page.screenshot({ path: path.join(out, `contract-intro-${width}.png`), fullPage: true });
      const next = page.locator('.learning-step-controls button').filter({ hasText: '下一步' });
      await next.scrollIntoViewIfNeeded();
      const box = await next.boundingBox();
      const before = await page.evaluate(() => scrollY);
      await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
      await page.waitForTimeout(200);
      const after = await page.evaluate(() => scrollY);
      check(Math.abs(after - before) <= 1, '切换准备步骤产生漂移：' + width + '/' + item.id);
      check(await page.locator('.learning-step-heading h2').innerText() === '开始前准备什么', '准备步骤不正确：' + item.id);
      check(!(await page.locator('.learning-step-body').innerText()).includes('练习资料包'), '准备仍依赖通用练习包：' + item.id);
      report.cases.push({ width, id: item.id, painPreparationOutcome: 'passed', scrollDelta: after - before });
    }
    await visit('/solve/cases/batch-contracts/?from=solve&category=office&step=action-1');
    const copy = page.locator('.learning-source button.copy').first();
    await copy.click({ force: true });
    check((await page.evaluate(() => window.__taskCopied))?.includes('只读「合同制作」'), '合同指令复制失败');
    await visit('/solve/cases/batch-contracts/?from=solve&category=office&step=prepare');
    const image = page.locator('.learning-source img').first();
    await image.evaluate(image => image.decode());
    await image.click();
    await page.locator('.wb-image-lightbox').waitFor();
    await page.locator('.wb-image-lightbox__close').click();
    await page.locator('.wb-image-lightbox').waitFor({ state: 'hidden' });
    await visit('/solve/cases/batch-contracts/?from=solve&category=office&step=verify');
    check(await page.locator('.learning-checklist input').count() > 0, '交付核对清单丢失');
    await visit('/solve/cases/batch-contracts/?from=solve&category=office&step=related');
    check(await page.locator('.learning-step-body a[href^="/learn/"]').count() > 0, '相关基础教程丢失');
    check(await page.locator('.learning-step-body a[href^="/bluebook/"]').count() > 0, '相关蓝皮书丢失');
    await visit('/learn/');
    check(await page.locator('.learning-roadmap-card').count() === 28, '章节路线变化');
    await visit('/solve/life/');
    check(await page.locator('.learning-life-card').count() === 7, '生活指南数量变化');
    report.screens.push({ width, categories: 'passed', cases: 11, copy: 'passed', imageZoom: 'passed', relatedLinks: 'passed' });
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
