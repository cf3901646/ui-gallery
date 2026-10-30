// 生成展示站数据：
//   gallery/registry.js  模板清单（meta、用到的组件、图标数、大小、是否有缩略图）
//   gallery/sources.js   全部模板和 kit 的源码（展示站“代码”页与 zip 导出用，按需加载）
// 用法：node tools/build-registry.mjs
import { readFile, writeFile, readdir, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { execSync } from 'node:child_process';
import path from 'node:path';
import { walkHtml } from './chs.mjs';

const ROOT = process.cwd();
const APP_CATS = ['引导与账户', '首页与内容', '社交与消息', '电商与零售', '出行与本地生活', '效率工具', '媒体与娱乐', '健康与运动',
  '金融与支付', '智能家居', '系统与设置', '状态与反馈', '动效与交互', '平板与桌面'];
const WEB_CATS = ['营销与产品', '定价与购买', '内容与博客', '文档与支持', '公司与招聘', '账户与表单', '系统页面'];
const PLATS = ['phone', 'tablet', 'desktop', 'web'];
// 组件目录区块（id 与 templates/_catalog.html 的锚点一致）及判定“用到了它”的类名
const SECTIONS = [
  ['c-type', '文字样式', [/^t-/]],
  ['c-color', '颜色', null],
  ['c-icons', '图标', ['i']],
  ['c-buttons', '按钮', ['btn', 'btn-row', 'btn-stack', 'link-arrow']],
  ['c-icon-buttons', '图标按钮', ['icon-btn']],
  ['c-groups', '按钮组与分段', ['btn-group', 'split-btn', 'segmented']],
  ['c-tabs', '标签页', ['tabs']],
  ['c-chips', '筛选片', ['chips', 'chip']],
  ['c-lists', '列表', ['list', 'row', 'group-header', 'group-footer']],
  ['c-cards', '卡片', ['card']],
  ['c-widgets', '小组件', ['widget']],
  ['c-forms', '表单', ['field', 'field-input', 'otp', 'select', 'form', 'field-affix']],
  ['c-selection', '选择控件', ['switch', 'check', 'radio', 'range', 'stepper']],
  ['c-search', '搜索', ['searchbar']],
  ['c-feedback', '标记与进度', ['badge', 'tag', 'progress', 'spinner', 'loader', 'ring', 'rings', 'skeleton', 'dots', 'steps', 'kbd']],
  ['c-callouts', '提示与空状态', ['callout', 'toast', 'empty']],
  ['c-overlays', '浮层', ['sheet', 'dialog', 'menu', 'action-sheet', 'scrim', 'tooltip']],
  ['c-nav', '导航栏与工具栏', ['topbar', 'tabbar', 'toolbar', 'fab', 'bar-btn']],
  ['c-sidebar', '侧栏与多栏', ['sidebar', 'rail', 'split', 'side-item', 'app-frame']],
  ['c-data', '数据展示', ['avatar', 'stat', 'bars', 'chart', 'table', 'kv', 'timeline', 'calendar', 'event', 'legend']],
  ['c-chat', '消息', ['bubble', 'bubble-list', 'composer']],
  ['c-media', '媒体与形状', ['art', 'media-grid', 'carousel', /^shape-/]],
  ['c-web', '网页区块', ['hero', 'section', 'tile', 'feature', 'bento', 'price-card', 'faq', 'spec', 'compare', 'footer', 'site-nav',
    'local-nav', 'cta-band', 'quote', 'prose', 'doc', 'breadcrumb', 'swatches', 'option-list', 'logo-row']],
];

const files = await walkHtml(path.join(ROOT, 'templates'), readdir);
const templates = [], sources = {}, warnings = [];
for (const f of files) {
  const rel = path.relative(ROOT, f).replaceAll('\\', '/');
  const html = await readFile(f, 'utf8');
  sources[rel] = html;
  if (path.basename(f).startsWith('_')) continue;
  const meta = {};
  for (const m of html.matchAll(/<meta name="ui:(\w+)" content="([^"]*)">/g)) meta[m[1]] = m[2];
  const classes = new Set();
  for (const m of html.matchAll(/\sclass="([^"]*)"/g)) m[1].split(/\s+/).filter(Boolean).forEach((c) => classes.add(c));
  const list = [...classes];
  const components = SECTIONS.filter(([, , cls]) => cls && cls.some((c) => (c instanceof RegExp ? list.some((x) => c.test(x)) : classes.has(c)))).map(([id]) => id);
  const id = rel.replace(/^templates\//, '').replace(/\.html$/, '');
  const key = id.replaceAll('/', '-');
  const category = meta.category || '未分类';
  if (!APP_CATS.includes(category) && !WEB_CATS.includes(category)) warnings.push(`${rel}: 未知分类 ${category}`);
  if (!PLATS.includes(meta.platform)) warnings.push(`${rel}: 未知平台 ${meta.platform}`);
  templates.push({
    id, key, path: rel, title: meta.title || id, desc: meta.desc || '', category, platform: meta.platform || 'web',
    tags: (meta.tags || '').split(/[,，]/).map((s) => s.trim()).filter(Boolean), components,
    icons: new Set([...html.matchAll(/href="#i-([\w-]+)"/g)].map((m) => m[1])).size,
    size: Buffer.byteLength(html), dark: /data-scheme-hint="dark"/.test(html),
    thumbs: existsSync(path.join(ROOT, 'gallery', 'thumbs', key + '.apple-light.webp')),
  });
}
const order = [...APP_CATS, ...WEB_CATS];
const rank = (c) => (order.includes(c) ? order.indexOf(c) : 999);
templates.sort((a, b) => rank(a.category) - rank(b.category) || PLATS.indexOf(a.platform) - PLATS.indexOf(b.platform) || a.id.localeCompare(b.id));

for (const f of await readdir(path.join(ROOT, 'kit'))) {
  if (/\.(css|js|md)$/.test(f)) sources['kit/' + f] = await readFile(path.join(ROOT, 'kit', f), 'utf8');
}
let version = '';
try { version = execSync('git rev-parse --short HEAD', { cwd: ROOT }).toString().trim(); } catch {}

let specCount = { apple: 0, google: 0 };
for (const l of ['apple', 'google']) { try { specCount[l] = JSON.parse(await readFile(path.join(ROOT, 'kit', `specs-${l}.json`), 'utf8')).length; } catch {} }
const registry = {
  generated: new Date().toISOString(), version, count: templates.length, specs: specCount,
  categories: { app: APP_CATS.filter((c) => templates.some((t) => t.category === c)), web: WEB_CATS.filter((c) => templates.some((t) => t.category === c)) },
  components: SECTIONS.map(([id, name]) => ({ id, name, used: templates.filter((t) => t.components.includes(id)).length })),
  templates,
};
await mkdir(path.join(ROOT, 'gallery'), { recursive: true });
await writeFile(path.join(ROOT, 'gallery', 'registry.js'), '/* 自动生成，勿手改：node tools/build-registry.mjs */\nwindow.UI_REGISTRY = ' + JSON.stringify(registry) + ';\n');
await writeFile(path.join(ROOT, 'gallery', 'sources.js'), '/* 自动生成，勿手改：node tools/build-registry.mjs */\nwindow.UI_SOURCES = ' + JSON.stringify(sources) + ';\n');
const specs = {};
for (const l of ['apple', 'google']) {
  try { specs[l] = JSON.parse(await readFile(path.join(ROOT, 'kit', `specs-${l}.json`), 'utf8')); } catch { specs[l] = []; }
}
await writeFile(path.join(ROOT, 'gallery', 'specs.js'), '/* 自动生成，勿手改：node tools/build-registry.mjs */\nwindow.UI_SPECS = ' + JSON.stringify(specs) + ';\n');
const byPlat = PLATS.map((p) => `${p} ${templates.filter((t) => t.platform === p).length}`).join(' / ');
console.log(`模板 ${templates.length} 个（${byPlat}），有缩略图 ${templates.filter((t) => t.thumbs).length} 个，源码 ${Object.keys(sources).length} 个文件`);
if (warnings.length) console.log('警告：\n  ' + warnings.join('\n  '));
