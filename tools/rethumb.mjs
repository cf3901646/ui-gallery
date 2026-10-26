// 重做指定模板的缩略图：node tools/rethumb.mjs app/search web/pricing …
import { execFileSync } from 'node:child_process';
for (const t of process.argv.slice(2)) {
  execFileSync(process.execPath, ['tools/build-thumbs.mjs', '--force', '4', t + '.html'], { stdio: 'inherit' });
}
