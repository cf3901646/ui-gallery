// 并行渲染审查全部模板：按平台选宽度（手机 402 / 平板 1180 / 桌面 1440 / 网页 390 和 1280），两种语言，
// 检查横向溢出、缺失图标和页面 JS 报错。结果写到 tools/.cache/audit.json，终端只打印有问题的。
// 用法：node tools/audit-all.mjs [并发=6] [路径过滤，例如 web/]
import { readFile, readdir, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { run, fileUrl, pool, walkHtml } from './chs.mjs';

const ROOT = process.cwd();
const conc = +(process.argv[2] || 6), filter = process.argv[3] || '';
const WIDTHS = { phone: [402], tablet: [1180], desktop: [1440], web: [390, 1280] };
const files = (await walkHtml(path.join(ROOT, 'templates'), readdir)).filter((f) => f.replaceAll('\\', '/').includes(filter));
const jobs = [];
for (const f of files) {
  const html = await readFile(f, 'utf8');
  const plat = (html.match(/<meta name="ui:platform" content="([^"]+)"/) || [])[1] || 'web';
  const widths = path.basename(f).startsWith('_') ? [420, 1100] : WIDTHS[plat] || [1280];
  for (const w of widths) for (const lang of ['apple', 'google']) jobs.push({ f, rel: path.relative(ROOT, f).replaceAll('\\', '/'), w, lang, plat });
}
console.log('jobs', jobs.length, 'concurrency', conc);
const results = [];
let done = 0;
await pool(jobs, conc, async (j) => {
  const h = j.plat === 'phone' ? 874 : j.w < 500 ? 844 : 900;
  const safe = j.plat === 'phone' ? '62,34' : '0,0';
  const r = await run(['--enable-logging=stderr', '--v=0', '--virtual-time-budget=2500', `--window-size=${j.w},${h}`, '--dump-dom',
    fileUrl(j.f, `audit=1&lang=${j.lang}&safe=${safe}`)]);
  const m = r.out.match(/<script type="application\/json" id="ui-audit">([\s\S]*?)<\/script>/);
  const a = m ? JSON.parse(m[1]) : { error: r.timeout ? 'timeout' : 'no audit output' };
  const jsErrors = [...r.err.matchAll(/"(Uncaught [^"]*)"/g)].map((x) => x[1]).slice(0, 3);
  const res = { file: j.rel, lang: j.lang, width: j.w, ...a, jsErrors };
  results.push(res);
  done++;
  const bad = res.error || res.overflowX > 0 || (res.missingIcons && res.missingIcons.length) || jsErrors.length;
  if (bad) console.log('✗', j.rel, j.lang, j.w, JSON.stringify({ error: res.error, overflowX: res.overflowX, offenders: res.offenders, culprit: res.culprit, missing: res.missingIcons, js: jsErrors }));
  if (done % 25 === 0) console.log('progress', done, '/', jobs.length);
});
await mkdir(path.join(ROOT, 'tools', '.cache'), { recursive: true });
results.sort((a, b) => a.file.localeCompare(b.file) || a.width - b.width || a.lang.localeCompare(b.lang));
await writeFile(path.join(ROOT, 'tools', '.cache', 'audit.json'), JSON.stringify(results, null, 1));
const bad = results.filter((r) => r.error || r.overflowX > 0 || (r.missingIcons && r.missingIcons.length) || r.jsErrors.length);
console.log(`完成 ${results.length} 项，有问题 ${bad.length} 项`);
