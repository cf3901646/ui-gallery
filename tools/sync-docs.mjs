// 把 kit/icons.js 里的真实图标清单写回 kit/COMPONENTS.md 的“全部 id”一段
import { readFile, writeFile } from 'node:fs/promises';
const js = await readFile('kit/icons.js', 'utf8');
const names = JSON.parse(js.match(/var NAMES = (\[.*?\]);/)[1]);
const google = js.match(/google: (".*?")\n/s)[1];
const fills = [...JSON.parse(google).matchAll(/id="i-([\w-]+)-fill"/g)].map((m) => m[1]).sort();
const md = await readFile('kit/COMPONENTS.md', 'utf8');
const start = md.indexOf('全部 id：');
const end = md.indexOf('\n\n## 6.', start);
const block = `全部 id（${names.length} 个）：${names.join(' ')}\n\n有实心版（\`-fill\` 后缀）的：${fills.join(' ')}`;
await writeFile('kit/COMPONENTS.md', md.slice(0, start) + block + md.slice(end));
console.log('icons', names.length, 'fills', fills.length);
