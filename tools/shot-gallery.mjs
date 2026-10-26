// 截展示站本身：node tools/shot-gallery.mjs <hash> <输出png> [w=1440] [h=900] [等待ms=4000]
// 例：node tools/shot-gallery.mjs "#/t/app/settings" $env:TEMP\uig\shots\g.png
import path from 'node:path';
import { run, fileUrl } from './chs.mjs';
const [hash = '#/', out, w = '1440', h = '900', wait = '4000'] = process.argv.slice(2);
const url = fileUrl(path.resolve('index.html')) + hash;
const r = await run(['--enable-logging=stderr', '--v=0', `--virtual-time-budget=${wait}`, `--window-size=${w},${h}`, `--screenshot=${path.resolve(out)}`, url], { ms: 60000 });
const errs = [...r.err.matchAll(/"(Uncaught [^"]*)"[^\n]*source: ([^\s]*) \((\d+)\)/g)].map((m) => `${m[1]} @ ${m[2].split('/').pop()}:${m[3]}`);
console.log(r.timeout ? 'TIMEOUT' : 'ok', out, errs.length ? '\nJS 错误：\n  ' + [...new Set(errs)].join('\n  ') : '');
