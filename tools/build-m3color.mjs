// 把官方 @material/material-color-utilities（Apache-2.0）打包成 kit/src/m3color.js，暴露 window.M3Color。
// 用法：node tools/build-m3color.mjs <material-color-utilities 包目录> <esbuild 可执行文件>
// <esbuild> 是 esbuild npm 包所在目录（node_modules/esbuild），用它的 JS API
import { cpSync, rmSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const [pkg, esbuildDir] = process.argv.slice(2);
if (!pkg || !esbuildDir) throw new Error('用法：node tools/build-m3color.mjs <包目录> <esbuild 包目录>');
const esbuild = (await import(pathToFileURL(path.join(esbuildDir, 'lib', 'main.js')).href)).default;
const tmp = path.join(process.cwd(), 'tools', 'mcu');
rmSync(tmp, { recursive: true, force: true });
cpSync(pkg, tmp, { recursive: true });
const out = path.join(process.cwd(), 'kit', 'src', 'm3color.js');
try {
  await esbuild.build({ entryPoints: ['tools/m3color-entry.js'], bundle: true, minify: true, format: 'iife', globalName: 'M3Color', target: 'es2019', outfile: out, logLevel: 'warning' });
} finally {
  rmSync(tmp, { recursive: true, force: true });
}
const ver = JSON.parse(readFileSync(path.join(pkg, 'package.json'), 'utf8')).version;
const body = readFileSync(out, 'utf8').trim();
writeFileSync(out, `/* @material/material-color-utilities ${ver} — Copyright Google LLC, Apache License 2.0。由 tools/build-m3color.mjs 打包，勿手改 */\n${body}\n`);
console.log('kit/src/m3color.js', (body.length / 1024).toFixed(1), 'KB');
