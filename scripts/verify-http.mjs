import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
const base = 'http://127.0.0.1:5174';
const root = 'docs/.vitepress/dist';
const pages = [];
function walk(dir, prefix = '') { for (const item of readdirSync(dir, { withFileTypes: true })) {
  const relative = prefix + item.name;
  if (item.isDirectory()) walk(join(dir, item.name), relative + '/');
  else if (relative.endsWith('.html') && relative !== '404.html') pages.push('/' + relative.replace(/index\.html$/, '').replace(/\.html$/, ''));
} }
walk(root);
const failures = [];
for (let i = 0; i < pages.length; i += 8) await Promise.all(pages.slice(i, i + 8).map(async path => {
  const response = await fetch(new URL(path, base), { method: 'HEAD' });
  if (response.status !== 200) failures.push({ path, status: response.status });
}));
const notFound = await fetch(base + '/learn/wb-lesson-does-not-exist/', { method: 'HEAD' });
if (notFound.status !== 404) failures.push({ path: 'unknown route', status: notFound.status });
let video;
function findVideo(dir) { for (const item of readdirSync(dir, { withFileTypes: true })) { const file = join(dir, item.name); if(item.isDirectory()) findVideo(file); else if (/\.(mp4|webm)$/.test(file)) video ??= file; } }
findVideo(root);
const range = await fetch(base + '/' + video.slice(root.length + 1), { headers: { Range: 'bytes=0-63' } });
const rangeBytes = (await range.arrayBuffer()).byteLength;
if (range.status !== 206 || rangeBytes !== 64) failures.push({ path: 'video range', status: range.status, rangeBytes });
const report = { checkedAt: new Date().toISOString(), server: base, successfulRoutes: pages.length - failures.filter(item => pages.includes(item.path)).length, routeCount: pages.length, unknownRouteStatus: notFound.status, videoRangeStatus: range.status, rangeBytes, failures };
writeFileSync('delivery/http-report.json', JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report, null, 2)); if(failures.length) process.exitCode = 1;
