// 仅验证本地网站的章节阅读与联系入口，不执行 WorkBuddy 任务。
import { createRequire } from 'node:module';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const root = path.resolve(import.meta.dirname, '..');
const content = JSON.parse(await readFile(path.join(root, 'learning/content.generated.json'), 'utf8'));
const base = process.env.WORKBUDDY_CHECK_URL ?? 'http://127.0.0.1:5184';
const out = path.join(root, 'artifacts/bluebook-route-2026-10-18');
await mkdir(out, { recursive: true });
const report = { chapters: [], screens: [], errors: [] };
const check = (condition, message) => { if (!condition) throw new Error(message); };
const browser = await chromium.launch({ headless: true, ...(process.env.WORKBUDDY_BROWSER_EXECUTABLE ? { executablePath: process.env.WORKBUDDY_BROWSER_EXECUTABLE } : {}) });
try {
  for (const width of [1440, 390]) {
    const context = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 1000 } });
    await context.addInitScript(() => {
      Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText: async text => { window.__bluebookCopied = text; } } });
    });
    const page = await context.newPage();
    page.on('pageerror', error => report.errors.push(String(error)));
    const visit = async route => {
      const response = await page.goto(base + route);
      check(response?.ok(), '页面不可访问：' + route);
      await page.waitForLoadState('networkidle');
      check(!await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1), '横向溢出：' + width + route);
    };
    await visit('/learn/');
    const links = await page.locator('.learning-roadmap-card').evaluateAll(elements => elements.map(element => element.getAttribute('href')));
    check(JSON.stringify(links) === JSON.stringify(content.bluebookLessons.map(lesson => `/learn/${lesson.id}/?from=learn`)), '路线与蓝皮书章序不一致');
    check(await page.locator('.learning-stage').count() === 4, '蓝皮书四篇分组缺失');
    check(await page.locator('.learning-bluebook-readings a').count() === 3, '课外阅读或附录缺失');
    check((await page.locator('.site-footer__contacts figcaption b').allTextContents()).join(',') === '加入AI互助群,公众号：大熊的AI朋友', '联系入口顺序或数量错误');
    const qrSources = await page.locator('.site-footer__contacts img').evaluateAll(images => images.map(image => image.getAttribute('src')));
    check(JSON.stringify(qrSources) === JSON.stringify(['/brand/discussion-group-qr.png', '/brand/public-account-qr.png']), '二维码对应错误');
    await page.locator('.site-footer').scrollIntoViewIfNeeded();
    for (const image of await page.locator('.site-footer__contacts img').all()) {
      await image.evaluate(image => image.decode());
      check(await image.evaluate(image => image.naturalWidth > 0), '二维码未加载');
    }
    await page.locator('.site-footer').screenshot({ path: path.join(out, `footer-${width}.png`) });
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({ path: path.join(out, `roadmap-${width}.png`), fullPage: true });
    await visit('/learn/wb-lesson-04/?from=learn&step=open-weekly-task');
    await page.waitForURL('**/learn/wb-chapter-04/?from=learn');
    await page.locator('.learning-lesson-heading h1').filter({ hasText: '第 4 章' }).waitFor();
    const sample = width === 1440 ? content.bluebookLessons : content.bluebookLessons.filter(lesson => [1, 2, 4, 8, 28].includes(lesson.number));
    for (const lesson of sample) {
      await visit(`/learn/${lesson.id}/?from=learn`);
      check(await page.locator('.learning-lesson-heading h1').textContent() === lesson.title, '章节标题不一致：' + lesson.id);
      check(await page.locator('.tutorial-materials').count() === 0, '章节仍显示额外练习包：' + lesson.id);
      check(await page.locator('.tutorial-references').count() === 0, '原书图文仍被折叠成参考：' + lesson.id);
      report.chapters.push({ width, id: lesson.id, steps: lesson.steps.length });
    }
    const chapter = content.bluebookLessons.find(lesson => lesson.number === 4);
    const copyStep = chapter.steps.find(step => step.html.includes('class="copy"'));
    check(!!copyStep, '第4章指令复制入口缺失');
    await visit(`/learn/${chapter.id}/?from=learn&step=${copyStep.id}`);
    const code = page.locator('.learning-source div[class*="language-"] pre code').first();
    const copy = page.locator('.learning-source button.copy').first();
    await copy.evaluate(element => element.scrollIntoView({ block: 'center', behavior: 'instant' }));
    await copy.click({ force: true });
    check((await page.evaluate(() => window.__bluebookCopied))?.trimEnd() === (await code.textContent())?.trimEnd(), '指令复制内容不一致');
    const next = page.locator('.learning-step-controls button').filter({ hasText: '下一步' });
    await next.scrollIntoViewIfNeeded();
    const point = await next.boundingBox();
    const before = await page.evaluate(() => scrollY);
    await page.mouse.click(point.x + point.width / 2, point.y + point.height / 2);
    await page.waitForTimeout(200);
    const after = await page.evaluate(() => scrollY);
    check(Math.abs(before - after) <= 1, '下一步发生网页漂移：' + width + ' ' + before + '→' + after);
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({ path: path.join(out, `chapter04-${width}.png`), fullPage: true });
    await visit('/learn/wb-chapter-04/?from=learn&step=self-check');
    await page.locator('.learning-step-controls .learning-button--primary').click();
    check(await page.locator('.learning-completion__continue').getAttribute('href') === '/learn/wb-chapter-05/?from=learn', '章节完成后跳错下一章');
    const illustrated = content.bluebookLessons.find(lesson => lesson.number === 8);
    const imageStep = illustrated.steps.find(step => step.html.includes('<img'));
    await visit(`/learn/${illustrated.id}/?from=learn&step=${imageStep.id}`);
    for (const image of await page.locator('.learning-source img').all()) {
      await image.scrollIntoViewIfNeeded();
      await image.evaluate(image => image.decode());
      check(await image.evaluate(image => image.naturalWidth > 0), '章节原图未加载：' + width);
    }
    const chapterImage = page.locator('.learning-source img').first();
    await chapterImage.evaluate(image => image.decode());
    await chapterImage.click();
    await page.locator('.wb-image-lightbox').waitFor();
    await page.locator('.wb-image-lightbox__close').click();
    await page.locator('.wb-image-lightbox').waitFor({ state: 'hidden' });
    await page.evaluate(() => scrollTo(0, 0));
    await page.screenshot({ path: path.join(out, `chapter08-${width}.png`), fullPage: true });
    await visit('/solve/');
    check(await page.locator('.learning-scenario-card').count() === 8, '原有工作分类变化');
    await visit('/solve/life/');
    check(await page.locator('.learning-life-card').count() === 7, '原有生活指南变化');
    await visit('/solve/cases/batch-contracts/?from=solve&category=office');
    check(await page.locator('.learning-step-controls').count() === 1, '场景分步交互变化');
    await visit('/learn/wb-lesson-04/?from=solve&category=office');
    check(new URL(page.url()).pathname === '/learn/wb-lesson-04/', '场景配套练习被错误跳转');
    await visit('/');
    check((await page.locator('.learning-entry--mint').textContent()).includes('28 章'), '首页仍展示旧练习路线');
    report.screens.push({ width, routeOrder: 'passed', qr: 'passed', imageZoom: 'passed', copy: 'passed', scrollDelta: after - before, nextChapter: 'passed', scenes: 'passed' });
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
