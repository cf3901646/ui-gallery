// 生成 kit/icons.js：同一个逻辑 id，Apple 模式用 Lucide（ISC），Google 模式用 Material Symbols（Apache-2.0）。
// 用法（在 ui-gallery 目录下）：node tools/build-icons.mjs <lucide 包解压目录>
// Material Symbols 从 npmmirror 逐个下载并缓存到 tools/.cache/material/。
import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import path from 'node:path';

const LUCIDE_DIR = process.argv[2];
if (!LUCIDE_DIR) throw new Error('需要传入 lucide-static 解压目录');
const MS_VER = '0.48.1';
const CACHE = path.join(process.cwd(), 'tools', '.cache', 'material');
await mkdir(CACHE, { recursive: true });

// 逻辑 id: [lucide 名, material 名]
const MAP = {
  home: ['house', 'home'], search: ['search', 'search'], settings: ['settings', 'settings'],
  user: ['user', 'person'], users: ['users', 'group'], bell: ['bell', 'notifications'],
  heart: ['heart', 'favorite'], star: ['star', 'star'], bookmark: ['bookmark', 'bookmark'],
  share: ['share', 'share'], plus: ['plus', 'add'], minus: ['minus', 'remove'], close: ['x', 'close'],
  check: ['check', 'check'], 'chevron-right': ['chevron-right', 'chevron_right'],
  'chevron-left': ['chevron-left', 'chevron_left'], 'chevron-down': ['chevron-down', 'keyboard_arrow_down'],
  'chevron-up': ['chevron-up', 'keyboard_arrow_up'], 'arrow-left': ['arrow-left', 'arrow_back'],
  'arrow-right': ['arrow-right', 'arrow_forward'], 'arrow-up-right': ['arrow-up-right', 'north_east'],
  more: ['ellipsis', 'more_horiz'], 'more-vert': ['ellipsis-vertical', 'more_vert'], menu: ['menu', 'menu'],
  filter: ['sliders-horizontal', 'tune'], sort: ['arrow-up-down', 'swap_vert'], edit: ['pencil', 'edit'],
  trash: ['trash-2', 'delete'], copy: ['copy', 'content_copy'], download: ['download', 'download'],
  upload: ['upload', 'upload'], link: ['link', 'link'], mail: ['mail', 'mail'], inbox: ['inbox', 'inbox'],
  send: ['send', 'send'], message: ['message-circle', 'chat_bubble'], phone: ['phone', 'call'],
  video: ['video', 'videocam'], camera: ['camera', 'photo_camera'], image: ['image', 'image'],
  mic: ['mic', 'mic'], play: ['play', 'play_arrow'], pause: ['pause', 'pause'],
  'skip-forward': ['skip-forward', 'skip_next'], 'skip-back': ['skip-back', 'skip_previous'],
  shuffle: ['shuffle', 'shuffle'], repeat: ['repeat', 'repeat'], volume: ['volume-2', 'volume_up'],
  music: ['music', 'music_note'], headphones: ['headphones', 'headphones'], calendar: ['calendar', 'calendar_today'],
  clock: ['clock', 'schedule'], 'map-pin': ['map-pin', 'location_on'], map: ['map', 'map'],
  navigation: ['navigation', 'navigation'], globe: ['globe', 'language'], wifi: ['wifi', 'wifi'],
  bluetooth: ['bluetooth', 'bluetooth'], battery: ['battery-full', 'battery_full'], moon: ['moon', 'dark_mode'],
  sun: ['sun', 'light_mode'], cloud: ['cloud', 'cloud'], rain: ['cloud-rain', 'rainy'], wind: ['wind', 'air'],
  droplet: ['droplet', 'water_drop'], thermometer: ['thermometer', 'thermostat'], lock: ['lock', 'lock'],
  unlock: ['lock-open', 'lock_open'], key: ['key-round', 'key'], shield: ['shield-check', 'verified_user'],
  eye: ['eye', 'visibility'], 'eye-off': ['eye-off', 'visibility_off'], cart: ['shopping-cart', 'shopping_cart'],
  bag: ['shopping-bag', 'shopping_bag'], card: ['credit-card', 'credit_card'], wallet: ['wallet', 'account_balance_wallet'],
  gift: ['gift', 'redeem'], tag: ['tag', 'sell'], truck: ['truck', 'local_shipping'], package: ['package', 'package_2'],
  receipt: ['receipt', 'receipt_long'], chart: ['chart-column', 'bar_chart'], 'trending-up': ['trending-up', 'trending_up'],
  activity: ['activity', 'monitor_heart'], flame: ['flame', 'local_fire_department'], dumbbell: ['dumbbell', 'fitness_center'],
  walk: ['footprints', 'directions_walk'], plane: ['plane', 'flight'], car: ['car', 'directions_car'],
  train: ['train-front', 'train'], hotel: ['bed-double', 'hotel'], food: ['utensils', 'restaurant'],
  coffee: ['coffee', 'local_cafe'], file: ['file', 'draft'], folder: ['folder', 'folder'], doc: ['file-text', 'description'],
  note: ['notebook-pen', 'edit_note'], list: ['list', 'list'], grid: ['layout-grid', 'grid_view'],
  'check-square': ['square-check', 'check_box'], 'circle-check': ['circle-check', 'check_circle'],
  alert: ['circle-alert', 'error'], info: ['info', 'info'], help: ['circle-help', 'help'], warning: ['triangle-alert', 'warning'],
  refresh: ['refresh-cw', 'refresh'], logout: ['log-out', 'logout'], qr: ['qr-code', 'qr_code_2'],
  scan: ['scan-line', 'qr_code_scanner'], lightbulb: ['lightbulb', 'lightbulb'], power: ['power', 'power_settings_new'],
  tv: ['tv', 'tv'], speaker: ['speaker', 'speaker'], fan: ['fan', 'mode_fan'], smartphone: ['smartphone', 'mobile'],
  laptop: ['laptop', 'laptop_windows'], sparkles: ['sparkles', 'star_shine'], zap: ['zap', 'bolt'], award: ['award', 'workspace_premium'],
  gem: ['gem', 'diamond'], layers: ['layers', 'layers'], sidebar: ['panel-left', 'view_sidebar'], external: ['external-link', 'open_in_new'],
  paperclip: ['paperclip', 'attach_file'], smile: ['smile', 'mood'], locate: ['locate-fixed', 'my_location'],
  compass: ['compass', 'explore'], book: ['book-open', 'menu_book'], news: ['newspaper', 'newspaper'],
  briefcase: ['briefcase', 'work'], building: ['building-2', 'apartment'], ticket: ['ticket', 'confirmation_number'],
  'face-id': ['scan-face', 'face'], pin: ['pin', 'keep'], flag: ['flag', 'flag'], archive: ['archive', 'archive'],
  reply: ['reply', 'reply'], forward: ['forward', 'forward'], at: ['at-sign', 'alternate_email'], hash: ['hash', 'tag'],
  code: ['code', 'code'], terminal: ['terminal', 'terminal'], palette: ['palette', 'palette'], type: ['type', 'text_fields'],
  bold: ['bold', 'format_bold'], italic: ['italic', 'format_italic'], checklist: ['list-checks', 'checklist'],
  undo: ['undo-2', 'undo'], redo: ['redo-2', 'redo'], history: ['history', 'history'], percent: ['percent', 'percent'],
  yen: ['japanese-yen', 'currency_yen'], gauge: ['gauge', 'speed'], leaf: ['leaf', 'eco'], mountain: ['mountain', 'landscape'],
  umbrella: ['umbrella', 'umbrella'], snowflake: ['snowflake', 'ac_unit'], 'heart-pulse': ['heart-pulse', 'ecg_heart'],
  bed: ['bed', 'bed'], pill: ['pill', 'medication'], gamepad: ['gamepad-2', 'sports_esports'], film: ['film', 'movie'],
  podcast: ['podcast', 'podcasts'], radio: ['radio', 'radio'], library: ['library', 'library_music'], bike: ['bike', 'pedal_bike'],
  store: ['store', 'storefront'], circle: ['circle', 'circle'], grip: ['grip-horizontal', 'drag_handle'],
  expand: ['maximize-2', 'open_in_full'], shrink: ['minimize-2', 'close_fullscreen'], fingerprint: ['fingerprint-pattern', 'fingerprint'],
  sliders: ['sliders-vertical', 'instant_mix'], 'log-in': ['log-in', 'login'], 'user-plus': ['user-plus', 'person_add'],
  'credit-score': ['badge-check', 'verified'], cast: ['cast', 'cast'], printer: ['printer', 'print'], keyboard: ['keyboard', 'keyboard'],
  'mic-off': ['mic-off', 'mic_off'], 'volume-off': ['volume-x', 'volume_off'], 'list-music': ['list-music', 'queue_music'],
  airplay: ['airplay', 'airplay'], dot: ['dot', 'fiber_manual_record'],
  // 平台语义别名：iOS 返回是 chevron，Android 是箭头；iOS 更多是横向省略号，Android 是竖向
  back: ['chevron-left', 'arrow_back'], overflow: ['ellipsis', 'more_vert'], 'close-sheet': ['x', 'close'],
  'add-circle': ['circle-plus', 'add'], 'play-circle': ['circle-play', 'play_arrow'],
};
// Google 模式下选中态用实心版本（Material Symbols 的 FILL=1）
const FILLED = ['home', 'search', 'person', 'notifications', 'favorite', 'settings', 'star', 'bookmark', 'chat_bubble',
  'shopping_bag', 'calendar_today', 'library_music', 'explore', 'grid_view', 'folder', 'account_balance_wallet',
  'group', 'mail', 'inbox', 'location_on', 'photo_camera', 'image', 'description', 'monitor_heart', 'lightbulb', 'map', 'receipt_long'];

function inner(svg) {
  return svg.replace(/<!--[\s\S]*?-->/g, '').replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '')
    .replace(/\s+/g, ' ').replace(/> </g, '><').trim();
}
async function exists(p) { try { await access(p); return true; } catch { return false; } }
async function material(name) {
  const file = path.join(CACHE, name + '.svg');
  if (await exists(file)) return readFile(file, 'utf8');
  const url = `https://registry.npmmirror.com/@material-symbols/svg-400/${MS_VER}/files/outlined/${name}.svg`;
  for (let i = 0; i < 3; i++) {
    const c = new AbortController();
    const t = setTimeout(() => c.abort(), 15000);
    try {
      const r = await fetch(url, { signal: c.signal });
      if (r.status === 404) return null;
      if (r.ok) { const s = await r.text(); await writeFile(file, s); return s; }
    } catch {} finally { clearTimeout(t); }
  }
  return null;
}

const apple = [], google = [], missing = [];
const ids = Object.keys(MAP);
let done = 0;
async function worker(queue) {
  while (queue.length) {
    const id = queue.shift();
    const [ln, mn] = MAP[id];
    const lp = path.join(LUCIDE_DIR, 'icons', ln + '.svg');
    if (await exists(lp)) {
      // 不写 fill/stroke 属性，由外层 .i 的 CSS 继承下来，这样 .i.solid 可以把线条图标变成实心
      apple.push([id, `<symbol id="i-${id}" viewBox="0 0 24 24">${inner(await readFile(lp, 'utf8'))}</symbol>`]);
    } else missing.push('lucide:' + ln);
    const ms = await material(mn);
    if (ms) google.push([id, `<symbol id="i-${id}" viewBox="0 -960 960 960"><g fill="currentColor">${inner(ms)}</g></symbol>`]);
    else missing.push('material:' + mn);
    if (FILLED.includes(mn)) {
      const mf = await material(mn + '-fill');
      if (mf) google.push([id + '-fill', `<symbol id="i-${id}-fill" viewBox="0 -960 960 960"><g fill="currentColor">${inner(mf)}</g></symbol>`]);
      else missing.push('material:' + mn + '-fill');
    }
    if (++done % 20 === 0) console.log('progress', done, '/', ids.length);
  }
}
const q = [...ids];
await Promise.all(Array.from({ length: 8 }, () => worker(q)));
// Apple 没有实心版本：-fill 直接复用线条版，保证 id 在两种模式下都存在
for (const [id, s] of [...google]) {
  if (id.endsWith('-fill') && !apple.some(([a]) => a === id)) {
    const base = apple.find(([a]) => a === id.slice(0, -5));
    if (base) apple.push([id, base[1].replace(`id="i-${base[0]}"`, `id="i-${id}"`)]);
  }
}
const sortJoin = (arr) => arr.sort((a, b) => a[0].localeCompare(b[0])).map((x) => x[1]).join('');
const names = ids.slice().sort();
const out = `/* UI Kit 图标。自动生成，勿手改：node tools/build-icons.mjs
 * Apple 模式：Lucide ${'1.61.0'}（ISC License, https://lucide.dev）
 * Google 模式：Material Symbols Outlined ${MS_VER}（Apache License 2.0, https://fonts.google.com/icons）
 * 用法：<svg class="i"><use href="#i-home"/></svg>；Google 模式下 #i-home-fill 为实心版本。
 */
(function () {
  var S = {
    apple: ${JSON.stringify(sortJoin(apple))},
    google: ${JSON.stringify(sortJoin(google))}
  };
  var NAMES = ${JSON.stringify(names)};
  function mount(lang) {
    var host = document.getElementById('ui-icon-sprite');
    if (!host) {
      host = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      host.id = 'ui-icon-sprite';
      host.setAttribute('aria-hidden', 'true');
      host.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
      (document.body || document.documentElement).prepend(host);
    }
    var key = lang === 'google' ? 'google' : 'apple';
    if (host.getAttribute('data-set') !== key) {
      host.innerHTML = S[key];
      host.setAttribute('data-set', key);
    }
  }
  window.UIIcons = { mount: mount, names: NAMES, sprites: S };
})();
`;
await writeFile(path.join(process.cwd(), 'kit', 'icons.js'), out);
console.log('apple', apple.length, 'google', google.length, 'bytes', out.length);
console.log('missing', missing.length ? missing.join(', ') : 'none');
