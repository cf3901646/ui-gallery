// 静态检查模板：
//  - 必需的 <meta name="ui:*">、kit 引用
//  - 用到的 class 是否在 kit CSS 或页面内联 <style> 里定义过（防止写出不存在的组件类）
//  - 图标 id 是否存在
//  - 不允许外部资源（http/https 链接的图片、脚本、样式、字体）
// 用法：node tools/lint.mjs [模板路径...]   不传参数则检查 templates/ 下全部
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';

const ROOT = process.cwd();
const KIT = ['generated.css', 'base.css', 'apple.css', 'google.css', 'motion.css', 'utilities.css'];
const kitCss = (await Promise.all(KIT.map((f) => readFile(path.join(ROOT, 'kit', f), 'utf8')))).join('\n');
const classesIn = (css) => new Set([...css.replace(/url\([^)]*\)/g, '').matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)].map((m) => m[1]));
const KNOWN = classesIn(kitCss);
// 运行时由 ui.js 添加或纯语义用途、允许不带样式的类
for (const c of ['is-active', 'is-done', 'is-current', 'is-muted', 'is-today', 'is-selected', 'is-error', 'is-loading', 'is-disabled',
  'scrolled', 'title-in', 'toggle', 'selectable', 'single', 'hi', 'off', 'down', 'up', 'num', 'count', 'is-min', 'is-large']) KNOWN.add(c);
const iconsJs = await readFile(path.join(ROOT, 'kit', 'icons.js'), 'utf8');
const ICONS = new Set(JSON.parse(iconsJs.match(/var NAMES = (\[.*?\]);/)[1]));
for (const n of [...ICONS]) ICONS.add(n + '-fill');

async function walk(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p)));
    else if (e.name.endsWith('.html')) out.push(p);
  }
  return out;
}
const files = process.argv.length > 2 ? process.argv.slice(2).map((f) => path.resolve(f)) : await walk(path.join(ROOT, 'templates'));
const REQUIRED = ['ui:title', 'ui:desc', 'ui:category', 'ui:platform', 'ui:tags'];
const PLATFORMS = ['phone', 'tablet', 'desktop', 'web'];
let bad = 0;
for (const f of files) {
  const html = await readFile(f, 'utf8');
  const rel = path.relative(ROOT, f).replaceAll('\\', '/');
  const errs = [];
  for (const m of REQUIRED) if (!new RegExp(`<meta name="${m}" content="[^"]+"`).test(html)) errs.push('缺少 meta ' + m);
  const plat = (html.match(/<meta name="ui:platform" content="([^"]+)"/) || [])[1];
  if (plat && !PLATFORMS.includes(plat)) errs.push('ui:platform 只能是 ' + PLATFORMS.join('/'));
  const kitRel = path.relative(path.dirname(f), path.join(ROOT, 'kit')).replaceAll('\\', '/');
  for (const need of ['ui.css', 'icons.js', 'ui.js'].map((n) => `${kitRel}/${n}`)) if (!html.includes(need)) errs.push('缺少引用 ' + need);
  if (!/<html lang="zh-CN" data-lang="apple">/.test(html)) errs.push('<html> 必须是 lang="zh-CN" data-lang="apple"');
  const local = classesIn([...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join('\n'));
  const unknown = new Set();
  const markup = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/g, '');
  for (const m of markup.matchAll(/\sclass="([^"]*)"/g)) for (const c of m[1].split(/\s+/).filter(Boolean)) if (!KNOWN.has(c) && !local.has(c)) unknown.add(c);
  if (unknown.size) errs.push('未定义的 class: ' + [...unknown].join(' '));
  const missing = new Set();
  for (const m of html.matchAll(/href="#i-([\w-]+)"/g)) if (!ICONS.has(m[1])) missing.add(m[1]);
  if (missing.size) errs.push('不存在的图标: ' + [...missing].join(' '));
  if (/(src|href)="https?:\/\//.test(html.replace(/<a [^>]*>/g, ''))) errs.push('不允许外部资源（图片/样式/脚本）');
  if (/@import|<link[^>]+fonts\.googleapis/.test(html)) errs.push('不允许加载外部字体');
  if (errs.length) { bad++; console.log('✗ ' + rel + '\n   - ' + errs.join('\n   - ')); }
  else console.log('✓ ' + rel);
}
console.log(`\n${files.length} 个模板，${bad} 个有问题`);
process.exitCode = bad ? 1 : 0;
