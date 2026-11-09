#!/usr/bin/env node
/**
 * Renders render/scene.html to PNG frames with headless Chromium (SwiftShader WebGL).
 *
 *   node render/render_frames.js                 # full render: 60 s @ 30 fps -> render/frames/
 *   node render/render_frames.js --preview 0,3,8 # one PNG per listed second -> render/preview/
 *   node render/render_frames.js --workers 4 --fps 30 --duration 60
 *
 * Every frame is a pure function of time, so frames are split round-robin across workers.
 */
const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : def; };
const FPS = Number(opt('fps', 30));
const DURATION = Number(opt('duration', 60));
const WORKERS = Number(opt('workers', 4));
const PREVIEW = opt('preview', null);
const ROOT = path.resolve(__dirname);
const CAPTIONS = JSON.parse(fs.readFileSync(path.join(ROOT, '..', 'audio', 'build', 'timings.json'), 'utf8'));

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png' };
function serve() {
  return new Promise(resolve => {
    const srv = http.createServer((req, res) => {
      const file = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
      if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end(); }
      res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
      fs.createReadStream(file).pipe(res);
    });
    srv.listen(0, '127.0.0.1', () => resolve(srv));
  });
}

async function openPage(browser, port) {
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  page.on('pageerror', e => console.error('[page error]', e.message));
  page.on('console', m => { if (m.type() === 'error') console.error('[console]', m.text()); });
  await page.goto(`http://127.0.0.1:${port}/scene.html`);
  await page.waitForFunction(() => window.__sceneReady === true, null, { timeout: 60000 });
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(c => window.setCaptions(c), CAPTIONS);
  return page;
}

async function renderFrame(page, t, file) {
  await page.evaluate(tt => window.renderAt(tt), t);
  await page.screenshot({ path: file, type: 'png', clip: { x: 0, y: 0, width: 1080, height: 1920 } });
}

(async () => {
  const srv = await serve();
  const port = srv.address().port;
  const launch = () => chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--disable-gpu-vsync'] });

  if (PREVIEW !== null) {
    const outDir = path.join(ROOT, 'preview'); fs.mkdirSync(outDir, { recursive: true });
    const browser = await launch(); const page = await openPage(browser, port);
    for (const s of PREVIEW.split(',').map(Number)) {
      const t0 = Date.now(); await renderFrame(page, s, path.join(outDir, `t${String(s).replace('.', '_')}.png`));
      console.log(`preview t=${s}s in ${Date.now() - t0} ms`);
    }
    await browser.close(); srv.close(); return;
  }

  const total = Math.round(FPS * DURATION);
  const outDir = path.join(ROOT, 'frames'); fs.mkdirSync(outDir, { recursive: true });
  const t0 = Date.now(); let done = 0;
  await Promise.all(Array.from({ length: WORKERS }, async (_, w) => {
    const browser = await launch(); const page = await openPage(browser, port);
    for (let i = w; i < total; i += WORKERS) {
      const file = path.join(outDir, `f${String(i).padStart(5, '0')}.png`);
      if (!fs.existsSync(file)) await renderFrame(page, i / FPS, file);
      done++;
      if (done % 100 === 0 || done === total) {
        const el = (Date.now() - t0) / 1000; console.log(`${done}/${total} frames  ${el.toFixed(0)}s elapsed  eta ${(el / done * (total - done)).toFixed(0)}s`);
      }
    }
    await browser.close();
  }));
  srv.close();
  console.log(`rendered ${total} frames in ${((Date.now() - t0) / 1000).toFixed(0)}s -> ${outDir}`);
})().catch(e => { console.error(e); process.exit(1); });
