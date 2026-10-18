// 使用独立的临时浏览器，只验证本站界面，不执行任何 WorkBuddy Prompt。
import { createRequire } from 'node:module';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const base = process.argv.includes('--url') ? process.argv[process.argv.indexOf('--url') + 1] : 'http://127.0.0.1:5174';
const content = JSON.parse(await readFile(path.join(root, 'learning/content.generated.json'), 'utf8'));
const out = path.join(root, 'artifacts/task-tutorial-rewrite-2026-10-17');
await mkdir(out, { recursive: true });
const report = { scope: '网站界面与教学数据走查；未运行 WorkBuddy 任务', lessons: [], errors: [] };
const browser = await chromium.launch({ headless: true, ...(process.env.WORKBUDDY_BROWSER_EXECUTABLE ? { executablePath: process.env.WORKBUDDY_BROWSER_EXECUTABLE } : {}) });
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await context.addInitScript(() => Object.defineProperty(navigator, 'clipboard', { value: { writeText: async text => { window.__copiedPrompt = text; } }, configurable: true }));
  const page = await context.newPage();
  page.on('pageerror', error => report.errors.push(String(error)));
  for (const lesson of [...content.lessons, ...content.scenarioGuides]) {
    const category = lesson.categoryIds[0];
    const query = category ? `from=solve&category=${category}` : 'from=learn';
    const response = await page.goto(`${base}/learn/${lesson.id}/?${query}`);
    if (!response?.ok()) throw new Error('页面不可用：' + lesson.id);
    await page.waitForLoadState('networkidle');
    if (await page.locator('.learning-step-heading h2').innerText() !== lesson.steps[0].title) throw new Error('未从任务说明开始：' + lesson.id);
    if ((await page.locator('body').innerText()).includes('提前尝鲜')) throw new Error('仍显示预览：' + lesson.id);
    if (category && await page.locator('.learning-scenario-context').count() !== 1) throw new Error('场景上下文缺失：' + lesson.id);
    let prompts = 0;
    for (const [index, step] of lesson.steps.entries()) {
      await page.locator('.learning-step-nav button').nth(index).click();
      await page.waitForFunction(title => document.querySelector('.learning-step-heading h2')?.textContent === title, step.title);
      if (!(await page.locator('.tutorial-location').innerText()).trim() || !(await page.locator('.tutorial-expected').innerText()).trim()) throw new Error('操作位置或结果缺失：' + lesson.id + '/' + step.id);
      if (step.id === 'prepare' && lesson.materials.length) {
        const href = await page.locator('.tutorial-materials > a').getAttribute('href');
        const download = await context.request.get(base + href);
        if (!download.ok() || !(await download.body()).subarray(0, 2).equals(Buffer.from('PK'))) throw new Error('练习包下载失败：' + href);
      }
      for (const [i, prompt] of (step.prompts ?? []).entries()) {
        const card = page.locator('.tutorial-prompt').nth(i);
        if (!(await card.innerText()).includes(prompt.destination)) throw new Error('Prompt 去向缺失：' + lesson.id);
        await card.getByRole('button', { name: '复制 Prompt', exact: true }).click();
        if (!await card.getByRole('button', { name: '已复制', exact: true }).isVisible() || await page.evaluate(() => window.__copiedPrompt) !== prompt.text) throw new Error('Prompt 复制反馈错误：' + lesson.id);
        prompts++;
      }
      if (lesson.id === 'wb-lesson-06' && step.prompts?.length) await page.screenshot({ path: path.join(out, 'files-prompt-desktop.png'), fullPage: true });
    }
    if (!await page.getByRole('button', { name: '标记完成', exact: true }).isEnabled()) throw new Error('完成入口不可用：' + lesson.id);
    if (await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)) throw new Error('横向溢出：' + lesson.id);
    report.lessons.push({ id: lesson.id, steps: lesson.steps.length, prompts, walkthrough: 'passed' });
  }
  const files = content.lessons.find(item => item.number === 6);
  const promptStep = files.steps.find(step => step.prompts?.length);
  await page.goto(`${base}/learn/${files.id}/?from=solve&category=files&step=self-check`);
  await page.waitForLoadState('networkidle');
  await page.getByRole('button', { name: '标记完成', exact: true }).click();
  await page.locator('.learning-completion').waitFor();
  const continuation = await page.locator('.learning-completion__continue').getAttribute('href');
  if (!continuation?.includes('/wb-lesson-08/?from=solve&category=files')) throw new Error('场景推荐离开文件处理');
  report.scenarioRecommendation = continuation;
  const mobileContext = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await mobileContext.addInitScript(() => Object.defineProperty(navigator, 'clipboard', { value: { writeText: async text => { window.__copiedPrompt = text; } }, configurable: true }));
  const mobile = await mobileContext.newPage();
  await mobile.goto(`${base}/learn/${files.id}/?from=solve&category=files&step=${promptStep.id}`);
  await mobile.waitForLoadState('networkidle');
  if (!await mobile.locator('.tutorial-prompt').isVisible() || !await mobile.locator('#learning-step-select').isVisible()) throw new Error('移动端 Prompt 或步骤选择不可见');
  await mobile.locator('#learning-step-select').selectOption('prepare');
  await mobile.locator('.tutorial-materials').waitFor();
  await mobile.locator('#learning-step-select').selectOption(promptStep.id);
  await mobile.locator('.tutorial-prompt').waitFor();
  await mobile.locator('.tutorial-prompt').getByRole('button', { name: '复制 Prompt', exact: true }).click();
  if (await mobile.evaluate(() => window.__copiedPrompt) !== promptStep.prompts[0].text) throw new Error('移动端复制错误');
  if (await mobile.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)) throw new Error('移动端横向溢出');
  await mobile.screenshot({ path: path.join(out, 'files-prompt-mobile.png'), fullPage: true });
  report.mobile = '390px 无横向溢出，Prompt 与步骤选择可用';
  const historyContext = await browser.newContext();
  await historyContext.addInitScript(() => localStorage.setItem('workbuddy-learning-progress:v1', JSON.stringify({schemaVersion:1,lessons:{'wb-lesson-06':{contentVersion:'previous-edition',lastStepId:'step-2',readComplete:false,practiceSelfConfirmed:false,markedComplete:true,confirmedStepIds:[],checklist:{},updatedAt:'2026-10-16',completedAt:'2026-10-16'}}})));
  const history = await historyContext.newPage();
  await history.goto(`${base}/learn/${files.id}/?from=solve&category=files&step=step-2`);
  await history.waitForLoadState('networkidle');
  if (await history.locator('.learning-step-heading h2').innerText() !== files.steps[0].title) throw new Error('旧断点没有回到任务说明');
  const retained = await history.evaluate(() => JSON.parse(localStorage.getItem('workbuddy-learning-progress:v1')).lessons['wb-lesson-06']);
  if (!retained.markedComplete || retained.contentVersion !== 'previous-edition') throw new Error('历史完成记录被覆盖');
  report.historyCompatibility = '旧版断点回任务说明，旧完成标记和版本保留';
  if (report.errors.length) throw new Error(report.errors.join('\n'));
  await writeFile(path.join(out, 'browser-check.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify({ lessons: report.lessons.length, steps: report.lessons.reduce((n, x) => n + x.steps, 0), prompts: report.lessons.reduce((n, x) => n + x.prompts, 0), errors: report.errors, mobile: report.mobile }));
} finally { await browser.close(); }
