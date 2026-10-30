/* UI Kit 运行时（无依赖，放在 <head> 里同步加载，避免闪烁）
 * 1. 读取 URL 参数并设置 <html> 属性：
 *    ?lang=apple|google  &scheme=light|dark|auto  &accent=%230088ff  &scale=1.2
 *    &contrast=more  &glass=regular|clear|opaque|0～1（iOS 27 透明度滑杆）  &density=compact  &safe=62,34  &device=phone|tablet|desktop
 *    Google 模式下按种子色用官方 HCT 算法计算 --md-* 色彩角色（见 m3()）
 * 2. 接收父页面 postMessage({type:'ui:set', ...同上}) 实时切换；加载完成后回发 {type:'ui:ready'}
 * 3. 挂载图标 sprite；滚动时给 <html> 加 .scrolled / .title-in（大标题收起）
 * 4. 演示交互：分段/标签/筛选片单选，[data-open]/[data-close] 打开关闭浮层，滑块填充
 * 5. ?audit=1 时检查横向溢出和缺失图标，结果写入 <script id="ui-audit" type="application/json">
 */
(function () {
  var d = document.documentElement;
  var q = new URLSearchParams(location.search);
  var mq = window.matchMedia ? matchMedia('(prefers-color-scheme: dark)') : null;

  function apply(o) {
    if (!o) return;
    if (o.lang) d.setAttribute('data-lang', o.lang === 'google' ? 'google' : 'apple');
    if (o.scheme) d.setAttribute('data-scheme', o.scheme === 'auto' ? (mq && mq.matches ? 'dark' : 'light') : o.scheme);
    if ('accent' in o) { if (o.accent) d.style.setProperty('--accent', o.accent); else d.style.removeProperty('--accent'); }
    if (o.scale) d.style.setProperty('--ts', String(o.scale));
    if ('contrast' in o) { if (o.contrast && o.contrast !== 'normal') d.setAttribute('data-contrast', o.contrast); else d.removeAttribute('data-contrast'); }
    if ('glass' in o) {
      // iOS 27 透明度滑杆：数值 0（完全着色）～1（超透明）写到 --glass-t；clear / opaque 是预设
      var gv = String(o.glass == null ? '' : o.glass);
      if (/^(0|1|0?\.\d+)$/.test(gv)) { d.style.setProperty('--glass-t', gv); d.removeAttribute('data-glass'); }
      else { d.style.removeProperty('--glass-t'); if (gv && gv !== 'regular') d.setAttribute('data-glass', gv); else d.removeAttribute('data-glass'); }
    }
    if ('density' in o) { if (o.density && o.density !== 'normal') d.setAttribute('data-density', o.density); else d.removeAttribute('data-density'); }
    if (o.device) d.setAttribute('data-device', o.device);
    if (o.safe != null) {
      var s = String(o.safe).split(',');
      d.style.setProperty('--safe-top', (parseFloat(s[0]) || 0) + 'px');
      d.style.setProperty('--safe-bottom', (parseFloat(s[1]) || 0) + 'px');
    }
    if (o.lang || o.scheme || 'accent' in o || 'contrast' in o) m3();
    if (window.UIIcons && document.body) window.UIIcons.mount(d.getAttribute('data-lang'));
  }

  /* Google 模式的色彩角色：用官方 material-color-utilities（HCT、Tonal Spot、2025 色彩规范）从种子色计算，
     写到 <html> 的内联变量上；google.css 里的 OKLCH 推导只在没有 JS 时作为后备。 */
  var M3_ROLES = ['primary', 'onPrimary', 'primaryContainer', 'onPrimaryContainer', 'secondary', 'onSecondary', 'secondaryContainer',
    'onSecondaryContainer', 'tertiary', 'onTertiary', 'tertiaryContainer', 'onTertiaryContainer', 'error', 'onError', 'errorContainer',
    'onErrorContainer', 'surface', 'surfaceDim', 'surfaceBright', 'surfaceContainerLowest', 'surfaceContainerLow', 'surfaceContainer',
    'surfaceContainerHigh', 'surfaceContainerHighest', 'onSurface', 'onSurfaceVariant', 'outline', 'outlineVariant', 'inverseSurface',
    'inverseOnSurface', 'inversePrimary'];
  var M3_DEFAULT_SEED = '#6750a4';
  var m3Key = '';
  function kebab(s) { return '--md-' + s.replace(/[A-Z]/g, function (c) { return '-' + c.toLowerCase(); }); }
  function m3Seed() {
    var a = (d.style.getPropertyValue('--accent') || '').trim();
    if (/^#[0-9a-f]{6}$/i.test(a)) return a.toLowerCase();
    if (/^#[0-9a-f]{3}$/i.test(a)) return ('#' + a[1] + a[1] + a[2] + a[2] + a[3] + a[3]).toLowerCase();
    if (a && document.body && window.UITokens) { var hx = window.UITokens.hex(a); if (/^#[0-9a-f]{6}$/i.test(hx)) return hx; }
    return M3_DEFAULT_SEED;
  }
  function m3() {
    var M = window.M3Color;
    if (!M) return;
    if (d.getAttribute('data-lang') !== 'google') {
      if (m3Key) { M3_ROLES.forEach(function (r) { d.style.removeProperty(kebab(r)); }); m3Key = ''; d.removeAttribute('data-m3'); }
      return;
    }
    var dark = d.getAttribute('data-scheme') === 'dark', contrast = d.getAttribute('data-contrast') === 'more' ? 1 : 0, seed = m3Seed();
    var key = seed + dark + contrast;
    if (key === m3Key) return;
    try {
      var s = new M.SchemeTonalSpot(M.Hct.fromInt(M.argbFromHex(seed)), dark, contrast, '2025', 'phone');
      M3_ROLES.forEach(function (r) { d.style.setProperty(kebab(r), M.hexFromArgb(s[r])); });
      m3Key = key; d.setAttribute('data-m3', 'hct');
    } catch (err) { /* 出错时保留 CSS 的 OKLCH 后备 */ }
  }
  window.UIM3 = { refresh: function () { m3Key = ''; m3(); } };

  var init = {};
  q.forEach(function (v, k) { init[k] = v; });
  if (!d.getAttribute('data-lang') && !init.lang) init.lang = 'apple';
  if (!init.scheme && !d.getAttribute('data-scheme')) init.scheme = 'auto';
  apply(init);
  if (mq && (!q.get('scheme') || q.get('scheme') === 'auto') && mq.addEventListener) {
    mq.addEventListener('change', function () { if (!d.hasAttribute('data-scheme-locked')) apply({ scheme: 'auto' }); });
  }

  var embedded = window.parent !== window;
  function post(msg) { if (embedded) { try { window.parent.postMessage(msg, '*'); } catch (err) { /* 忽略 */ } } }
  // 页面视觉上是否为深色（决定外框状态栏用白字还是黑字）
  function isDark() {
    return d.getAttribute('data-scheme') === 'dark' || !!(document.body && document.body.getAttribute('data-scheme-hint') === 'dark');
  }
  function postState() { post({ type: 'ui:state', dark: isDark(), lang: d.getAttribute('data-lang'), height: d.scrollHeight }); }

  // 把任意 CSS 颜色（含 oklch、color-mix、var()）解析成 #rrggbb / #rrggbbaa
  var probe, ctx;
  function toHex(value) {
    if (!probe) {
      probe = document.createElement('span'); probe.style.display = 'none'; document.body.appendChild(probe);
      ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true }); ctx.canvas.width = ctx.canvas.height = 1;
    }
    probe.style.color = ''; probe.style.color = value;
    var c = getComputedStyle(probe).color;
    ctx.clearRect(0, 0, 1, 1); ctx.fillStyle = '#000'; ctx.fillStyle = c; ctx.fillRect(0, 0, 1, 1);
    var p = ctx.getImageData(0, 0, 1, 1).data;
    var hex = '#' + [p[0], p[1], p[2]].map(function (n) { return ('0' + n.toString(16)).slice(-2); }).join('');
    return p[3] < 255 ? hex + ('0' + p[3].toString(16)).slice(-2) : hex;
  }
  function tokens(names) {
    var cs = getComputedStyle(d), out = {};
    names.forEach(function (n) {
      var raw = cs.getPropertyValue(n).trim();
      out[n] = /^(#|rgb|hsl|oklch|oklab|lab|lch|color|var\(|[a-z]+$)/i.test(raw) && !/^\d/.test(raw) ? toHex('var(' + n + ')') : raw;
    });
    return out;
  }
  window.UITokens = { hex: toHex, read: tokens };

  window.addEventListener('message', function (e) {
    var m = e.data;
    if (!m || typeof m !== 'object') return;
    if (m.type === 'ui:set') {
      if (m.scheme && m.scheme !== 'auto') d.setAttribute('data-scheme-locked', '');
      apply(m);
      requestAnimationFrame(postState);
    }
    if (m.type === 'ui:scroll') window.scrollTo({ top: m.top || 0, behavior: m.smooth ? 'smooth' : 'auto' });
    if (m.type === 'ui:tokens') post({ type: 'ui:tokens', id: m.id, values: tokens(m.names || []) });
    if (m.type === 'ui:goto' && m.hash) { var el = document.getElementById(m.hash); if (el) el.scrollIntoView({ behavior: m.smooth ? 'smooth' : 'auto' }); }
  });

  function onScroll() {
    var y = window.scrollY || 0;
    d.classList.toggle('scrolled', y > 4);
    d.classList.toggle('title-in', y > 44);
  }

  function siblingsToggle(el, sel) {
    var p = el.parentElement;
    if (!p) return;
    Array.prototype.forEach.call(p.children, function (c) { if (c.matches(sel)) c.classList.toggle('is-active', c === el); });
  }

  var SINGLE = '.segmented > *, .tabs > *, .btn-group > .btn, .chips.single > .chip, .tabbar > .tab, .tab-group > .tab, .side-item, .rail-item, ' +
    '.swatches > .swatch, .option-list > .option, .doc-nav a, .cal-grid > .cal-day:not(.is-muted), .toolbar .icon-btn.toggle, .menu-item.selectable';

  function overlayOf(el) { return el.closest('.sheet, .dialog, .menu, .action-sheet, .toast, .popover'); }
  function setOpen(target, open) {
    if (!target) return;
    target.hidden = !open;
    document.querySelectorAll('.scrim[data-for="' + target.id + '"]').forEach(function (s) { s.hidden = !open; });
  }

  document.addEventListener('click', function (e) {
    var t = e.target;
    var a = t.closest('a[href="#"], a[href=""]');
    if (a) e.preventDefault();
    var open = t.closest('[data-open]');
    if (open) { e.preventDefault(); var tg = document.getElementById(open.getAttribute('data-open')); setOpen(tg, tg ? tg.hidden : false); return; }
    var close = t.closest('[data-close]');
    if (close) { e.preventDefault(); setOpen(overlayOf(close) || document.getElementById(close.getAttribute('data-close')), false); return; }
    if (t.classList.contains('scrim') && t.getAttribute('data-for')) { setOpen(document.getElementById(t.getAttribute('data-for')), false); return; }
    var single = t.closest(SINGLE);
    if (single && !single.hasAttribute('data-static')) {
      var sel = single.matches('.side-item') ? '.side-item' : single.matches('.rail-item') ? '.rail-item' : single.matches('.cal-day') ? '.cal-day' : '*';
      siblingsToggle(single, sel);
      return;
    }
    var chip = t.closest('.chips:not(.single) > .chip');
    if (chip && !chip.hasAttribute('data-static')) chip.classList.toggle('is-active');
  });

  function syncRange(r) {
    var min = +r.min || 0, max = r.max === '' ? 100 : +r.max, v = +r.value;
    r.style.setProperty('--v', ((v - min) / (max - min || 1)) * 100 + '%');
  }
  document.addEventListener('input', function (e) { if (e.target.classList && e.target.classList.contains('range')) syncRange(e.target); });

  function audit() {
    var W = window.innerWidth, out = { url: location.pathname.split('/').slice(-2).join('/'), lang: d.getAttribute('data-lang'),
      width: W, overflowX: Math.max(0, d.scrollWidth - W), offenders: [], missingIcons: [] };
    function clipped(el) {
      for (var p = el.parentElement; p && p !== document.body; p = p.parentElement) {
        var cs = getComputedStyle(p);
        if (cs.overflowX !== 'visible' || cs.position === 'fixed') return true;
      }
      return false;
    }
    if (out.overflowX > 0) document.querySelectorAll('body *').forEach(function (el) {
      if (out.offenders.length >= 8 || getComputedStyle(el).position === 'fixed') return;
      var r = el.getBoundingClientRect();
      if (r.width && r.right > W + 1 && !clipped(el)) {
        out.offenders.push((el.tagName.toLowerCase() + '.' + String(el.className && el.className.baseVal != null ? el.className.baseVal : el.className).trim().split(/\s+/).join('.')) + ' right=' + Math.round(r.right));
      }
    });
    // 找不到越界元素时（多半是伪元素），逐层隐藏子元素，定位是谁撑宽了页面
    if (out.overflowX > 0 && !out.offenders.length) {
      var node = document.body, path = [];
      for (var depth = 0; depth < 12 && node; depth++) {
        var hit = null;
        for (var c = node.firstElementChild; c; c = c.nextElementSibling) {
          var old = c.style.display;
          c.style.display = 'none';
          var ok = d.scrollWidth <= W;
          c.style.display = old;
          if (ok) { hit = c; break; }
        }
        if (!hit) break;
        path.push(hit.tagName.toLowerCase() + (hit.id ? '#' + hit.id : '') + (typeof hit.className === 'string' && hit.className ? '.' + hit.className.trim().split(/\s+/).join('.') : ''));
        node = hit;
      }
      out.culprit = path.join(' > ');
    }
    var sprite = document.getElementById('ui-icon-sprite');
    document.querySelectorAll('use').forEach(function (u) {
      var h = (u.getAttribute('href') || u.getAttribute('xlink:href') || '').replace('#', '');
      if (h && (!sprite || !sprite.querySelector('[id="' + h + '"]')) && out.missingIcons.indexOf(h) < 0) out.missingIcons.push(h);
    });
    var s = document.createElement('script');
    s.type = 'application/json'; s.id = 'ui-audit'; s.textContent = JSON.stringify(out);
    document.body.appendChild(s);
  }

  function ready() {
    if (window.UIIcons) window.UIIcons.mount(d.getAttribute('data-lang'));
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    document.querySelectorAll('.range').forEach(syncRange);
    if (q.get('audit')) setTimeout(audit, 120);
    if (embedded) {
      var meta = {};
      document.querySelectorAll('meta[name^="ui:"]').forEach(function (m) { meta[m.name.slice(3)] = m.content; });
      post({ type: 'ui:ready', title: document.title, meta: meta, height: d.scrollHeight, dark: isDark(), lang: d.getAttribute('data-lang') });
      // ?sync=1：把滚动位置报给父页面（对比模式下两个预览同步滚动）
      if (q.get('sync')) {
        var ticking = false;
        window.addEventListener('scroll', function () {
          if (ticking) return; ticking = true;
          requestAnimationFrame(function () { ticking = false; post({ type: 'ui:scrolled', y: window.scrollY }); });
        }, { passive: true });
      }
      // ?autoheight=1：内容高度变化时通知父页面（嵌入说明页时 iframe 自适应高度）
      if (q.get('autoheight') && window.ResizeObserver) {
        new ResizeObserver(function () { post({ type: 'ui:height', height: d.scrollHeight }); }).observe(document.body);
      }
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready); else ready();

  window.UI = { set: apply };
})();
