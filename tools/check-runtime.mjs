// 检查运行时是否生效：Google 模式的官方 HCT 配色、Apple 玻璃透明度参数
// 用法：node tools/check-runtime.mjs
import path from 'node:path';
import { run, fileUrl } from './chs.mjs';
const page = path.resolve('templates/app/settings.html');
for (const q of ['lang=google', 'lang=google&accent=%23006a6a&scheme=dark', 'lang=google&contrast=more', 'lang=apple&glass=0.2']) {
  const r = await run(['--virtual-time-budget=2000', '--window-size=402,874', '--dump-dom', fileUrl(page, q)]);
  const tag = (r.out.match(/<html[^>]*>/) || [''])[0];
  const m3 = (tag.match(/data-m3="(\w+)"/) || [])[1];
  const prim = (tag.match(/--md-primary:\s*(#[0-9a-f]+)/) || [])[1];
  const gt = (tag.match(/--glass-t:\s*([\d.]+)/) || [])[1];
  console.log(q.padEnd(44), 'data-m3=' + m3, 'primary=' + prim, 'glass-t=' + gt);
}
