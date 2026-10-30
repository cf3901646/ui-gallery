// 把 kit/src/*.js 按固定顺序拼成 kit/ui.js（模板只引用 ui.js 一个脚本）。
//   m3color.js  官方 material-color-utilities 的打包结果（tools/build-m3color.mjs 生成）
//   runtime.js  URL 参数、postMessage、主题、滚动状态、演示交互、审查
//   motion.js   动效：标签栏最小化、sheet 分档拖动、玻璃高光等
// 用法：node tools/build-kit-js.mjs
import { readFile, writeFile, access } from 'node:fs/promises';
import path from 'node:path';

const ORDER = ['m3color.js', 'runtime.js', 'motion.js'];
const dir = path.join(process.cwd(), 'kit', 'src');
let out = '/* UI Kit 运行时。自动生成，勿手改：改 kit/src/ 下的文件后运行 node tools/build-kit-js.mjs */\n';
const used = [];
for (const f of ORDER) {
  const p = path.join(dir, f);
  try { await access(p); } catch { continue; }
  out += `\n/* ===== kit/src/${f} ===== */\n` + (await readFile(p, 'utf8')).trim() + '\n';
  used.push(f);
}
await writeFile(path.join(process.cwd(), 'kit', 'ui.js'), out);
console.log('kit/ui.js ←', used.join(' + '), `(${(out.length / 1024).toFixed(1)} KB)`);
