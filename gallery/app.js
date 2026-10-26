/* UI 模板库 · 展示站（无依赖；直接用浏览器打开 index.html 即可，file:// 也能用）
 * 路由：#/ 模板 · #/t/<id> 详情 · #/components[/c-x] 组件 · #/lang/apple|google|compare 设计语言 · #/theme 主题 · #/kit 套件
 * 和模板的通信：iframe URL 参数 + postMessage（ui:set / ui:scroll / ui:goto / ui:tokens），见 kit/ui.js
 */
(function () {
  'use strict';
  var R = window.UI_REGISTRY;
  var view = document.getElementById('g-view');
  var top = document.getElementById('g-top');
  var $ = function (s, el) { return (el || document).querySelector(s); };
  var $$ = function (s, el) { return Array.prototype.slice.call((el || document).querySelectorAll(s)); };
  function h(html) { var t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  if (!R) {
    view.innerHTML = '<div class="g-empty"><h2>还没有生成模板清单</h2><p>在 ui-gallery 目录运行 <code>node tools/build-registry.mjs</code>，然后刷新页面。</p></div>';
    return;
  }
  var T = R.templates, byId = {};
  T.forEach(function (t) { byId[t.id] = t; });

  /* ---------------- 设置（存在 localStorage） ---------------- */
  var DEF = { lang: 'apple', scheme: 'light', accent: '', scale: 1, contrast: 'normal', glass: 'regular', density: 'normal', cardMode: 'single', compBoth: false, kit: [] };
  var S = (function () { try { return Object.assign({}, DEF, JSON.parse(localStorage.getItem('uig:settings') || '{}')); } catch (e) { return Object.assign({}, DEF); } })();
  function save() { try { localStorage.setItem('uig:settings', JSON.stringify(S)); } catch (e) { /* 忽略 */ } }

  /* ---------------- 图标（展示站自己的，和 kit 无关） ---------------- */
  var I = {
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
    star: '<path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>',
    external: '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
    copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>',
    download: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
    close: '<path d="M6 6l12 12M18 6 6 18"/>',
    back: '<path d="m15 18-6-6 6-6"/>',
    phone: '<rect x="7" y="2.5" width="10" height="19" rx="2.5"/><path d="M11 18.5h2"/>',
    tablet: '<rect x="4" y="3" width="16" height="18" rx="2.5"/><path d="M11 18h2"/>',
    desktop: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
    web: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
    columns: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M12 4v16"/>',
    split: '<path d="M12 2v20M8 9l-3 3 3 3M16 9l3 3-3 3"/>',
    code: '<path d="m8 8-4 4 4 4M16 8l4 4-4 4M14 5l-4 14"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>',
    layers: '<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/>',
    palette: '<circle cx="12" cy="12" r="9"/><circle cx="8" cy="10" r="1.2"/><circle cx="12" cy="7.5" r="1.2"/><circle cx="16" cy="10" r="1.2"/><path d="M12 21a2.5 2.5 0 0 1 0-5h1.5a3.5 3.5 0 0 0 3.5-3.5"/>',
    grid: '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
    sliders: '<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>',
    panel: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M15 4v16"/>',
    fit: '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>',
    left: '<path d="m15 18-6-6 6-6"/>', right: '<path d="m9 18 6-6-6-6"/>'
  };
  function ic(name, cls) { return '<svg class="g-i ' + (cls || '') + '" viewBox="0 0 24 24" aria-hidden="true">' + (I[name] || '') + '</svg>'; }
  var SB = {
    signal: '<svg viewBox="0 0 18 12"><rect x="0" y="8" width="3" height="4" rx="1"/><rect x="5" y="5.5" width="3" height="6.5" rx="1"/><rect x="10" y="3" width="3" height="9" rx="1"/><rect x="15" y="0" width="3" height="12" rx="1"/></svg>',
    wifi: '<svg viewBox="0 0 16 12"><path d="M8 2.6c2.4 0 4.6.9 6.3 2.5l1.2-1.3A10.7 10.7 0 0 0 8 .8C5.1.8 2.5 1.9.5 3.8l1.2 1.3A9 9 0 0 1 8 2.6zm0 3.5c1.4 0 2.7.5 3.8 1.5L13 6.3A7.3 7.3 0 0 0 8 4.3c-1.9 0-3.7.7-5 2l1.2 1.3A5.5 5.5 0 0 1 8 6.1zm0 3.5c.5 0 1 .2 1.3.5L8 11.5 6.7 10.1c.3-.3.8-.5 1.3-.5z"/></svg>',
    battery: '<svg viewBox="0 0 27 13"><rect x=".5" y=".5" width="23" height="12" rx="3.5" fill="none" stroke="currentColor" opacity=".4"/><rect x="2" y="2" width="18" height="9" rx="2"/><path d="M25 4.5v4a2 2 0 0 0 0-4z" opacity=".4"/></svg>'
  };

  /* ---------------- 设备与平台 ---------------- */
  var PLAT = {
    phone: { name: '手机', icon: 'phone', ar: '402 / 874' }, tablet: { name: '平板', icon: 'tablet', ar: '1180 / 820' },
    desktop: { name: '桌面', icon: 'desktop', ar: '1440 / 900' }, web: { name: '网页', icon: 'web', ar: '1280 / 800' }
  };
  var DEVICES = {
    'iphone-17-pro': { name: 'iPhone 17 Pro', w: 402, h: 874, safe: [62, 34], kind: 'iphone', plat: 'phone' },
    'iphone-17-pro-max': { name: 'iPhone 17 Pro Max', w: 440, h: 956, safe: [62, 34], kind: 'iphone', plat: 'phone' },
    'pixel-10': { name: 'Pixel 10', w: 412, h: 915, safe: [48, 24], kind: 'pixel', plat: 'phone' },
    'android-compact': { name: '紧凑 Android 360×780', w: 360, h: 780, safe: [40, 24], kind: 'pixel', plat: 'phone' },
    'ipad-air': { name: 'iPad Air 11″ 横屏', w: 1180, h: 820, safe: [24, 20], kind: 'ipad', plat: 'tablet' },
    'ipad-air-p': { name: 'iPad Air 11″ 竖屏', w: 820, h: 1180, safe: [24, 20], kind: 'ipad', plat: 'tablet' },
    'android-tablet': { name: 'Android 平板 1280×800', w: 1280, h: 800, safe: [32, 24], kind: 'atablet', plat: 'tablet' },
    'desktop-1440': { name: '桌面窗口 1440×900', w: 1440, h: 900, safe: [0, 0], kind: 'window', plat: 'desktop' },
    'desktop-1280': { name: '桌面窗口 1280×800', w: 1280, h: 800, safe: [0, 0], kind: 'window', plat: 'desktop' },
    'web-1440': { name: '浏览器 1440', w: 1440, h: 900, safe: [0, 0], kind: 'browser', plat: 'web' },
    'web-1280': { name: '浏览器 1280', w: 1280, h: 820, safe: [0, 0], kind: 'browser', plat: 'web' },
    'web-768': { name: '平板浏览器 768', w: 768, h: 1024, safe: [0, 0], kind: 'browser', plat: 'web' },
    'web-390': { name: '手机浏览器 390', w: 390, h: 844, safe: [0, 0], kind: 'browser', plat: 'web' }
  };
  var GEOM = { iphone: { pad: 14 }, pixel: { pad: 12 }, ipad: { pad: 20 }, atablet: { pad: 20 }, window: { pad: 0, bar: 38 }, browser: { pad: 0, bar: 38 }, bare: { pad: 0 } };
  function defaultDevice(plat, lang) {
    if (plat === 'phone') return lang === 'google' ? 'pixel-10' : 'iphone-17-pro';
    if (plat === 'tablet') return lang === 'google' ? 'android-tablet' : 'ipad-air';
    if (plat === 'desktop') return 'desktop-1440';
    return 'web-1280';
  }
  var LANGS = { apple: 'Apple · iOS 26', google: 'Google · Material 3 Expressive' };
  var ACCENTS = [
    ['', '默认（Apple 蓝 / Material 紫）'], ['#0088ff', 'iOS 蓝'], ['#6155f5', 'iOS 靛'], ['#cb30e0', 'iOS 紫'], ['#ff2d55', 'iOS 粉'],
    ['#ff383c', 'iOS 红'], ['#ff8d28', 'iOS 橙'], ['#34c759', 'iOS 绿'], ['#00c3d0', 'iOS 青'], ['#ac7f5e', 'iOS 棕'],
    ['#6750a4', 'Material 紫'], ['#0061a4', 'Material 蓝'], ['#006a6a', 'Material 青'], ['#386a20', 'Material 绿'], ['#984061', 'Material 玫红'], ['#8b5000', 'Material 琥珀']
  ];

  /* ---------------- 与模板 iframe 通信 ---------------- */
  var LIVE = [];            // 当前视图里的 iframe：{ iframe, screen, group, lang, autoHeight }
  var TOKEN_WAIT = new Map();
  var cleanups = [];
  function settingsMsg() {
    return { type: 'ui:set', scheme: S.scheme, accent: S.accent, scale: S.scale, contrast: S.contrast, glass: S.glass, density: S.density };
  }
  function src(path, lang, extra) {
    var p = new URLSearchParams({ lang: lang, scheme: S.scheme });
    if (S.accent) p.set('accent', S.accent);
    if (+S.scale !== 1) p.set('scale', S.scale);
    if (S.contrast !== 'normal') p.set('contrast', S.contrast);
    if (S.glass !== 'regular') p.set('glass', S.glass);
    if (S.density !== 'normal') p.set('density', S.density);
    Object.keys(extra || {}).forEach(function (k) { p.set(k, extra[k]); });
    return path + '?' + p.toString();
  }
  function post(f, msg) { try { f.iframe.contentWindow.postMessage(msg, '*'); } catch (e) { /* 忽略 */ } }
  function broadcast(extra) { var m = Object.assign(settingsMsg(), extra || {}); LIVE.forEach(function (f) { post(f, m); }); }
  function track(iframe, opt) { var f = Object.assign({ iframe: iframe }, opt || {}); LIVE.push(f); return f; }
  window.addEventListener('message', function (e) {
    var m = e.data;
    if (!m || typeof m !== 'object' || !m.type) return;
    var pend = TOKEN_WAIT.get(e.source);
    if (pend) {
      if (m.type === 'ui:ready') e.source.postMessage({ type: 'ui:tokens', id: 1, names: pend.names }, '*');
      if (m.type === 'ui:tokens') { TOKEN_WAIT.delete(e.source); pend.resolve(m.values); }
      return;
    }
    var f = null;
    for (var i = 0; i < LIVE.length; i++) if (LIVE[i].iframe.contentWindow === e.source) { f = LIVE[i]; break; }
    if (!f) return;
    if ((m.type === 'ui:ready' || m.type === 'ui:state') && f.screen) f.screen.classList.toggle('is-dark', !!m.dark);
    if (m.type === 'ui:ready') post(f, settingsMsg());
    if ((m.type === 'ui:ready' || m.type === 'ui:height') && f.autoHeight && m.height) f.iframe.style.height = Math.max(240, m.height) + 'px';
    if (m.type === 'ui:scrolled' && f.group) {
      var now = performance.now();
      if (f.quietUntil && now < f.quietUntil) return;
      LIVE.forEach(function (o) { if (o !== f && o.group === f.group) { o.quietUntil = now + 160; post(o, { type: 'ui:scroll', top: m.y }); } });
    }
  });
  // 用隐藏的 iframe 读取某种语言、明暗下 token 的实际颜色值
  function readTokens(lang, scheme, names) {
    return new Promise(function (resolve) {
      var f = document.createElement('iframe');
      f.className = 'g-hidden-frame';
      var p = new URLSearchParams({ lang: lang, scheme: scheme });
      if (S.accent) p.set('accent', S.accent);
      if (S.contrast !== 'normal') p.set('contrast', S.contrast);
      document.body.appendChild(f);
      var done = function (v) { f.remove(); resolve(v || {}); };
      TOKEN_WAIT.set(f.contentWindow, { names: names, resolve: done });
      f.src = 'templates/_tokens.html?' + p.toString();
      setTimeout(function () { if (TOKEN_WAIT.has(f.contentWindow)) { TOKEN_WAIT.delete(f.contentWindow); done({}); } }, 8000);
    });
  }

  /* ---------------- 小工具：提示、复制、下载、弹出层 ---------------- */
  var toastTimer;
  function toast(msg) {
    var el = document.getElementById('g-toast');
    el.textContent = msg; el.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { el.hidden = true; }, 2200);
  }
  function copy(text, msg) {
    var ok = function () { toast(msg || '已复制'); };
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(ok, fallback); else fallback();
    function fallback() {
      var ta = document.createElement('textarea'); ta.value = text; ta.style.cssText = 'position:fixed;left:-9999px';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); ok(); } catch (e) { toast('复制失败，请手动复制'); }
      ta.remove();
    }
  }
  function download(name, data, type) {
    var b = data instanceof Blob ? data : new Blob([data], { type: type || 'text/plain;charset=utf-8' });
    var u = URL.createObjectURL(b), a = document.createElement('a');
    a.href = u; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(u); }, 5000);
  }
  var popEl = null;
  function closePop() { if (popEl) { popEl.remove(); popEl = null; document.removeEventListener('pointerdown', outside, true); } }
  function outside(e) { if (popEl && !popEl.contains(e.target) && !e.target.closest('[data-pop-anchor]')) closePop(); }
  function popover(anchor, html, mount) {
    var same = popEl && popEl._anchor === anchor;
    closePop();
    if (same) return;
    popEl = h('<div class="g-pop">' + html + '</div>');
    popEl._anchor = anchor;
    anchor.setAttribute('data-pop-anchor', '');
    document.body.appendChild(popEl);
    var r = anchor.getBoundingClientRect(), w = popEl.offsetWidth;
    popEl.style.top = Math.round(r.bottom + 8) + 'px';
    popEl.style.left = Math.round(Math.min(window.innerWidth - w - 12, Math.max(12, r.right - w))) + 'px';
    if (mount) mount(popEl);
    setTimeout(function () { document.addEventListener('pointerdown', outside, true); });
  }
  function segBind(el, value, onPick) {
    $$('button', el).forEach(function (b) {
      b.classList.toggle('is-active', b.dataset.v === String(value));
      b.onclick = function () { $$('button', el).forEach(function (x) { x.classList.toggle('is-active', x === b); }); onPick(b.dataset.v); };
    });
  }

  /* ---------------- 源码：按需加载 sources.js ---------------- */
  var sourcesP = null;
  function loadSources() {
    if (window.UI_SOURCES) return Promise.resolve(window.UI_SOURCES);
    if (!sourcesP) sourcesP = new Promise(function (res, rej) {
      var s = document.createElement('script');
      s.src = 'gallery/sources.js';
      s.onload = function () { res(window.UI_SOURCES); };
      s.onerror = function () { sourcesP = null; rej(new Error('gallery/sources.js 加载失败，请先运行 node tools/build-registry.mjs')); };
      document.head.appendChild(s);
    });
    return sourcesP;
  }
  function highlight(src) {
    var out = '', re = /(<!--[\s\S]*?-->)|(<\/?[a-zA-Z][^>]*>)/g, last = 0, m;
    while ((m = re.exec(src))) {
      out += esc(src.slice(last, m.index));
      out += m[1] ? '<span class="hc">' + esc(m[1]) + '</span>' : tag(m[2]);
      last = re.lastIndex;
    }
    return out + esc(src.slice(last));
    function tag(t) {
      var mm = /^(<\/?)([a-zA-Z][\w-]*)([\s\S]*?)(\/?>)$/.exec(t);
      if (!mm) return esc(t);
      var attrs = esc(mm[3]).replace(/([\w:-]+)(=)(&quot;[\s\S]*?&quot;)/g, '<span class="ha">$1</span>$2<span class="hv">$3</span>');
      return '<span class="ht">' + esc(mm[1]) + mm[2] + '</span>' + attrs + '<span class="ht">' + esc(mm[4]) + '</span>';
    }
  }
  // 导出时：设定默认设计语言和强调色
  function customize(html, o) {
    var attrs = ' data-lang="' + (o.lang || 'apple') + '"' + (o.accent ? ' style="--accent:' + o.accent + '"' : '');
    return html.replace('<html lang="zh-CN" data-lang="apple">', '<html lang="zh-CN"' + attrs + '>');
  }

  function exportZip(ids, o) {
    return loadSources().then(function (srcs) {
      var root = 'ui-templates/', files = [];
      Object.keys(srcs).filter(function (k) { return k.indexOf('kit/') === 0; }).forEach(function (k) {
        var data = srcs[k];
        if (k === 'kit/ui.css' && o.only) data = data.split('\n').filter(function (l) { return !(o.lang === 'google' ? /apple\.css/ : /google\.css/).test(l); }).join('\n');
        if (o.only && /^kit\/(apple|google)\.css$/.test(k) && k.indexOf(o.lang) < 0) return;
        files.push({ name: root + k, data: data });
      });
      ids.forEach(function (id) { var t = byId[id]; if (t && srcs[t.path]) files.push({ name: root + t.path, data: customize(srcs[t.path], o) }); });
      if (o.catalog) ['templates/_catalog.html', 'templates/_tokens.html'].forEach(function (p) { if (srcs[p]) files.push({ name: root + p, data: customize(srcs[p], o) }); });
      files.push({ name: root + 'README.md', data: readme(ids, o) });
      download(o.filename || 'ui-templates.zip', window.UIZip.make(files));
      toast('已生成 zip：' + files.length + ' 个文件');
    }).catch(function (e) { toast(e.message); });
  }
  function readme(ids, o) {
    var lines = ['# UI 模板（导出自 UI 模板库）', '',
      '- 导出时间：' + new Date().toLocaleString('zh-CN') + (R.version ? '（kit 版本 ' + R.version + '）' : ''),
      '- 默认设计语言：' + LANGS[o.lang || 'apple'] + (o.only ? '（只保留这一种语言的样式）' : '（两种语言都保留）'),
      '- 强调色：' + (o.accent || '默认'), '',
      '## 怎么用', '',
      '1. 直接用浏览器打开 `templates/` 下的任意 html 文件即可预览。',
      '2. URL 参数可以临时切换：`?lang=apple|google&scheme=light|dark&accent=%23006a6a&scale=1.2&contrast=more`。',
      '3. 固定下来：改 `<html data-lang="…" data-scheme="…" style="--accent:#…">`。',
      '4. 组件类名、token 和写法见 `kit/COMPONENTS.md`。新页面照模板的 `<head>` 写法引用 `kit/ui.css`、`kit/icons.js`、`kit/ui.js`。', '',
      '## 包含的模板', ''];
    ids.forEach(function (id) { var t = byId[id]; if (t) lines.push('- ' + t.title + ' — `' + t.path + '`（' + t.category + ' · ' + PLAT[t.platform].name + '）'); });
    lines.push('', '## 许可与来源', '',
      '- 图标：Apple 模式用 Lucide（ISC License），Google 模式用 Material Symbols（Apache License 2.0）。',
      '- 字体：不随附任何字体文件。Apple 设备上 `-apple-system` 会显示 SF Pro；SF 字体按 Apple 许可只能用于 Apple 平台应用的设计。',
      '- 风格参考 Apple Human Interface Guidelines 与 Material 3 Expressive，不是官方组件，不含任何商标。', '');
    return lines.join('\n');
  }

  /* ---------------- 顶栏 ---------------- */
  function renderTop() {
    top.innerHTML =
      '<a class="g-brand" href="#/"><span class="g-mark"></span><span>UI 模板库</span></a>' +
      '<nav class="g-nav">' +
      '<a href="#/" data-nav="/">' + ic('grid') + '<span class="g-hide-sm">模板</span></a>' +
      '<a href="#/components" data-nav="/components">' + ic('layers') + '<span class="g-hide-sm">组件</span></a>' +
      '<a href="#/lang/apple" data-nav="/lang">' + ic('info') + '<span class="g-hide-sm">设计语言</span></a>' +
      '<a href="#/theme" data-nav="/theme">' + ic('palette') + '<span class="g-hide-sm">主题</span></a>' +
      '<a href="#/kit" data-nav="/kit">' + ic('star') + '<span class="g-hide-sm">套件</span><span class="g-count" id="g-kitcount"></span></a>' +
      '</nav><div class="g-spacer"></div>' +
      '<div class="g-seg" id="g-lang" title="设计语言"><button data-v="apple">Apple</button><button data-v="google">Google</button></div>' +
      '<button class="g-btn icon" id="g-scheme" title="浅色 / 深色"></button>' +
      '<button class="g-btn" id="g-accent" title="强调色"><span class="g-dot"></span><span class="g-hide-md">强调色</span></button>';
    segBind($('#g-lang'), S.lang, function (v) { setLang(v); });
    $('#g-scheme').onclick = function () { setScheme(S.scheme === 'dark' ? 'light' : 'dark'); };
    $('#g-accent').onclick = function () { accentPop(this); };
    syncTop();
  }
  function syncTop() {
    document.documentElement.setAttribute('data-g-scheme', S.scheme);
    $('#g-scheme').innerHTML = ic(S.scheme === 'dark' ? 'moon' : 'sun');
    $('#g-accent .g-dot').style.setProperty('--dot', S.accent || 'conic-gradient(#0088ff 0 50%, #6750a4 0)');
    $$('#g-lang button').forEach(function (b) { b.classList.toggle('is-active', b.dataset.v === S.lang); });
    $('#g-kitcount').textContent = S.kit.filter(function (id) { return byId[id]; }).length || '';
  }
  function setNav(path) {
    $$('.g-nav a').forEach(function (a) { var n = a.dataset.nav; a.classList.toggle('is-active', n === '/' ? (path === '/' || path.indexOf('/t/') === 0) : path.indexOf(n) === 0); });
  }
  function setLang(v) {
    S.lang = v; if (S.cardMode === 'both' && routeName() === 'browse') S.cardMode = 'single';
    save(); syncTop();
    if (onLang) onLang(v);
  }
  function setScheme(v) {
    S.scheme = v; save(); syncTop();
    broadcast({ scheme: v });
    LIVE.forEach(function (f) { if (f.screen && !f.fixedDark) f.screen.classList.toggle('is-dark', v === 'dark'); });
    if (onScheme) onScheme(v);
  }
  function setAccent(v) {
    S.accent = v; save(); syncTop(); broadcast({ accent: v });
    if (onAccent) onAccent(v);
  }
  var onLang = null, onScheme = null, onAccent = null;

  function swatchesHTML() {
    return ACCENTS.map(function (a) {
      var c = a[0] || 'conic-gradient(#0088ff 0 50%, #6750a4 0)';
      return '<button class="g-swatch' + (a[0] === S.accent ? ' is-active' : '') + '" style="--c:' + c + '" data-c="' + a[0] + '" title="' + a[1] + '"></button>';
    }).join('');
  }
  function bindSwatches(root) {
    $$('.g-swatch', root).forEach(function (b) {
      b.onclick = function () { $$('.g-swatch', root).forEach(function (x) { x.classList.toggle('is-active', x === b); }); setAccent(b.dataset.c); };
    });
    var inp = $('input[type="color"]', root);
    if (inp) {
      inp.value = /^#[0-9a-f]{6}$/i.test(S.accent) ? S.accent : '#0088ff';
      inp.oninput = function () { $$('.g-swatch', root).forEach(function (x) { x.classList.remove('is-active'); }); setAccent(inp.value); };
    }
  }
  function accentPop(anchor) {
    popover(anchor,
      '<div class="g-pop-h">强调色（Apple 的 tint / Material 的种子色）</div><div class="g-swatches">' + swatchesHTML() + '</div>' +
      '<label class="g-pop-row"><span>自定义</span><input type="color"></label>' +
      '<p class="g-pop-note">所有预览实时生效，导出模板时也可以带上。缩略图始终用默认色。</p>', bindSwatches);
  }
  function optionsPop(anchor, after) {
    popover(anchor,
      '<div class="g-pop-h">文字大小（Dynamic Type / 字体缩放）</div><div class="g-seg g-seg-full" data-k="scale"><button data-v="0.85">小</button><button data-v="1">默认</button><button data-v="1.15">大</button><button data-v="1.3">特大</button></div>' +
      '<div class="g-pop-h">对比度</div><div class="g-seg g-seg-full" data-k="contrast"><button data-v="normal">标准</button><button data-v="more">增强</button></div>' +
      '<div class="g-pop-h">Apple 玻璃材质</div><div class="g-seg g-seg-full" data-k="glass"><button data-v="regular">常规</button><button data-v="clear">透明 clear</button><button data-v="opaque">降低透明度</button></div>' +
      '<div class="g-pop-h">Google 信息密度</div><div class="g-seg g-seg-full" data-k="density"><button data-v="normal">标准</button><button data-v="compact">紧凑</button></div>',
      function (el) {
        $$('.g-seg', el).forEach(function (seg) {
          var k = seg.dataset.k;
          segBind(seg, S[k], function (v) { S[k] = k === 'scale' ? +v : v; save(); broadcast(); if (after) after(); });
        });
      });
  }

  /* ---------------- 路由 ---------------- */
  var route = { path: '/', q: new URLSearchParams() };
  function parseHash() {
    var raw = decodeURI(location.hash.replace(/^#/, '')) || '/';
    var qi = raw.indexOf('?');
    return { path: qi < 0 ? raw : raw.slice(0, qi), q: new URLSearchParams(qi < 0 ? '' : raw.slice(qi + 1)) };
  }
  function routeName(p) {
    p = p || route.path;
    if (p.indexOf('/t/') === 0) return 'detail';
    if (p.indexOf('/components') === 0) return 'components';
    if (p.indexOf('/lang') === 0) return 'lang';
    if (p === '/theme') return 'theme';
    if (p === '/kit') return 'kit';
    return 'browse';
  }
  function replaceQuery(q) { var s = q.toString(); history.replaceState(null, '', '#' + route.path + (s ? '?' + s : '')); route.q = q; }
  function cleanup() {
    closePop();
    cleanups.forEach(function (fn) { try { fn(); } catch (e) { /* 忽略 */ } });
    cleanups = []; LIVE = []; onLang = onScheme = onAccent = null;
    document.onkeydown = null;
  }
  function render() {
    var next = parseHash();
    // 组件页内部切换锚点：不重载 iframe
    if (routeName(next.path) === 'components' && view.dataset.view === 'components' && compGoto) {
      route = next; setNav(next.path); compGoto(next.path.split('/')[2] || ''); return;
    }
    cleanup();
    route = next;
    setNav(route.path);
    var name = routeName();
    view.dataset.view = name;
    window.scrollTo(0, 0);
    if (name === 'detail') viewDetail(route.path.slice(3));
    else if (name === 'components') viewComponents(route.path.split('/')[2] || '');
    else if (name === 'lang') viewLang(route.path.split('/')[2] || 'apple');
    else if (name === 'theme') viewTheme();
    else if (name === 'kit') viewKit();
    else viewBrowse();
  }
  var compGoto = null;

  /* ---------------- 收藏（套件） ---------------- */
  function inKit(id) { return S.kit.indexOf(id) >= 0; }
  function toggleKit(id) {
    if (inKit(id)) S.kit = S.kit.filter(function (x) { return x !== id; }); else S.kit.push(id);
    save(); syncTop();
    toast(inKit(id) ? '已加入套件' : '已从套件移除');
    return inKit(id);
  }

  /* ================= 模板浏览 ================= */
  var LAST_LIST = T.map(function (t) { return t.id; });
  function thumb(t, lang, scheme) { return 'gallery/thumbs/' + t.key + '.' + lang + '-' + scheme + '.webp'; }
  function matches(t, f, skip) {
    if (f.plat && skip !== 'plat' && t.platform !== f.plat) return false;
    if (f.cat && skip !== 'cat' && t.category !== f.cat) return false;
    if (f.comp && skip !== 'comp' && t.components.indexOf(f.comp) < 0) return false;
    if (f.q) {
      var hay = (t.title + ' ' + t.desc + ' ' + t.tags.join(' ') + ' ' + t.category + ' ' + t.id).toLowerCase();
      if (!f.q.toLowerCase().split(/\s+/).filter(Boolean).every(function (w) { return hay.indexOf(w) >= 0; })) return false;
    }
    return true;
  }
  function count(f, skip, key, val) {
    return T.filter(function (t) { return matches(t, f, skip) && (val === '' || t[key] === val); }).length;
  }
  function cardHTML(t) {
    var langs = S.cardMode === 'both' ? ['apple', 'google'] : [S.lang];
    var other = S.scheme === 'dark' ? 'light' : 'dark';
    var shots = langs.map(function (l) {
      var sb = t.platform === 'phone'
        ? '<span class="g-sb' + (t.dark || S.scheme === 'dark' ? ' d' : '') + (t.dark || other === 'dark' ? ' ad' : '') + '"><b>9:41</b><i></i></span>' : '';
      return '<span class="g-shot g-sl-' + l + (t.thumbs ? '' : ' no-thumb') + '" style="--ar:' + PLAT[t.platform].ar + '">' +
        '<img src="' + thumb(t, l, S.scheme) + '" alt="" loading="lazy" decoding="async">' +
        '<img class="alt" src="' + thumb(t, l, other) + '" alt="" loading="lazy" decoding="async">' + sb + '</span>';
    }).join('');
    return '<article class="g-card"><a class="g-thumb' + (langs.length > 1 ? ' dual' : '') + '" href="#/t/' + t.id + '" title="' + esc(t.desc) + '">' + shots + '</a>' +
      '<div class="g-meta"><div><h3>' + esc(t.title) + '</h3><p>' + esc(t.category) + ' · ' + PLAT[t.platform].name + '</p></div>' +
      '<button class="g-star' + (inKit(t.id) ? ' is-on' : '') + '" data-id="' + t.id + '" title="加入套件">' + ic('star') + '</button></div></article>';
  }
  function viewBrowse() {
    var q = route.q;
    var f = { q: q.get('q') || '', plat: q.get('plat') || '', cat: q.get('cat') || '', comp: q.get('comp') || '' };
    view.innerHTML =
      '<div class="g-browse' + (S.cardMode === 'both' ? ' both' : '') + '">' +
      '<aside class="g-filters">' +
      '<label class="g-search">' + ic('search') + '<input id="b-q" type="search" placeholder="搜索模板、标签、组件" value="' + esc(f.q) + '"></label>' +
      '<div class="g-fgroup"><h4>卡片显示</h4><div class="g-seg g-seg-full" id="b-mode"><button data-v="apple">Apple</button><button data-v="google">Google</button><button data-v="both">并排</button></div></div>' +
      '<div class="g-fgroup" id="b-plat"></div><div class="g-fgroup" id="b-cats"></div>' +
      '<div class="g-fgroup"><h4>用到的组件</h4><select class="g-select g-w" id="b-comp"></select></div>' +
      '<p class="g-fnote">悬停卡片看另一种明暗。打开模板后可以切换设备、并排对比两种设计语言、查看和下载代码。</p>' +
      '</aside><section class="g-results"><div class="g-results-head"><h1 id="b-title"></h1><span class="g-sub" id="b-count"></span><span class="g-spacer"></span>' +
      '<button class="g-btn ghost" id="b-reset" hidden>清除筛选</button></div><div id="b-list"></div></section></div>';
    segBind($('#b-mode'), S.cardMode === 'both' ? 'both' : S.lang, function (v) {
      if (v === 'both') S.cardMode = 'both'; else { S.cardMode = 'single'; S.lang = v; }
      save(); syncTop(); $('.g-browse').classList.toggle('both', S.cardMode === 'both'); list();
    });
    onLang = function () { segBind($('#b-mode'), S.cardMode === 'both' ? 'both' : S.lang, function () {}); viewBrowse(); };
    onScheme = list;
    var qi = $('#b-q'), timer;
    qi.oninput = function () { clearTimeout(timer); timer = setTimeout(function () { f.q = qi.value.trim(); apply(); }, 160); };
    $('#b-reset').onclick = function () { f = { q: '', plat: '', cat: '', comp: '' }; qi.value = ''; apply(); };
    $('#b-comp').onchange = function () { f.comp = this.value; apply(); };
    $('#b-list').addEventListener('error', function (e) { if (e.target.tagName === 'IMG' && !e.target.classList.contains('alt')) e.target.parentNode.classList.add('no-thumb'); }, true);
    $('#b-list').addEventListener('click', function (e) {
      var st = e.target.closest('.g-star');
      if (st) { e.preventDefault(); st.classList.toggle('is-on', toggleKit(st.dataset.id)); }
    });
    function apply() {
      var nq = new URLSearchParams();
      Object.keys(f).forEach(function (k) { if (f[k]) nq.set(k, f[k]); });
      replaceQuery(nq); remember(); side(); list();
    }
    function remember() { try { sessionStorage.setItem('uig:lastq', route.q.toString() ? '?' + route.q.toString() : ''); } catch (e) { /* 忽略 */ } }
    remember();
    function item(key, val, label, n, icon) {
      var active = f[key] === val;
      return '<button class="g-fitem' + (active ? ' is-active' : '') + '" data-k="' + key + '" data-v="' + esc(val) + '"' + (n || active ? '' : ' disabled') + '>' +
        '<span>' + (icon ? ic(icon, 'sm') : '') + esc(label) + '</span><small>' + n + '</small></button>';
    }
    function side() {
      $('#b-plat').innerHTML = '<h4>平台</h4>' + item('plat', '', '全部', count(f, 'plat', 'platform', '')) +
        Object.keys(PLAT).map(function (p) { return item('plat', p, PLAT[p].name, count(f, 'plat', 'platform', p), PLAT[p].icon); }).join('');
      var cats = function (list) { return list.map(function (c) { return item('cat', c, c, count(f, 'cat', 'category', c)); }).join(''); };
      $('#b-cats').innerHTML = '<h4>分类</h4>' + item('cat', '', '全部分类', count(f, 'cat', 'category', '')) +
        '<h4>App</h4>' + cats(R.categories.app) + '<h4>网页</h4>' + cats(R.categories.web);
      $$('.g-fitem', $('.g-filters')).forEach(function (b) { b.onclick = function () { f[b.dataset.k] = f[b.dataset.k] === b.dataset.v ? '' : b.dataset.v; apply(); }; });
      $('#b-comp').innerHTML = '<option value="">不限</option>' + R.components.filter(function (c) { return c.used; }).map(function (c) {
        return '<option value="' + c.id + '"' + (f.comp === c.id ? ' selected' : '') + '>' + c.name + '（' + count(f, 'comp', 'id', '') + '）</option>';
      }).join('');
      $$('#b-comp option').forEach(function (o) { if (o.value) { var n = T.filter(function (t) { return matches(t, Object.assign({}, f, { comp: o.value })); }).length; o.textContent = o.textContent.replace(/（\d+）/, '（' + n + '）'); } });
    }

    function list() {
      var res = T.filter(function (t) { return matches(t, f); });
      LAST_LIST = res.map(function (t) { return t.id; });
      var parts = [];
      if (f.cat) parts.push(f.cat);
      if (f.plat) parts.push(PLAT[f.plat].name);
      if (f.comp) parts.push('用到「' + R.components.filter(function (c) { return c.id === f.comp; })[0].name + '」');
      if (f.q) parts.push('“' + f.q + '”');
      $('#b-title').textContent = parts.length ? parts.join(' · ') : '全部模板';
      $('#b-count').textContent = '共 ' + res.length + ' 个' + (parts.length ? '' : '，同一份 HTML 可切换 Apple / Google 两种设计语言');
      $('#b-reset').hidden = !parts.length;
      var html = '';
      Object.keys(PLAT).forEach(function (p) {
        var items = res.filter(function (t) { return t.platform === p; });
        if (!items.length) return;
        html += '<section class="g-sec"><h2>' + ic(PLAT[p].icon) + PLAT[p].name + ' <small>' + items.length + '</small></h2>' +
          '<div class="g-grid' + (p === 'phone' ? '' : ' wide') + '">' + items.map(cardHTML).join('') + '</div></section>';
      });
      $('#b-list').innerHTML = html || '<div class="g-empty"><h2>没有符合条件的模板</h2><p>换个关键词，或者清除筛选。</p></div>';
    }
    side(); list();
  }

  /* ================= 模板详情 ================= */
  var D = { mode: 'single', device: '', fit: true, info: true, tab: 'info', split: 50 };
  function statusHTML(kind) {
    var icons = '<span>' + SB.signal + SB.wifi + SB.battery + '</span>';
    if (kind === 'iphone') return '<div class="g-status"><b>9:41</b>' + icons + '</div><div class="g-island"></div><div class="g-homebar"></div>';
    if (kind === 'pixel') return '<div class="g-status"><b>9:41</b>' + icons + '</div><div class="g-punch"></div><div class="g-homebar"></div>';
    if (kind === 'ipad') return '<div class="g-status"><b>9:41　10月26日周一</b>' + icons + '</div><div class="g-homebar"></div>';
    if (kind === 'atablet') return '<div class="g-status"><b>9:41</b>' + icons + '</div><div class="g-homebar"></div>';
    return '';
  }
  function deviceShell(t, key, inner, label) {
    var dv = DEVICES[key], g = GEOM[dv.kind];
    var W = dv.w + g.pad * 2, H = dv.h + g.pad * 2 + (g.bar || 0);
    var bar = g.bar ? '<div class="g-titlebar"><span class="g-lights"><i></i><i></i><i></i></span><span class="g-url">' + ic(dv.kind === 'browser' ? 'web' : 'desktop', 'sm') +
      esc(dv.kind === 'browser' ? t.path : t.title) + '</span><span class="g-lights-sp"></span></div>' : '';
    return h('<div class="g-fitwrap"><div class="g-fit" data-w="' + W + '" data-h="' + H + '"><div class="g-device g-k-' + dv.kind + '" style="width:' + W + 'px;height:' + H + 'px">' + bar +
      '<div class="g-screen" style="width:' + dv.w + 'px;height:' + dv.h + 'px">' + inner + statusHTML(dv.kind) + '</div></div></div>' +
      (label ? '<div class="g-label">' + label + '</div>' : '') + '</div>');
  }
  function deviceFrame(t, lang, key, label) {
    var dv = DEVICES[key];
    var wrap = deviceShell(t, key, '<iframe title="' + esc(t.title) + '"></iframe>', label);
    var iframe = $('iframe', wrap), screen = $('.g-screen', wrap);
    screen.classList.toggle('is-dark', !!t.dark || S.scheme === 'dark');
    iframe.src = src(t.path, lang, { safe: dv.safe.join(','), sync: 1 });
    track(iframe, { screen: screen, group: 'stage', lang: lang });
    return wrap;
  }
  function splitFrame(t, key) {
    var dv = DEVICES[key];
    var wrap = deviceShell(t, key, '<iframe class="g-base" title="Apple"></iframe><iframe class="g-clip" title="Google"></iframe>' +
      '<span class="g-stag l">Apple</span><span class="g-stag r">Google</span><div class="g-divider"><span class="g-handle" title="拖动对照">' + ic('split') + '</span></div>',
      '左：' + LANGS.apple + '　右：' + LANGS.google);
    var screen = $('.g-screen', wrap);
    screen.classList.add('g-splitscreen');
    screen.style.setProperty('--x', D.split + '%');
    screen.classList.toggle('is-dark', !!t.dark || S.scheme === 'dark');
    var a = $('.g-base', wrap), g = $('.g-clip', wrap), safe = dv.safe.join(',');
    a.src = src(t.path, 'apple', { safe: safe, sync: 1 });
    g.src = src(t.path, 'google', { safe: safe, sync: 1 });
    track(a, { screen: screen, group: 'stage', lang: 'apple' });
    track(g, { group: 'stage', lang: 'google' });
    var handle = $('.g-handle', wrap);
    handle.addEventListener('pointerdown', function (e) {
      handle.setPointerCapture(e.pointerId); screen.classList.add('dragging');
      var move = function (ev) {
        var r = screen.getBoundingClientRect();
        D.split = Math.max(0, Math.min(100, (ev.clientX - r.left) / r.width * 100));
        screen.style.setProperty('--x', D.split + '%');
      };
      var up = function () { screen.classList.remove('dragging'); handle.removeEventListener('pointermove', move); handle.removeEventListener('pointerup', up); };
      handle.addEventListener('pointermove', move); handle.addEventListener('pointerup', up);
    });
    return wrap;
  }

  function viewDetail(id) {
    var t = byId[id];
    if (!t) { view.innerHTML = '<div class="g-empty"><h2>找不到模板</h2><p>' + esc(id) + '</p><p><a class="g-btn" href="#/">返回模板列表</a></p></div>'; return; }
    if (D.device && (!DEVICES[D.device] || DEVICES[D.device].plat !== t.platform)) D.device = '';
    var qm = route.q.get('mode'); if (qm) D.mode = qm;
    var idx = LAST_LIST.indexOf(id);
    var prev = idx > 0 ? LAST_LIST[idx - 1] : '', next = idx >= 0 && idx < LAST_LIST.length - 1 ? LAST_LIST[idx + 1] : '';
    var devOpts = '<option value="">自动（' + (t.platform === 'phone' ? 'iPhone / Pixel' : t.platform === 'tablet' ? 'iPad / Android 平板' : '默认') + '）</option>' +
      Object.keys(DEVICES).filter(function (k) { return DEVICES[k].plat === t.platform; }).map(function (k) {
        return '<option value="' + k + '"' + (D.device === k ? ' selected' : '') + '>' + DEVICES[k].name + '</option>';
      }).join('');
    view.innerHTML =
      '<div class="g-detail' + (D.info ? '' : ' info-off') + '"><div class="g-dmain"><div class="g-dbar">' +
      '<a class="g-btn icon ghost" href="#/' + (sessionStorage.getItem('uig:lastq') || '') + '" title="返回列表">' + ic('back') + '</a>' +
      '<div class="g-dtitle"><b>' + esc(t.title) + '</b><span>' + esc(t.category) + ' · ' + PLAT[t.platform].name + (idx >= 0 ? ' · ' + (idx + 1) + ' / ' + LAST_LIST.length : '') + '</span></div>' +
      '<a class="g-btn icon ghost" title="上一个（←）" ' + (prev ? 'href="#/t/' + prev + '"' : 'aria-disabled="true" style="opacity:.35"') + '>' + ic('left') + '</a>' +
      '<a class="g-btn icon ghost" title="下一个（→）" ' + (next ? 'href="#/t/' + next + '"' : 'aria-disabled="true" style="opacity:.35"') + '>' + ic('right') + '</a>' +
      '<div class="g-seg" id="d-mode"><button data-v="single">单个</button><button data-v="compare">' + ic('columns', 'sm') + '<span class="g-hide-md">并排对比</span></button>' +
      '<button data-v="split">' + ic('split', 'sm') + '<span class="g-hide-md">分割对照</span></button></div>' +
      '<select class="g-select" id="d-device" title="设备">' + devOpts + '</select>' +
      '<button class="g-btn icon" id="d-opts" title="文字大小、对比度、材质、密度">' + ic('sliders') + '</button>' +
      '<button class="g-btn" id="d-fit" title="适应窗口 / 实际大小">' + ic('fit', 'sm') + '<span id="d-zoom">100%</span></button>' +
      '<a class="g-btn icon" id="d-open" target="_blank" title="在新窗口打开">' + ic('external') + '</a>' +
      '<button class="g-btn icon' + (inKit(t.id) ? ' is-on' : '') + '" id="d-star" title="加入套件">' + ic('star') + '</button>' +
      '<button class="g-btn icon' + (D.info ? ' is-on' : '') + '" id="d-info" title="说明与代码">' + ic('panel') + '</button>' +
      '</div><div class="g-stage" id="d-stage"></div></div>' +
      '<aside class="g-info"><div class="g-tabs"><button data-tab="info">说明</button><button data-tab="code">' + ic('code', 'sm') + ' 代码</button></div><div class="g-pane" id="d-pane"></div></aside></div>';
    var stage = $('#d-stage');
    function devFor(lang) { return D.device || defaultDevice(t.platform, lang); }
    function openHref() { $('#d-open').href = src(t.path, D.mode === 'single' ? S.lang : 'apple', { safe: DEVICES[devFor(S.lang)].safe.join(',') }); }
    function renderStage() {
      LIVE = [];
      stage.innerHTML = '';
      var fr = h('<div class="g-frames"></div>');
      if (D.mode === 'compare') { fr.appendChild(deviceFrame(t, 'apple', devFor('apple'), LANGS.apple)); fr.appendChild(deviceFrame(t, 'google', devFor('google'), LANGS.google)); }
      else if (D.mode === 'split') fr.appendChild(splitFrame(t, D.device || defaultDevice(t.platform, 'apple')));
      else fr.appendChild(deviceFrame(t, S.lang, devFor(S.lang), DEVICES[devFor(S.lang)].name + ' · ' + LANGS[S.lang]));
      stage.appendChild(fr);
      fit(); openHref();
    }
    function fit() {
      var fits = $$('.g-fit', stage); if (!fits.length) return;
      var s = 1;
      if (D.fit) {
        var cw = stage.clientWidth - 48, ch = stage.clientHeight - 56 - 30;
        var tw = fits.reduce(function (a, el) { return a + +el.dataset.w; }, 0) + 40 * (fits.length - 1);
        var th = Math.max.apply(null, fits.map(function (el) { return +el.dataset.h; }));
        s = Math.max(.2, Math.min(1, cw / tw, ch / th));
      }
      fits.forEach(function (el) { el.style.width = el.dataset.w * s + 'px'; el.style.height = el.dataset.h * s + 'px'; el.firstElementChild.style.setProperty('--s', s); });
      $('#d-zoom').textContent = Math.round(s * 100) + '%';
      $('#d-fit').classList.toggle('is-on', D.fit);
    }
    var ro = new ResizeObserver(function () { fit(); });
    ro.observe(stage); cleanups.push(function () { ro.disconnect(); });
    segBind($('#d-mode'), D.mode, function (v) { D.mode = v; renderStage(); });
    $('#d-device').onchange = function () { D.device = this.value; renderStage(); };
    $('#d-opts').onclick = function () { optionsPop(this); };
    $('#d-fit').onclick = function () { D.fit = !D.fit; fit(); };
    $('#d-star').onclick = function () { this.classList.toggle('is-on', toggleKit(t.id)); };
    $('#d-info').onclick = function () { D.info = !D.info; $('.g-detail').classList.toggle('info-off', !D.info); this.classList.toggle('is-on', D.info); fit(); };
    $$('.g-tabs button').forEach(function (b) { b.onclick = function () { D.tab = b.dataset.tab; pane(); }; });
    onLang = function () { if (D.mode === 'single') renderStage(); };
    document.onkeydown = function (e) {
      if (e.target.closest('input, select, textarea')) return;
      if (e.key === 'ArrowLeft' && prev) location.hash = '#/t/' + prev;
      if (e.key === 'ArrowRight' && next) location.hash = '#/t/' + next;
      if (e.key === 'Escape') location.hash = '#/' + (sessionStorage.getItem('uig:lastq') || '');
    };

    function pane() {
      $$('.g-tabs button').forEach(function (b) { b.classList.toggle('is-active', b.dataset.tab === D.tab); });
      var p = $('#d-pane');
      if (D.tab === 'code') {
        p.innerHTML = '<div class="g-codebar"><code>' + esc(t.path) + '</code><span class="g-spacer"></span><button class="g-btn" id="c-copy">' + ic('copy', 'sm') + '复制</button>' +
          '<button class="g-btn" id="c-dl">' + ic('download', 'sm') + '.html</button></div><pre class="g-code" id="c-code">正在加载源码…</pre>';
        loadSources().then(function (srcs) {
          var code = srcs[t.path] || '';
          $('#c-code').innerHTML = highlight(code);
          $('#c-copy').onclick = function () { copy(code, '已复制 HTML（' + Math.round(code.length / 1024) + ' KB）'); };
          $('#c-dl').onclick = function () { download(t.path.split('/').pop(), code, 'text/html;charset=utf-8'); };
        }).catch(function (e) { $('#c-code').textContent = e.message; });
        return;
      }
      var comps = R.components.filter(function (c) { return t.components.indexOf(c.id) >= 0; });
      var related = T.filter(function (x) { return x.category === t.category && x.id !== t.id; }).slice(0, 8);
      p.innerHTML = '<h2>' + esc(t.title) + '</h2><p class="g-desc">' + esc(t.desc) + '</p>' +
        '<div class="g-actions"><button class="g-btn primary" id="i-zip">' + ic('download', 'sm') + '下载 zip（含 kit）</button>' +
        '<button class="g-btn" id="i-copy">' + ic('copy', 'sm') + '复制 HTML</button>' +
        '<button class="g-btn" id="i-kit">' + ic('star', 'sm') + (inKit(t.id) ? '已在套件中' : '加入套件') + '</button></div>' +
        '<dl class="g-kv"><dt>分类</dt><dd><a href="#/?cat=' + encodeURIComponent(t.category) + '">' + esc(t.category) + '</a></dd>' +
        '<dt>平台</dt><dd>' + PLAT[t.platform].name + '</dd><dt>文件</dt><dd><code>' + esc(t.path) + '</code></dd>' +
        '<dt>大小</dt><dd>' + (t.size / 1024).toFixed(1) + ' KB · ' + t.icons + ' 个图标</dd></dl>' +
        (t.tags.length ? '<div class="g-h">标签</div><div class="g-chips">' + t.tags.map(function (g) { return '<a class="g-chip" href="#/?q=' + encodeURIComponent(g) + '">' + esc(g) + '</a>'; }).join('') + '</div>' : '') +
        '<div class="g-h">用到的组件</div><div class="g-chips">' + comps.map(function (c) { return '<a class="g-chip" href="#/components/' + c.id + '">' + c.name + '</a>'; }).join('') + '</div>' +
        (related.length ? '<div class="g-h">同类模板</div><div class="g-related">' + related.map(function (x) {
          return '<a href="#/t/' + x.id + '"><span>' + esc(x.title) + '</span><small>' + PLAT[x.platform].name + '</small></a>'; }).join('') + '</div>' : '') +
        '<div class="g-h">怎么用</div><ol class="g-howto"><li>下载 zip，解压后直接打开 <code>' + esc(t.path) + '</code>。</li>' +
        '<li>改 <code>&lt;html data-lang&gt;</code> 在 Apple 和 Google 之间切换，<code>data-scheme</code> 切换明暗，<code>style="--accent:#…"</code> 换强调色。</li>' +
        '<li>组件类名和 token 见 <code>kit/COMPONENTS.md</code>，或看本站“组件”页。</li></ol>';
      $('#i-zip').onclick = function () { exportZip([t.id], { lang: D.mode === 'single' ? S.lang : 'apple', accent: S.accent, filename: t.key + '.zip' }); };
      $('#i-copy').onclick = function () { loadSources().then(function (s) { copy(s[t.path], '已复制 HTML'); }); };
      $('#i-kit').onclick = function () { var on = toggleKit(t.id); this.lastChild.textContent = on ? '已在套件中' : '加入套件'; $('#d-star').classList.toggle('is-on', on); };
    }
    renderStage(); pane();
  }

  /* ================= 组件目录 ================= */
  function viewComponents(anchor) {
    view.innerHTML = '<div class="g-comp"><aside class="g-comp-nav"><div class="g-h" style="margin-top:6px">组件目录</div>' +
      R.components.map(function (c) { return '<a class="g-fitem" href="#/components/' + c.id + '" data-id="' + c.id + '"><span>' + c.name + '</span><small>' + (c.used || '') + '</small></a>'; }).join('') +
      '<p class="g-fnote">右侧数字是用到这个组件的模板数。</p></aside>' +
      '<section class="g-comp-main"><div class="g-dbar"><div class="g-dtitle"><b>组件目录</b><span>每个组件的变体与状态。用顶栏切换语言与明暗，或并排看两种语言。</span></div>' +
      '<div class="g-seg" id="c-mode"><button data-v="single">单个</button><button data-v="both">Apple 与 Google 并排</button></div>' +
      '<button class="g-btn icon" id="c-opts" title="文字大小、对比度、材质、密度">' + ic('sliders') + '</button>' +
      '<a class="g-btn" id="c-uses" href="#/">查看使用它的模板</a>' +
      '<a class="g-btn icon" target="_blank" href="templates/_catalog.html" title="在新窗口打开">' + ic('external') + '</a></div>' +
      '<div class="g-comp-frames" id="c-frames"></div></section></div>';
    var cur = anchor;
    function frames() {
      LIVE = [];
      var box = $('#c-frames'); box.innerHTML = '';
      (S.compBoth ? ['apple', 'google'] : [S.lang]).forEach(function (l) {
        var col = h('<div class="g-col"><div class="g-col-h">' + LANGS[l] + '</div><iframe title="组件目录"></iframe></div>');
        var f = $('iframe', col);
        f.src = src('templates/_catalog.html', l, { sync: 1 }) + (cur ? '#' + cur : '');
        track(f, { group: 'cat', lang: l });
        box.appendChild(col);
      });
    }
    compGoto = function (id) {
      cur = id;
      $$('.g-comp-nav .g-fitem').forEach(function (a) { a.classList.toggle('is-active', a.dataset.id === id); });
      var c = R.components.filter(function (x) { return x.id === id; })[0];
      var u = $('#c-uses');
      if (c && c.used) { u.hidden = false; u.href = '#/?comp=' + id; u.textContent = '使用「' + c.name + '」的 ' + c.used + ' 个模板'; } else u.hidden = true;
      LIVE.forEach(function (f) { post(f, { type: 'ui:goto', hash: id }); });
    };
    segBind($('#c-mode'), S.compBoth ? 'both' : 'single', function (v) { S.compBoth = v === 'both'; save(); frames(); });
    $('#c-opts').onclick = function () { optionsPop(this); };
    onLang = function () { if (!S.compBoth) frames(); };
    frames(); compGoto(anchor);
  }

  /* ================= 设计语言 ================= */
  var LANG_DOC = {
    apple: {
      title: 'Apple · Liquid Glass（iOS 26）',
      lead: 'Apple 在 2025 年 6 月发布的新设计，第一次统一了 iOS 26、iPadOS 26、macOS Tahoe 26、watchOS 26 和 tvOS 26。核心是一种叫 Liquid Glass 的半透明材质：它会折射和反射背后的内容，颜色随内容变化，并在浅色和深色环境之间自动适应。',
      points: [
        ['功能层浮在内容之上', 'Liquid Glass 用在标签栏、侧栏、工具栏这类控件和导航上，内容在它下面滚动透出。HIG 明确写着：不要把 Liquid Glass 用在内容层。'],
        ['少用', '系统组件会自动带上玻璃效果。自定义控件只给最重要的几个加，用多了会把注意力从内容上抢走。'],
        ['两种变体', 'regular 会模糊背景并调整亮度，文字多的地方（提醒框、侧栏、弹出框）用它；clear 高度透明，只用在照片、视频这类丰富背景上，背景亮时加一层 35% 的暗层。'],
        ['内容层用标准材质', 'iOS 仍有 ultraThin、thin、regular、thick 四档标准材质，配合 label 到 quaternaryLabel 四级 vibrant 文字颜色使用；quaternary 不要放在 thin 和 ultraThin 上。'],
        ['系统色重新调过', '2025 年 6 月的 HIG 更新了系统色值。每种颜色都有浅色、深色和“增强对比度”浅色、深色共四个值，kit 里全部照抄。'],
        ['Dynamic Type', '正文默认 17pt，最小 11pt。字号表从 Large Title 34 到 Caption 2 11，用户可以整体放大。']
      ],
      kit: [
        ['标签栏', '浮动的玻璃胶囊，选中项有高亮底；iOS 26 的独立搜索按钮用 .tab-group + .tab.search'],
        ['顶栏', '标题居中，按钮是玻璃圆钮，多个按钮合进一个胶囊（.bar-group），滚动后出现渐隐的边缘模糊'],
        ['列表', '24px 圆角的内嵌分组，发丝分隔线从文字起点开始，彩色方块图标'],
        ['浮层', 'sheet 四周留边、圆角 36px；对话框和菜单用更厚的玻璃'],
        ['动效', 'SwiftUI 的 smooth、snappy、bouncy 弹簧，按 duration 和 bounce 数值积分成 CSS linear() 曲线'],
        ['可调项', 'data-glass="clear" 对应 clear 变体，"opaque" 对应“降低透明度”；data-contrast="more" 换成增强对比度色值']
      ],
      sources: [
        ['Apple HIG · Materials（2025-09 更新 Liquid Glass 指南）', 'https://developer.apple.com/design/human-interface-guidelines/materials'],
        ['Apple HIG · Color（系统色值）', 'https://developer.apple.com/design/human-interface-guidelines/color'],
        ['Apple HIG · Typography', 'https://developer.apple.com/design/human-interface-guidelines/typography'],
        ['Apple Newsroom · 2025-06-09 新设计发布', 'https://www.apple.com/newsroom/2025/06/apple-introduces-a-delightful-and-elegant-new-software-design/']
      ]
    },
    google: {
      title: 'Google · Material 3 Expressive',
      lead: 'Google 在 2025 年 5 月发布，从 Android 16 和 Wear OS 6 开始用到系统和 Google 应用里。它在 Material You 的基础上加入更有弹性的动效、会变形的形状和强调型字号，目标是让界面更有情绪、重点操作更突出。',
      points: [
        ['基于研究', 'Google Design 的文章说，这次更新做了 46 项研究、涉及超过 18,000 名参与者，比如按钮能做多大、哪种进度指示器让等待显得更短。'],
        ['五个表达手段', '颜色、形状、大小、动效和容器（containment）。用它们把关键操作突出出来，把相关元素归在一起。'],
        ['弹簧动效', '动效改成一套更自然的弹簧系统，分 standard 和 expressive 两种方案。例如划掉一条通知时，旁边的通知会跟着轻微响应。'],
        ['形状', '按钮按下时圆角会变化，形状库里有饼干形、四叶草、星芒等装饰形状，用在头像、封面和加载指示器上。'],
        ['新组件', '按钮组、分割按钮、切换按钮、浮动工具栏、可伸缩的顶栏和底栏、分段列表项、新的时间选择器。Compose Material3 1.5 alpha 版本里，其中多数已经转为稳定 API。'],
        ['动态颜色', '从一个种子色生成整套色彩角色：primary、secondary、tertiary 三组主色和容器色，加上从 lowest 到 highest 五级 surface container。']
      ],
      kit: [
        ['颜色', '由 --accent 在 OKLCH 空间推导 M3 色彩角色。这是近似算法，不是 Google 的 HCT，色值会和 Material Theme Builder 有出入'],
        ['层级', '不用模糊，用 surface container 的深浅分层；FAB、卡片、菜单靠色调和阴影区分'],
        ['导航', '满宽导航栏，选中图标外有药丸指示器；平板和桌面用导航轨（.rail）或抽屉'],
        ['列表', '分段列表：每项独立、间隔 2px，首尾大圆角'],
        ['按钮与进度', '按下时形状变化（圆角变小）；线性进度条在轨道和指示器之间留缝、末端有停止点，.wavy 是波浪形'],
        ['文本框', 'outlined 文本框加浮动标签，.field.filled 是 filled 版本']
      ],
      sources: [
        ['Google Blog · 2025-05-13 Material 3 Expressive 发布', 'https://blog.google/products/android/material-3-expressive-android-wearos-launch/'],
        ['Google Design · Expressive Design 背后的研究', 'https://design.google/library/expressive-material-design-google-research'],
        ['Compose Material3 发布说明（组件 API 进展）', 'https://developer.android.com/jetpack/androidx/releases/compose-material3'],
        ['Material Design 3 官方规范', 'https://m3.material.io/']
      ]
    }
  };
  var COMPARE = [
    ['颜色', 'iOS 系统色 + 语义层级（label、fill、separator）；强调色是 tint', '种子色推导整套色彩角色（primary / secondary / tertiary / surface container）'],
    ['材质与层级', 'Liquid Glass 浮在内容上方；内容层用四档标准材质', '不透明的 surface container，靠色调和阴影分层'],
    ['字体', 'SF Pro（Text / Display 按字号自动切换）', 'Google Sans Flex / Roboto Flex'],
    ['字号', 'Dynamic Type：Large Title 34 … Caption 2 11，正文 17', 'Type scale：Display / Headline / Title / Body / Label × 大中小，正文 16'],
    ['形状', '胶囊按钮，同心圆角，24px 分组列表', '形状随状态变化；28px 卡片、48px 大容器；装饰形状库'],
    ['动效', 'SwiftUI 弹簧（smooth / snappy / bouncy），玻璃随触摸形变', 'motion scheme：expressive 空间弹簧 + effects 弹簧'],
    ['顶栏', '标题居中；大标题滚动后收起；玻璃圆钮', '标题居左，64px；可伸缩大标题；图标按钮无底'],
    ['底部导航', '浮动玻璃标签栏，搜索可独立成圆钮', '满宽导航栏 + 药丸指示器；FAB 在右下'],
    ['列表', '内嵌分组 + 发丝分隔线 + chevron', '分段列表项，无分隔线，无 chevron'],
    ['文本框', '灰底圆角，标签在上方', 'outlined / filled，浮动标签'],
    ['对话框', '玻璃底，按钮等宽并排', 'surface-container-high，文字按钮右对齐'],
    ['网页风格', 'apple.com：居中大标题、浅灰磁贴、蓝色“进一步了解 ›”', 'Google Store：左对齐、彩色大圆角容器、药丸按钮']
  ];

  function specFrame(lang) {
    var f = h('<iframe title="' + LANGS[lang] + ' 规范样张" style="height:600px"></iframe>');
    f.src = src('templates/_tokens.html', lang, { autoheight: 1 });
    track(f, { autoHeight: true, lang: lang });
    return f;
  }
  function viewLang(which) {
    if (!LANG_DOC[which] && which !== 'compare') which = 'apple';
    var tabs = '<div class="g-seg g-doc-tabs" id="l-tabs"><button data-v="apple">' + LANGS.apple + '</button><button data-v="google">' + LANGS.google + '</button><button data-v="compare">两者对比</button></div>';
    if (which === 'compare') {
      view.innerHTML = '<div class="g-doc">' + tabs + '<div class="g-hero"><h1>Apple 与 Google 对比</h1><p>两套语言在同一组件上的不同处理。kit 用同一套类名实现两者，切换 <code>data-lang</code> 就能看到差异。</p></div>' +
        '<table class="g-table"><thead><tr><th></th><th>' + LANGS.apple + '</th><th>' + LANGS.google + '</th></tr></thead><tbody>' +
        COMPARE.map(function (r) { return '<tr><th>' + r[0] + '</th><td>' + esc(r[1]) + '</td><td>' + esc(r[2]) + '</td></tr>'; }).join('') + '</tbody></table>' +
        '<div class="g-h" style="margin-top:28px">样张（实时渲染）</div><div class="g-spec-pair"><div class="g-spec" id="l-a"></div><div class="g-spec" id="l-g"></div></div></div>';
      $('#l-a').appendChild(specFrame('apple')); $('#l-g').appendChild(specFrame('google'));
    } else {
      var d = LANG_DOC[which];
      view.innerHTML = '<div class="g-doc">' + tabs + '<div class="g-hero"><h1>' + d.title + '</h1><p>' + d.lead + '</p></div>' +
        '<div class="g-h">核心要点</div><div class="g-cards">' + d.points.map(function (p) { return '<div class="g-pcard"><h3>' + p[0] + '</h3><p>' + p[1] + '</p></div>'; }).join('') + '</div>' +
        '<div class="g-h">在 kit 里怎么体现</div><table class="g-table"><tbody>' + d.kit.map(function (r) { return '<tr><th>' + r[0] + '</th><td>' + esc(r[1]) + '</td></tr>'; }).join('') + '</tbody></table>' +
        '<div class="g-actions"><a class="g-btn primary" href="#/" id="l-browse">用这种语言浏览全部模板</a><a class="g-btn" href="#/components">看组件目录</a><a class="g-btn" href="#/lang/compare">和另一种对比</a></div>' +
        '<div class="g-h">规范样张（颜色、字号、形状、材质、动效，实时渲染；顶栏可切换明暗和强调色）</div><div class="g-spec" id="l-spec"></div>' +
        '<div class="g-h">来源</div><ul class="g-sources">' + d.sources.map(function (s) { return '<li><a href="' + s[1] + '" target="_blank" rel="noopener">' + s[0] + '</a></li>'; }).join('') + '</ul>' +
        '<p class="g-fnote">kit 是参照这些规范写的风格实现，不是官方组件，也不包含任何字体文件和商标。</p></div>';
      $('#l-spec').appendChild(specFrame(which));
      $('#l-browse').onclick = function () { setLang(which); };
    }
    segBind($('#l-tabs'), which, function (v) { location.hash = '#/lang/' + v; });
    onLang = function (v) { if (which !== 'compare') location.hash = '#/lang/' + v; };
  }

  /* ================= 主题 ================= */
  var TOKENS = ['--ui-bg', '--ui-bg-plain', '--ui-surface', '--ui-surface-2', '--ui-surface-3', '--ui-fill', '--ui-fill-2', '--ui-text', '--ui-text-2', '--ui-text-3', '--ui-text-4',
    '--ui-line', '--ui-line-strong', '--ui-accent', '--ui-on-accent', '--ui-accent-soft', '--ui-on-accent-soft', '--ui-accent-2-soft', '--ui-on-accent-2-soft',
    '--ui-accent-3', '--ui-accent-3-soft', '--ui-on-accent-3-soft', '--ui-danger', '--ui-danger-soft', '--ui-on-danger-soft', '--ui-success', '--ui-success-soft',
    '--ui-on-success-soft', '--ui-warning', '--ui-warning-soft', '--ui-on-warning-soft', '--ui-inverse', '--ui-on-inverse', '--ui-glass-bg'];
  var SHAPE_TOKENS = ['--ui-radius-xs', '--ui-radius-s', '--ui-radius-m', '--ui-radius-l', '--ui-radius-xl', '--ui-font', '--ui-font-display', '--ui-font-mono'];
  function exportText(fmt, lang, light, dark) {
    var head = '/* UI Kit 主题 · ' + LANGS[lang] + ' · 强调色 ' + (S.accent || '默认') + ' · 生成于 ' + new Date().toLocaleString('zh-CN') + ' */\n';
    var colorName = function (k) { return '--color-' + k.replace('--ui-', ''); };
    var other = function (k) { return k.replace('--ui-radius-', '--radius-').replace('--ui-font-display', '--font-display').replace('--ui-font-mono', '--font-mono').replace('--ui-font', '--font-sans'); };
    if (fmt === 'json') {
      var pick = function (o, keys) { var r = {}; keys.forEach(function (k) { r[k.replace(/^--/, '')] = o[k]; }); return r; };
      return JSON.stringify({ name: 'ui-kit-' + lang, accent: S.accent || null, contrast: S.contrast, light: pick(light, TOKENS), dark: pick(dark, TOKENS), shape: pick(light, SHAPE_TOKENS) }, null, 2);
    }
    if (fmt === 'tw') {
      return head + '@import "tailwindcss";\n\n@theme {\n' + TOKENS.map(function (k) { return '  ' + colorName(k) + ': ' + light[k] + ';'; }).join('\n') + '\n' +
        SHAPE_TOKENS.map(function (k) { return '  ' + other(k) + ': ' + light[k] + ';'; }).join('\n') + '\n}\n\n@media (prefers-color-scheme: dark) {\n  :root {\n' +
        TOKENS.map(function (k) { return '    ' + colorName(k) + ': ' + dark[k] + ';'; }).join('\n') + '\n  }\n}\n';
    }
    return head + ':root {\n' + TOKENS.concat(SHAPE_TOKENS).map(function (k) { return '  ' + k + ': ' + light[k] + ';'; }).join('\n') + '\n}\n\n@media (prefers-color-scheme: dark) {\n  :root {\n' +
      TOKENS.map(function (k) { return '    ' + k + ': ' + dark[k] + ';'; }).join('\n') + '\n  }\n}\n';
  }

  function miniFrame(t, lang, scale) {
    var dv = DEVICES[defaultDevice('phone', lang)];
    var w = 402, hgt = 874;
    var wrap = h('<div class="g-fitwrap"><div class="g-fit" style="width:' + w * scale + 'px;height:' + hgt * scale + 'px"><div class="g-device g-k-bare" style="width:' + w + 'px;height:' + hgt + 'px;--s:' + scale + '">' +
      '<div class="g-screen" style="width:' + w + 'px;height:' + hgt + 'px"><iframe title="' + esc(t.title) + '"></iframe></div></div></div><div class="g-label">' + esc(t.title) + ' · ' + (lang === 'apple' ? 'Apple' : 'Google') + '</div></div>');
    var f = $('iframe', wrap);
    f.src = src(t.path, lang, { safe: dv.safe.join(',') });
    track(f, { lang: lang });
    return wrap;
  }
  function viewTheme() {
    var fmt = 'css', lang = S.lang;
    view.innerHTML = '<div class="g-theme"><aside class="g-theme-side"><h2 class="g-h1">主题</h2>' +
      '<p class="g-desc">这里的设置对整个展示站的预览生效，下载 zip 时也可以写进模板。kit 的颜色都从一个强调色推导，所以换一个颜色就是换一套主题。</p>' +
      '<div class="g-h">强调色 / 种子色</div><div class="g-swatches" id="th-sw">' + swatchesHTML() + '</div>' +
      '<label class="g-pop-row"><span>自定义颜色</span><input type="color"></label>' +
      '<div class="g-h">明暗</div><div class="g-seg g-seg-full" id="th-scheme"><button data-v="light">浅色</button><button data-v="dark">深色</button></div>' +
      '<div class="g-h">其他</div><button class="g-btn" id="th-opts">' + ic('sliders', 'sm') + '文字大小、对比度、材质、密度</button>' +
      '<div class="g-h">导出 token</div><div class="g-seg g-seg-full" id="th-lang"><button data-v="apple">Apple</button><button data-v="google">Google</button></div>' +
      '<div class="g-seg g-seg-full g-mt" id="th-fmt"><button data-v="css">CSS 变量</button><button data-v="json">JSON</button><button data-v="tw">Tailwind v4</button></div>' +
      '<pre class="g-code g-export" id="th-out">生成中…</pre>' +
      '<div class="g-actions"><button class="g-btn primary" id="th-copy">' + ic('copy', 'sm') + '复制</button><button class="g-btn" id="th-dl">' + ic('download', 'sm') + '下载</button></div>' +
      '<p class="g-fnote">导出的是解析后的实际色值（浅色和深色各一套），可以用在不引用 kit 的项目里，比如 Tailwind、Figma 变量或原生 App。</p>' +
      '</aside><section class="g-theme-main"><div class="g-theme-grid" id="th-grid"></div></section></div>';
    var picks = ['app/settings', 'app/bank-home', 'app/smart-home', 'app/shop-home'].filter(function (id) { return byId[id]; }).slice(0, 3);
    var grid = $('#th-grid');
    picks.forEach(function (id) { ['apple', 'google'].forEach(function (l) { grid.appendChild(miniFrame(byId[id], l, .5)); }); });
    bindSwatches($('.g-theme-side'));
    segBind($('#th-scheme'), S.scheme, function (v) { setScheme(v); });
    $('#th-opts').onclick = function () { optionsPop(this, regen); };
    segBind($('#th-lang'), lang, function (v) { lang = v; regen(); });
    segBind($('#th-fmt'), fmt, function (v) { fmt = v; regen(); });
    var out = '', seq = 0, timer;
    function regen() {
      clearTimeout(timer);
      timer = setTimeout(function () {
        var my = ++seq, names = TOKENS.concat(SHAPE_TOKENS);
        $('#th-out').textContent = '生成中…';
        Promise.all([readTokens(lang, 'light', names), readTokens(lang, 'dark', names)]).then(function (r) {
          if (my !== seq) return;
          out = exportText(fmt, lang, r[0], r[1]);
          $('#th-out').textContent = out;
        });
      }, 250);
    }
    $('#th-copy').onclick = function () { copy(out, '已复制主题'); };
    $('#th-dl').onclick = function () { download('ui-theme-' + lang + (fmt === 'json' ? '.json' : '.css'), out); };
    onAccent = function () { regen(); };
    onScheme = function () { segBind($('#th-scheme'), S.scheme, function (v) { setScheme(v); }); };
    regen();
  }

  /* ================= 套件 ================= */
  function viewKit() {
    var o = { lang: S.lang, only: false, accent: !!S.accent, catalog: true };
    function draw() {
      var ids = S.kit.filter(function (id) { return byId[id]; });
      view.innerHTML = '<div class="g-doc"><div class="g-hero"><h1>我的套件</h1><p>在模板卡片或详情页点星标，把要用的模板收进来，再一次导出。它们共用同一套 kit，放在一个项目里风格一致。</p></div>' +
        '<div class="g-panel g-kit-opts"><div class="g-pop-row"><span>默认设计语言</span><div class="g-seg" id="k-lang"><button data-v="apple">Apple</button><button data-v="google">Google</button></div></div>' +
        '<label class="g-check"><input type="checkbox" id="k-only"' + (o.only ? ' checked' : '') + '>只保留这种语言的样式（去掉另一种语言的 CSS）</label>' +
        '<label class="g-check"><input type="checkbox" id="k-accent"' + (o.accent && S.accent ? ' checked' : '') + (S.accent ? '' : ' disabled') + '>写入当前强调色 ' +
        (S.accent ? '<span class="g-dot" style="--dot:' + S.accent + '"></span><code>' + S.accent + '</code>' : '（当前是默认色，可在顶栏或“主题”页修改）') + '</label>' +
        '<label class="g-check"><input type="checkbox" id="k-cat"' + (o.catalog ? ' checked' : '') + '>附带组件目录页和规范样张</label>' +
        '<div class="g-actions"><button class="g-btn primary" id="k-zip"' + (ids.length ? '' : ' disabled') + '>' + ic('download', 'sm') + '下载套件 zip（' + ids.length + ' 个模板）</button>' +
        '<button class="g-btn" id="k-all">' + ic('download', 'sm') + '下载整个模板库（' + T.length + ' 个）</button>' +
        (ids.length ? '<button class="g-btn ghost" id="k-clear">清空套件</button>' : '') + '</div></div>' +
        (ids.length ? '<div class="g-sec"><h2>已收藏 <small>' + ids.length + '</small></h2><div class="g-grid wide">' + ids.map(function (id) { return cardHTML(byId[id]); }).join('') + '</div></div>'
          : '<div class="g-empty"><h2>套件是空的</h2><p>去<a href="#/" style="color:var(--g-accent)">模板</a>页，点卡片右下角的星标。</p></div>') + '</div>';
      segBind($('#k-lang'), o.lang, function (v) { o.lang = v; });
      $('#k-only').onchange = function () { o.only = this.checked; };
      $('#k-accent').onchange = function () { o.accent = this.checked; };
      $('#k-cat').onchange = function () { o.catalog = this.checked; };
      var opts = function (name) { return { lang: o.lang, only: o.only, accent: o.accent ? S.accent : '', catalog: o.catalog, filename: name }; };
      $('#k-zip').onclick = function () { exportZip(ids, opts('ui-kit-' + ids.length + '.zip')); };
      $('#k-all').onclick = function () { exportZip(T.map(function (t) { return t.id; }), opts('ui-templates-all.zip')); };
      if ($('#k-clear')) $('#k-clear').onclick = function () { if (confirm('清空套件里的 ' + ids.length + ' 个模板？')) { S.kit = []; save(); syncTop(); draw(); } };
      $$('.g-star', view).forEach(function (b) { b.onclick = function (e) { e.preventDefault(); toggleKit(b.dataset.id); draw(); }; });
    }
    draw();
    onScheme = draw; onLang = draw; onAccent = draw;
  }

  /* ================= 启动 ================= */
  renderTop();
  window.addEventListener('hashchange', render);
  render();
})();
