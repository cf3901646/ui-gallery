// 自测 gallery/zip.js：生成一个含中文内容的 zip，用系统 tar 列出并解压校验内容
import { readFile, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import vm from 'node:vm';

const code = await readFile('gallery/zip.js', 'utf8');
const ctx = { TextEncoder, Blob, globalThis: {} };
ctx.globalThis = ctx;
vm.runInNewContext(code, ctx);
const files = [{ name: 'ui-templates/README.md', data: '# 你好\n中文内容 ✓\n' }, { name: 'ui-templates/kit/a.css', data: 'a{color:red}' }];
const blob = ctx.UIZip.make(files);
const dir = await mkdtemp(path.join(process.env.TEMP, 'uig', 'zip-'));
const zip = path.join(dir, 't.zip');
await writeFile(zip, Buffer.from(await blob.arrayBuffer()));
console.log(execFileSync('tar', ['-tf', zip]).toString().trim());
execFileSync('tar', ['-xf', zip, '-C', dir]);
const back = await readFile(path.join(dir, 'ui-templates', 'README.md'), 'utf8');
console.log(back === files[0].data ? 'zip OK：内容一致' : 'zip 内容不一致');
await rm(dir, { recursive: true, force: true });
