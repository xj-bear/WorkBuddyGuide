import http from 'node:http';
import { createReadStream } from 'node:fs';
import { stat, realpath } from 'node:fs/promises';
import { resolve, join, extname, sep } from 'node:path';

// 仅供本机预览。生产部署请使用 SELF_HOSTING.md 中的静态服务器配置。
const root = await realpath(resolve('docs/.vitepress/dist'));
const port = Number(process.env.PORT || 5174);
const types = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.json':'application/json', '.xml':'application/xml', '.txt':'text/plain; charset=utf-8', '.png':'image/png', '.jpg':'image/jpeg', '.jpeg':'image/jpeg', '.gif':'image/gif', '.svg':'image/svg+xml', '.woff2':'font/woff2', '.mp4':'video/mp4', '.webm':'video/webm' };
http.createServer(async (req, res) => {
  try {
    const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
    const target = resolve(root, '.' + pathname);
    if (target !== root && !target.startsWith(root + sep)) { res.writeHead(403).end(); return; }
    let file;
    for (const candidate of [target, target + '.html', join(target, 'index.html')]) {
      try { if ((await stat(candidate)).isFile()) { file = await realpath(candidate); break; } } catch {}
    }
    const code = file ? 200 : 404;
    file ??= join(root, '404.html');
    if (!file.startsWith(root + sep)) { res.writeHead(403).end(); return; }
    const info = await stat(file);
    res.setHeader('Content-Type', types[extname(file)] || 'application/octet-stream');
    res.setHeader('Cache-Control', 'no-cache');
    const range = req.headers.range?.match(/^bytes=(\d+)-(\d*)$/);
    if (range && code === 200) {
      const start = Number(range[1]), end = Math.min(range[2] ? Number(range[2]) : info.size - 1, info.size - 1);
      if (start > end) { res.writeHead(416, { 'Content-Range': `bytes */${info.size}` }).end(); return; }
      res.writeHead(206, { 'Content-Range': `bytes ${start}-${end}/${info.size}`, 'Accept-Ranges': 'bytes', 'Content-Length': end - start + 1 });
      if (req.method === 'HEAD') res.end(); else createReadStream(file, { start, end }).pipe(res);
    } else {
      res.writeHead(code, { 'Content-Length': info.size, 'Accept-Ranges': 'bytes' });
      if (req.method === 'HEAD') res.end(); else createReadStream(file).pipe(res);
    }
  } catch { res.writeHead(400).end('Bad request'); }
}).listen(port, '127.0.0.1', () => console.log(`本机预览：http://127.0.0.1:${port}/`));
