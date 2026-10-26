// chrome-headless-shell 封装：每次调用用独立的临时配置目录（并发不互锁），带硬超时
import { spawn } from 'node:child_process';
import { readdirSync, mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = path.join(process.env.LOCALAPPDATA, 'ms-playwright');
const dir = readdirSync(root).filter((d) => d.startsWith('chromium_headless_shell')).sort().pop();
export const exe = path.join(root, dir, 'chrome-headless-shell-win64', 'chrome-headless-shell.exe');
const base = path.join(process.env.TEMP, 'uig');
mkdirSync(base, { recursive: true });

export function run(args, { ms = 40000, scale = 1 } = {}) {
  const profile = mkdtempSync(path.join(base, 'chs-'));
  return new Promise((resolve) => {
    const p = spawn(exe, ['--no-first-run', '--disable-gpu', '--hide-scrollbars', `--force-device-scale-factor=${scale}`,
      `--user-data-dir=${profile}`, '--allow-file-access-from-files', ...args], { windowsHide: true });
    let out = '', err = '', finished = false;
    p.stdout.on('data', (b) => (out += b));
    p.stderr.on('data', (b) => { if (err.length < 200000) err += b; });
    const done = (timeout) => {
      if (finished) return;
      finished = true;
      clearTimeout(t);
      setTimeout(() => { try { rmSync(profile, { recursive: true, force: true, maxRetries: 3 }); } catch {} }, 300);
      resolve({ out, err, timeout });
    };
    const t = setTimeout(() => { p.kill(); done(true); }, ms);
    p.on('close', () => done(false));
    p.on('error', () => done(false));
  });
}

export const fileUrl = (abs, query) => pathToFileURL(abs).href + (query ? '?' + query : '');

export async function pool(items, n, fn) {
  let i = 0;
  await Promise.all(Array.from({ length: Math.max(1, Math.min(n, items.length)) }, async () => {
    while (i < items.length) { const k = i++; await fn(items[k], k); }
  }));
}

export async function walkHtml(dir, readdir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walkHtml(p, readdir)));
    else if (e.name.endsWith('.html')) out.push(p);
  }
  return out.sort();
}
