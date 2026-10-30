// 生成展示站缩略图：每个模板 × Apple / Google × 浅色 / 深色，webp，输出到 gallery/thumbs/
// 增量：缩略图比模板和 kit 都新时跳过；--force 全部重做。边跑边打印进度。
// 用法：node tools/build-thumbs.mjs [--force] [并发=6] [路径过滤，例如 app/settings]
import { readFile, readdir, stat, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { run, fileUrl, pool, walkHtml } from './chs.mjs';

const ROOT = process.cwd();
const argv = process.argv.slice(2);
const force = argv.includes('--force');
const rest = argv.filter((a) => a !== '--force');
const conc = +(rest[0] || 6), filter = rest[1] || '';
// 视口与缩放：缩略图宽约 240～480 像素
// 按卡片显示宽度的 2 倍渲染（高分屏不糊）；网页截两屏高，能看到首屏以下的内容
const SPEC = { phone: { w: 402, h: 874, s: 1 }, tablet: { w: 1180, h: 820, s: 0.68 }, desktop: { w: 1440, h: 900, s: 0.56 }, web: { w: 1280, h: 1600, s: 0.6 } };
const SAFE = { phone: { apple: '62,34', google: '48,24' }, tablet: { apple: '24,20', google: '24,20' } };
const OUT = path.join(ROOT, 'gallery', 'thumbs');
await mkdir(OUT, { recursive: true });

const KIT = ['ui.css', 'base.css', 'apple.css', 'google.css', 'utilities.css', 'generated.css', 'icons.js', 'ui.js'];
const kitM = Math.max(...(await Promise.all(KIT.map((f) => stat(path.join(ROOT, 'kit', f)).then((s) => s.mtimeMs)))));
const files = (await walkHtml(path.join(ROOT, 'templates'), readdir))
  .filter((f) => !path.basename(f).startsWith('_') && f.replaceAll('\\', '/').includes(filter));
const jobs = [];
for (const f of files) {
  const html = await readFile(f, 'utf8');
  const plat = (html.match(/<meta name="ui:platform" content="([^"]+)"/) || [])[1] || 'web';
  const key = path.relative(path.join(ROOT, 'templates'), f).replaceAll('\\', '/').replace(/\.html$/, '').replaceAll('/', '-');
  const srcM = Math.max((await stat(f)).mtimeMs, kitM);
  for (const lang of ['apple', 'google']) for (const scheme of ['light', 'dark']) {
    const out = path.join(OUT, `${key}.${lang}-${scheme}.webp`);
    if (!force) { try { if ((await stat(out)).mtimeMs > srcM) continue; } catch {} }
    jobs.push({ f, out, plat, lang, scheme, key });
  }
}
console.log(`需要生成 ${jobs.length} 张（并发 ${conc}）`);
let n = 0, fail = 0;
const t0 = Date.now();
await pool(jobs, conc, async (j) => {
  const sp = SPEC[j.plat] || SPEC.web;
  const safe = (SAFE[j.plat] || {})[j.lang] || '0,0';
  const r = await run(['--virtual-time-budget=2500', `--window-size=${sp.w},${sp.h}`, `--screenshot=${j.out}`,
    fileUrl(j.f, `lang=${j.lang}&scheme=${j.scheme}&safe=${safe}`)], { scale: sp.s });
  n++;
  if (r.timeout) fail++;
  console.log(`[${n}/${jobs.length}] ${r.timeout ? '超时 ' : ''}${j.key} ${j.lang}-${j.scheme}`);
});
console.log(`完成 ${n} 张，超时 ${fail} 张，用时 ${Math.round((Date.now() - t0) / 1000)} 秒`);
