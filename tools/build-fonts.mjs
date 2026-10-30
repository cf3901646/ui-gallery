// 生成 kit/fonts/ 和 kit/fonts.css：从 fontsource 包里挑出需要的可变字体（全部 SIL OFL 1.1）。
//   Inter（wght + opsz，近似 SF Pro 在 Text / Display 之间随字号切换）——Apple 模式的拉丁字
//   Google Sans Flex（wght）——Google 模式的拉丁字
//   Noto Sans SC（wght，按 unicode-range 分成约 100 个子集，浏览器只下载用到的）——两种模式在非 Apple 设备上的中文
// 用法：node tools/build-fonts.mjs <fontsource 解压根目录（下面是 inter/ google-sans-flex/ noto-sans-sc/ 各自的 package/）>
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, rmSync, existsSync } from 'node:fs';
import path from 'node:path';

const root = process.argv[2];
if (!root) throw new Error('需要 fontsource 解压根目录');
const OUT = path.join(process.cwd(), 'kit', 'fonts');
rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
const PICK = [
  { pkg: 'inter', css: 'opsz.css', subsets: ['latin', 'latin-ext'] },
  { pkg: 'google-sans-flex', css: 'wght.css', subsets: ['latin', 'latin-ext'] },
  { pkg: 'noto-sans-sc', css: 'wght.css', subsets: null },   // 全部子集
];
let css = `/* UI Kit 字体。自动生成，勿手改：node tools/build-fonts.mjs
 * 全部为 SIL Open Font License 1.1（许可文本见 kit/fonts/*-OFL.txt），可以随项目分发。
 * Apple 设备上 -apple-system（SF Pro + 苹方）排在前面，这些字体只在其他系统上补位。 */\n`;
let bytes = 0, count = 0;
for (const p of PICK) {
  const dir = path.join(root, p.pkg, 'package');
  const src = readFileSync(path.join(dir, p.css), 'utf8');
  const blocks = src.split(/(?=\/\* )/).filter((b) => b.includes('@font-face'));
  for (const b of blocks) {
    const name = (b.match(/\/\* (.+?) \*\//) || [])[1] || '';
    if (p.subsets && !p.subsets.some((s) => new RegExp(`^${p.pkg}-${s}-`).test(name))) continue;
    const file = (b.match(/url\(\.\/files\/([^)]+)\)/) || [])[1];
    if (!file || !existsSync(path.join(dir, 'files', file))) continue;
    copyFileSync(path.join(dir, 'files', file), path.join(OUT, file));
    bytes += readFileSync(path.join(OUT, file)).length; count++;
    css += b.replace(`url(./files/${file})`, `url(fonts/${file})`).trim() + '\n';
  }
  for (const lic of ['LICENSE', 'OFL.txt']) {
    if (existsSync(path.join(dir, lic))) { copyFileSync(path.join(dir, lic), path.join(OUT, `${p.pkg}-OFL.txt`)); break; }
  }
}
writeFileSync(path.join(process.cwd(), 'kit', 'fonts.css'), css);
console.log(`kit/fonts：${count} 个文件，${(bytes / 1048576).toFixed(1)} MB；kit/fonts.css ${(css.length / 1024).toFixed(0)} KB`);
