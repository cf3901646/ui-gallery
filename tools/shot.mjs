// 截图与审查工具：用 Playwright 自带的 chrome-headless-shell，不依赖 npm 包。
// 用法：
//   node tools/shot.mjs shot <模板相对路径> <输出png> [w=402] [h=874] [query]
//   node tools/shot.mjs audit <模板相对路径...>      （每个模板 × 两种语言，输出 JSON 行）
// 每次调用都有 40 秒硬超时，超时直接 kill。
import { spawn } from 'node:child_process';
import { readdirSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = path.join(process.env.LOCALAPPDATA, 'ms-playwright');
const dir = readdirSync(root).filter((d) => d.startsWith('chromium_headless_shell')).sort().pop();
const exe = path.join(root, dir, 'chrome-headless-shell-win64', 'chrome-headless-shell.exe');
const base = path.join(process.env.TEMP, 'uig');
mkdirSync(base, { recursive: true });

// 每次调用用独立的临时配置目录，多个进程同时截图不会互相锁住
function run(args, ms = 40000) {
  const profile = mkdtempSync(path.join(base, 'chs-'));
  return new Promise((resolve) => {
    const p = spawn(exe, ['--no-first-run', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1',
      `--user-data-dir=${profile}`, '--allow-file-access-from-files', ...args], { windowsHide: true });
    let out = '';
    p.stdout.on('data', (b) => (out += b));
    p.stderr.on('data', () => {});
    const done = (timeout) => {
      clearTimeout(t);
      setTimeout(() => { try { rmSync(profile, { recursive: true, force: true, maxRetries: 3 }); } catch {} }, 300);
      resolve({ out, timeout });
    };
    const t = setTimeout(() => { p.kill(); done(true); }, ms);
    p.on('close', () => done(false));
  });
}
const url = (rel, query) => pathToFileURL(path.resolve(rel)).href + (query ? '?' + query : '');

const [cmd, ...rest] = process.argv.slice(2);
if (cmd === 'shot') {
  const [rel, png, w = '402', h = '874', query = ''] = rest;
  const r = await run(['--virtual-time-budget=2500', `--window-size=${w},${h}`, `--screenshot=${path.resolve(png)}`, url(rel, query)]);
  console.log(r.timeout ? 'TIMEOUT' : 'ok', png);
} else if (cmd === 'audit') {
  const w = process.env.AUDIT_W || '402';
  for (const rel of rest) {
    for (const lang of ['apple', 'google']) {
      const r = await run(['--virtual-time-budget=2500', `--window-size=${w},874`, '--dump-dom', url(rel, `audit=1&lang=${lang}`)]);
      const m = r.out.match(/<script type="application\/json" id="ui-audit">([\s\S]*?)<\/script>/);
      console.log(m ? m[1] : JSON.stringify({ url: rel, lang, error: r.timeout ? 'timeout' : 'no audit output' }));
    }
  }
} else {
  console.log('usage: shot|audit');
}
