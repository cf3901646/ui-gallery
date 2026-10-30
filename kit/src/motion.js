/* 动效与交互（配合 kit/motion.css）：玻璃高光、按压、标签栏最小化、sheet 分档拖动、水波纹 */
(function () {
  var d = document.documentElement;
  function apple() { return d.getAttribute('data-lang') !== 'google'; }
  var GLASS = '.glass, .tab-group, .tabbar, .toolbar.floating, .bar-group, .topbar .bar-btn, .fab, .btn.glass, .icon-btn.glass, .bar-btn.glass, .tabbar > .tab.search, .tabbar > .tab.prominent';
  var RIPPLE = '.btn, .icon-btn, a.row, button.row, label.row, .chip, .tab, .side-item, .menu-item, .segmented > *, .rail-item, .option, .bar-btn, .fab';

  /* ---- 玻璃高光跟随指针（Apple）---- */
  var lit = null;
  function unlight() { if (lit) { lit.classList.remove('ui-lit'); lit = null; } }
  document.addEventListener('pointermove', function (e) {
    if (!apple() || e.pointerType === 'touch') return;
    var el = e.target.closest && e.target.closest(GLASS);
    if (el && el.matches('.tabbar') && el.querySelector(':scope > .tab-group')) el = e.target.closest('.tab-group, .tab.search, .tab.prominent');
    if (lit && lit !== el) unlight();
    if (!el) return;
    var r = el.getBoundingClientRect();
    el.style.setProperty('--gx', ((e.clientX - r.left) / r.width * 100).toFixed(1) + '%');
    el.style.setProperty('--gy', ((e.clientY - r.top) / r.height * 100).toFixed(1) + '%');
    el.classList.add('ui-lit'); lit = el;
  }, { passive: true });
  document.addEventListener('pointerleave', unlight);

  /* ---- 按压：Apple 玻璃放大；Google 水波纹 ---- */
  var pressed = null;
  function release() { if (pressed) { pressed.classList.remove('ui-pressed'); pressed = null; } }
  document.addEventListener('pointerdown', function (e) {
    var t = e.target.closest && e.target;
    if (!t) return;
    if (apple()) {
      var g = t.closest(GLASS);
      if (g && !g.matches('.tabbar, .tab-group')) { pressed = g; g.classList.add('ui-pressed'); }
      if (e.pointerType === 'touch' && g) {
        var r0 = g.getBoundingClientRect();
        g.style.setProperty('--gx', ((e.clientX - r0.left) / r0.width * 100).toFixed(1) + '%');
        g.style.setProperty('--gy', ((e.clientY - r0.top) / r0.height * 100).toFixed(1) + '%');
        g.classList.add('ui-lit'); setTimeout(function () { g.classList.remove('ui-lit'); }, 450);
      }
      return;
    }
    var el = t.closest(RIPPLE);
    if (!el || el.disabled || el.closest('[data-no-ripple]')) return;
    var r = el.getBoundingClientRect(), size = Math.hypot(r.width, r.height) * 2;
    var host = document.createElement('span'), dot = document.createElement('span');
    host.className = 'ui-ripple-host'; dot.className = 'ui-ripple';
    dot.style.cssText = 'width:' + size + 'px;height:' + size + 'px;left:' + (e.clientX - r.left - size / 2) + 'px;top:' + (e.clientY - r.top - size / 2) + 'px';
    host.appendChild(dot); el.appendChild(host);
    setTimeout(function () { host.remove(); }, 700);
  });
  document.addEventListener('pointerup', release);
  document.addEventListener('pointercancel', release);

  /* ---- 标签栏滚动最小化（.tabbar[data-minimize]）---- */
  var lastY = window.scrollY || 0, raf = 0;
  window.addEventListener('scroll', function () {
    if (raf) return;
    raf = requestAnimationFrame(function () {
      raf = 0;
      var y = window.scrollY || 0, dy = y - lastY;
      if (Math.abs(dy) < 6 && y > 24) return;
      document.querySelectorAll('.tabbar[data-minimize]').forEach(function (bar) {
        if (y < 24 || dy < 0) bar.classList.remove('is-min'); else if (y > 80) bar.classList.add('is-min');
      });
      lastY = y;
    });
  }, { passive: true });
  document.addEventListener('click', function (e) {   // 点最小化后的胶囊：展开
    var bar = e.target.closest && e.target.closest('.tabbar.is-min');
    if (bar) { bar.classList.remove('is-min'); }
  }, true);

  /* ---- sheet 分档拖动（.sheet[data-detents="medium large"]，可选 small / 小数比例；data-initial 指定初始档）---- */
  function detents(sh) {
    return (sh.getAttribute('data-detents') || 'medium large').split(/\s+/).map(function (n) {
      return n === 'small' ? 0.32 : n === 'medium' ? 0.52 : n === 'large' ? 0.94 : parseFloat(n);
    }).filter(function (x) { return x > 0 && x <= 1; }).sort(function (a, b) { return a - b; });
  }
  function avail() { return window.innerHeight; }
  function setDetent(sh, f) {
    var top = parseFloat(getComputedStyle(d).getPropertyValue('--safe-top')) || 0;
    var h = Math.min(Math.round(f * avail()), avail() - top - 8);
    sh.style.setProperty('--sheet-h', h + 'px');
    sh.classList.toggle('is-large', f >= 0.9);
    sh.setAttribute('data-detent', String(f));
  }
  function initSheet(sh) {
    if (sh._ui) return; sh._ui = true;
    var ds = detents(sh), init = parseFloat(sh.getAttribute('data-initial')) || ds[0];
    setDetent(sh, init);
    new MutationObserver(function () { if (!sh.hidden) setDetent(sh, parseFloat(sh.getAttribute('data-initial')) || detents(sh)[0]); })
      .observe(sh, { attributes: true, attributeFilter: ['hidden'] });
  }
  var drag = null;
  document.addEventListener('pointerdown', function (e) {
    var handle = e.target.closest && e.target.closest('.sheet[data-detents] :is(.sheet-grabber, .sheet-head)');
    if (!handle || e.target.closest('button, a, input')) return;
    var sh = handle.closest('.sheet');
    drag = { sh: sh, y0: e.clientY, h0: sh.getBoundingClientRect().height, t: performance.now(), y: e.clientY, v: 0 };
    sh.classList.add('is-dragging');
    try { handle.setPointerCapture(e.pointerId); } catch (err) { /* 忽略 */ }
    e.preventDefault();
  });
  document.addEventListener('pointermove', function (e) {
    if (!drag) return;
    var now = performance.now(), dt = Math.max(1, now - drag.t);
    drag.v = (drag.y - e.clientY) / dt; drag.y = e.clientY; drag.t = now;
    var h = Math.max(60, Math.min(avail() - 8, drag.h0 + (drag.y0 - e.clientY)));
    drag.sh.style.setProperty('--sheet-h', h + 'px');
    drag.sh.classList.toggle('is-large', h / avail() >= 0.9);
  });
  function endDrag() {
    if (!drag) return;
    var sh = drag.sh, h = sh.getBoundingClientRect().height, proj = (h + drag.v * 180) / avail();
    sh.classList.remove('is-dragging');
    var ds = detents(sh), best = ds[0];
    ds.forEach(function (f) { if (Math.abs(f - proj) < Math.abs(best - proj)) best = f; });
    var scrim = sh.id && document.querySelector('.scrim[data-for="' + sh.id + '"]');
    if (proj < ds[0] * 0.55 && scrim) { sh.hidden = true; scrim.hidden = true; }
    else setDetent(sh, best);
    drag = null;
  }
  document.addEventListener('pointerup', endDrag);
  document.addEventListener('pointercancel', endDrag);

  function ready() { document.querySelectorAll('.sheet[data-detents]').forEach(initSheet); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready); else ready();
  window.addEventListener('resize', function () {
    document.querySelectorAll('.sheet[data-detents]').forEach(function (sh) { if (!sh.classList.contains('is-dragging')) setDetent(sh, parseFloat(sh.getAttribute('data-detent')) || detents(sh)[0]); });
  });
})();
