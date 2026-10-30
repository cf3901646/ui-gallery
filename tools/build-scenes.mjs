// 生成程序化矢量插画：kit/scenes/<名字>.svg + kit/scenes.css + tools/scenes-preview.html
// 用法（在 ui-gallery 目录下）：node tools/build-scenes.mjs
// 无依赖；每个场景用固定种子的伪随机数，输出可复现。不引用任何外部资源。
// 画布统一 1600×1200（4:3），preserveAspectRatio="xMidYMid slice"，放进任意比例的 .art 都会裁切铺满。
// 产品图（group = product）只画产品和阴影、背景透明，影棚底色由 scenes.css 提供（明暗两套）。
import { mkdirSync, writeFileSync, readdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'kit', 'scenes');
const W = 1600, H = 1200;

// ---------- 基础工具 ----------
const rng = (seed) => { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
let R = rng(1);
const rand = (a = 0, b = 1) => a + (b - a) * R();
const pick = (arr) => arr[Math.floor(R() * arr.length)];
const n = (v) => Math.round(v);
const d1 = (v) => Math.round(v * 10) / 10;
const pt = (p) => `${n(p[0])} ${n(p[1])}`;
const lerp = (a, b, t) => a + (b - a) * t;

const toRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const toHex = (c) => '#' + c.map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
const mix = (a, b, t) => { const A = toRgb(a), B = toRgb(b); return toHex(A.map((v, i) => v + (B[i] - v) * t)); };
const tint = (c, t) => (t > 0 ? mix(c, '#ffffff', t) : mix(c, '#000000', -t));

// 渐变：s = [[offset, color, opacity?], ...]；lin/rad 用对象包围盒坐标，linU/radU 用画布坐标
const stops = (s) => s.map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}"${a != null && a !== 1 ? ` stop-opacity="${a}"` : ''}/>`).join('');
const lin = (id, s, v = [0, 0, 0, 1]) => { const [x1, y1, x2, y2] = v; return `<linearGradient id="${id}"${x1 ? ` x1="${x1}"` : ''}${y1 ? ` y1="${y1}"` : ''}${x2 !== 1 ? ` x2="${x2}"` : ''}${y2 ? ` y2="${y2}"` : ''}>${stops(s)}</linearGradient>`; };
const rad = (id, s, cx = .5, cy = .5, r = .5, fx, fy) => `<radialGradient id="${id}"${cx !== .5 ? ` cx="${cx}"` : ''}${cy !== .5 ? ` cy="${cy}"` : ''}${r !== .5 ? ` r="${r}"` : ''}${fx != null ? ` fx="${fx}" fy="${fy}"` : ''}>${stops(s)}</radialGradient>`;
const linU = (id, s, x1, y1, x2, y2) => `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${n(x1)}" y1="${n(y1)}" x2="${n(x2)}" y2="${n(y2)}">${stops(s)}</linearGradient>`;
const radU = (id, s, cx, cy, r, fx, fy) => `<radialGradient id="${id}" gradientUnits="userSpaceOnUse" cx="${n(cx)}" cy="${n(cy)}" r="${n(r)}"${fx != null ? ` fx="${n(fx)}" fy="${n(fy)}"` : ''}>${stops(s)}</radialGradient>`;
// 滤镜区域用画布坐标：描边画的圆点包围盒只算中心点，按对象包围盒算会把模糊裁出硬边
const blurF = (id, sd) => `<filter id="${id}" filterUnits="userSpaceOnUse" x="-200" y="-200" width="2000" height="1600"><feGaussianBlur stdDeviation="${sd}"/></filter>`;
// 颗粒：叠加混合的灰度噪声，克制使用
const grainF = (o = .14, f = .9) => `<filter id="gr" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="${f}" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="1 0 0 0 0 1 0 0 0 0 1 0 0 0 0 0 0 0 0 ${o}"/></filter>`;
const grainE = `<rect width="${W}" height="${H}" filter="url(#gr)" style="mix-blend-mode:overlay"/>`;

// 路径（多边形用相对坐标编码，省体积）
const nums = (arr) => arr.map((v, i) => (i && v >= 0 ? ' ' : '') + v).join('');
const poly = (pts, close = true) => {
  const a = pts.map(([x, y]) => [n(x), n(y)]), r = [];
  for (let i = 1; i < a.length; i++) r.push(a[i][0] - a[i - 1][0], a[i][1] - a[i - 1][1]);
  return `M${a[0][0]} ${a[0][1]}l${nums(r)}${close ? 'z' : ''}`;
};
// 远处树线：一条连续的锯齿剪影
const treeline = (x0, x1, base, hf, wmin = 7, wmax = 15) => {
  const p = [[x0, base + 12]];
  for (let x = x0; x < x1;) { const w = rand(wmin, wmax), h = hf(x); p.push([x, base - h * .22], [x + w * .5, base - h], [x + w, base - h * .22]); x += w * rand(.75, 1); }
  p.push([x1, base + 12]);
  return poly(p);
};
// 插值：给定 x，求折线 pts 上的 y
const yAt = (pts, x) => { for (let i = 0; i < pts.length - 1; i++) if (x >= pts[i][0] && x <= pts[i + 1][0]) return lerp(pts[i][1], pts[i + 1][1], (x - pts[i][0]) / (pts[i + 1][0] - pts[i][0] || 1)); return pts[pts.length - 1][1]; };
// 平滑曲线：经过相邻点中点的二次曲线，相对坐标输出
const smooth = (pts, close = false) => {
  const a = pts.map(([x, y]) => [n(x), n(y)]);
  let [cx, cy] = a[0], d = `M${cx} ${cy}`;
  for (let i = 1; i < a.length - 1; i++) {
    const mx = n((a[i][0] + a[i + 1][0]) / 2), my = n((a[i][1] + a[i + 1][1]) / 2);
    d += `q${nums([a[i][0] - cx, a[i][1] - cy, mx - cx, my - cy])}`; cx = mx; cy = my;
  }
  const [lx, ly] = a[a.length - 1];
  return d + `l${nums([lx - cx, ly - cy])}` + (close ? 'z' : '');
};
const area = (pts, bottom = H, sm = false) => (sm ? smooth(pts) : poly(pts, false)) + `L${n(pts[pts.length - 1][0])} ${bottom}L${n(pts[0][0])} ${bottom}Z`;
// 关键点之间做中点位移，得到自然的山脊
const jag = (keys, a = .15, it = 3, rough = .55) => {
  let p = keys.map((k) => [k[0], k[1]]);
  for (let k = 0; k < it; k++) {
    const q = [];
    for (let i = 0; i < p.length - 1; i++) {
      const [x0, y0] = p[i], [x1, y1] = p[i + 1], L = Math.hypot(x1 - x0, y1 - y0);
      q.push(p[i], [(x0 + x1) / 2 + rand(-.06, .06) * L, (y0 + y1) / 2 + rand(-a, a) * L]);
    }
    q.push(p[p.length - 1]); p = q; a *= rough;
  }
  return p;
};
// 平滑起伏的地平线：多个正弦叠加
const wave = (y, amp, x0 = -40, x1 = W + 40, step = 80, ph = rand(0, 9)) => {
  const p = [];
  for (let x = x0; x <= x1 + 1; x += step) p.push([x, y + amp * (Math.sin(x / 260 + ph) * .6 + Math.sin(x / 97 + ph * 2) * .25 + rand(-.15, .15))]);
  return p;
};
// 点阵：同色同大小的圆点/方块合成一条描边路径（零长度线段 + 线帽），体积约为逐个 <circle> 的 1/5
// seg 是每个点画的线段（'h0' 圆点；'v7' 竖条，配合描边宽度画窗户），[sx, sy] 是这段线段的位移
const dotsD = (pts, seg = 'h0', sx = 0, sy = 0) => {
  let d = '', px = 0, py = 0;
  pts.forEach(([x, y], i) => { x = n(x); y = n(y); d += i ? `m${x - px} ${y - py}${seg}` : `M${x} ${y}${seg}`; px = x + sx; py = y + sy; });
  return d;
};
const dots = (pts, color, r, extra = '') => pts.length ? `<path d="${dotsD(pts)}" fill="none" stroke="${color}" stroke-width="${d1(r * 2)}" stroke-linecap="round"${extra}/>` : '';
// 按颜色和（量化后的）半径分组的圆
const blobs = (items, steps = 6, extra = '') => {
  if (!items.length) return '';
  const rs = items.map((i) => i[2]), lo = Math.min(...rs), hi = Math.max(...rs);
  const q = (r) => (hi - lo < 1 ? lo : lo * (hi / lo) ** (Math.round((Math.log(r / lo) / Math.log(hi / lo)) * (steps - 1)) / (steps - 1)));
  const g = new Map();
  for (const [x, y, r, c] of items) { const k = c + '|' + d1(q(r)); if (!g.has(k)) g.set(k, []); g.get(k).push([x, y]); }
  let out = '';
  for (const [k, pts] of g) { const [c, r] = k.split('|'); out += `<path d="${dotsD(pts)}" stroke="${c}" stroke-width="${d1(r * 2)}"/>`; }
  return `<g fill="none" stroke-linecap="round"${extra}>${out}</g>`;
};
const fx = (v) => (Math.abs(v) >= 8 ? n(v) : d1(v));
const circD = (cx, cy, r) => `M${fx(cx - r)} ${fx(cy)}a${fx(r)} ${fx(r)} 0 1 0 ${fx(2 * r)} 0a${fx(r)} ${fx(r)} 0 1 0 ${fx(-2 * r)} 0`;
const ellD = (cx, cy, rx, ry) => `M${fx(cx - rx)} ${fx(cy)}a${fx(rx)} ${fx(ry)} 0 1 0 ${fx(2 * rx)} 0a${fx(rx)} ${fx(ry)} 0 1 0 ${fx(-2 * rx)} 0`;
const rectD = (x, y, w, h) => `M${n(x)} ${n(y)}h${n(w)}v${n(h)}h${-n(w)}z`;
const rr = (x, y, w, h, r, a = '') => `<rect x="${n(x)}" y="${n(y)}" width="${n(w)}" height="${n(h)}"${r ? ` rx="${n(r)}"` : ''}${a}/>`;
const P = (d, a) => `<path d="${d}" ${a}/>`;
// 叶片（两段二次曲线），用于竹叶、柳叶、草叶
const leafD = (x, y, ang, len, wid = .14) => {
  const c = Math.cos(ang), s = Math.sin(ang), w = len * wid;
  const tx = n(c * len), ty = n(s * len), m1x = n(c * len * .42 - s * w), m1y = n(s * len * .42 + c * w), m2x = n(c * len * .42 + s * w), m2y = n(s * len * .42 - c * w);
  return `M${n(x)} ${n(y)}q${nums([m1x, m1y, tx, ty])}q${nums([m2x - tx, m2y - ty, -tx, -ty])}z`;
};
// 针叶树剪影：分层下垂的轮廓
const pineD = (x, y, h, w = h * .4, tiers = 5) => {
  const top = y - h, body = h * .9, side = (sg) => {
    const r = [];
    for (let i = 1; i <= tiers; i++) {
      const t = i / tiers, yi = top + body * t, wi = (w / 2) * (.28 + .72 * t) * rand(.85, 1.12);
      r.push([x + sg * wi, yi]);
      if (i < tiers) r.push([x + sg * wi * .36, yi - (body / tiers) * .3]);
    }
    return r;
  };
  const tw = Math.max(1.5, w * .05);
  return poly([[x, top], ...side(1), [x + tw, top + body], [x + tw, y], [x - tw, y], [x - tw, top + body], ...side(-1).reverse()]);
};
// 云：同向圆弧的并集 + 平底
const cloudD = (x, y, w, h) => {
  let d = ''; const k = Math.max(3, Math.round((w / h) * 1.5));
  for (let i = 0; i < k; i++) {
    const t = (i + .5) / k, r = h * (.32 + .5 * Math.sin(Math.PI * t)) * rand(.85, 1.15);
    d += circD(x + w * t, y - r * .62, r);
  }
  return d + `M${n(x)} ${n(y)}h${n(w)}v${n(-h * .28)}h${-n(w)}z`;
};
const wrap = (defs, body) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice">${defs ? `<defs>${defs}</defs>` : ''}${body}</svg>`;

// ---------- 场景注册 ----------
const SCENES = [];
const scene = (name, group, color, fn, opt = {}) => SCENES.push({ name, group, color, fn, ...opt });

// =====================================================================
// 风景
// =====================================================================
scene('mountain', 'landscape', '#7f9fbf', () => {
  const HZ = 770;
  const far2 = area(jag([[-40, 600], [260, 520], [520, 560], [820, 470], [1180, 540], [1420, 470], [1640, 520]], .1, 3), HZ);
  const far = area(jag([[-40, 640], [200, 560], [420, 600], [640, 520], [900, 600], [1240, 520], [1640, 600]], .12, 3), HZ);
  const ridge = jag([[-40, 690], [170, 600], [380, 500], [560, 380], [700, 262], [772, 196], [850, 262], [960, 330], [1062, 286], [1170, 352], [1310, 440], [1470, 520], [1640, 590]], .1, 3);
  const body = area(ridge, HZ + 2);
  // 雪线：山脊下方一条锯齿线
  const sn = ridge.filter((p) => p[1] < 455 && p[0] > 430 && p[0] < 1330);
  const snowLow = [];
  for (let x = sn[sn.length - 1][0]; x > sn[0][0]; x -= rand(18, 44)) {
    const ry = yAt(ridge, x), y = ry + (470 - ry) * (.5 + .3 * Math.sin(x / 41) + rand(-.08, .08)) + 14;
    if (R() < .3) snowLow.push([x + 7, y], [x + rand(-6, 6), y + rand(40, 120) * (470 - ry) / 270], [x - 7, y]); else snowLow.push([x, y]);
  }
  const snow = poly([...sn, ...snowLow]);
  const sh1 = poly([[772, 196], [790, 300], [764, 390], [818, 488], [790, 590], [846, 690], [830, HZ + 4], [-40, HZ + 4], [-40, 690]]);
  const sh2 = poly([[1062, 286], [1046, 390], [1082, 486], [1036, 600], [1060, HZ + 4], [944, HZ + 4], [932, 560], [962, 420], [960, 330]]);
  const sh3 = poly([[1640, 590], [1470, 520], [1450, 600], [1500, HZ], [1640, HZ]]);
  const spurs = [[[772, 196], [700, 330], [690, 420]], [[1062, 286], [1110, 380], [1120, 470]], [[772, 196], [870, 330], [900, 440]]].map((s) => smooth(s)).join('');
  // 树线
  const trees = treeline(-20, 1630, HZ + 2, (x) => 20 + 16 * (Math.sin(x / 140) + 1) + rand(0, 14));
  let big = '';
  for (let x = -30; x < 330; x += rand(28, 50)) big += pineD(x, HZ + 70 - x * .08, rand(170, 330) * (1 - x / 900), undefined, 7);
  for (let x = 1330; x < 1650; x += rand(28, 50)) big += pineD(x, HZ + 60 + (x - 1330) * .08, rand(160, 300) * (.65 + (x - 1330) / 900), undefined, 7);
  const shore = smooth([[-40, HZ + 40], [120, HZ + 54], [300, HZ + 46], [380, HZ + 12], [-40, HZ]], true) + smooth([[1300, HZ + 4], [1360, HZ + 44], [1500, HZ + 64], [1640, HZ + 60], [1640, HZ]], true);
  let rip = '';
  for (let i = 0; i < 50; i++) { const t = rand() ** 1.5, y = HZ + 10 + t * (H - HZ - 20), w = rand(20, 150) * (1 + t * 2.5); rip += rectD(rand(-50, W), y, w, 1.5 + t * 2.5); }
  const defs = [
    lin('sk', [[0, '#5f92c8'], [.5, '#a9cbe6'], [.85, '#e9e6dd'], [1, '#f4e4d0']]),
    radU('sg', [[0, '#fff6df', .95], [.4, '#fff1d6', .35], [1, '#fff1d6', 0]], 1180, 260, 620),
    lin('f2', [[0, '#b7c9dc'], [1, '#dbe5ec']]), lin('f1', [[0, '#93abc4'], [1, '#cddae4']]),
    lin('mb', [[0, '#8199b4'], [.5, '#5b7491'], [1, '#475d76']]), lin('sn', [[0, '#ffffff'], [1, '#e6eef6']]),
    lin('hz', [[0, '#e3ebf0', 0], [.75, '#e3ebf0', .8], [1, '#dde6ec', .95]]),
    lin('lk', [[0, '#b9cfdf'], [.18, '#88a7c0'], [1, '#2a4359']]), lin('lt', [[0, '#14263a', 0], [1, '#0e1c2c', .55]]),
    `<path id="mb0" d="${body}"/><clipPath id="mc"><use href="#mb0"/></clipPath><clipPath id="lc"><rect y="${HZ}" width="${W}" height="${H - HZ}"/></clipPath>`,
    blurF('bl', 14), blurF('rb', '1.5 4'), grainF(),
    `<g id="M"><path d="${far2}" fill="url(#f2)"/><path d="${far}" fill="url(#f1)"/><use href="#mb0" fill="url(#mb)"/><g clip-path="url(#mc)"><path d="${snow}" fill="url(#sn)"/><path d="${spurs}" fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="5"/><path d="${sh1 + sh2 + sh3}" fill="#1b3150" fill-opacity=".36"/></g><rect y="560" width="${W}" height="${HZ - 556}" fill="url(#hz)"/><path d="${trees}" fill="#29463f"/></g>`,
  ].join('');
  const b = [
    rr(0, 0, W, HZ + 2, 0, ' fill="url(#sk)"'), `<rect width="${W}" height="${HZ}" fill="url(#sg)"/>`,
    `<g filter="url(#bl)" fill="#fff" opacity=".55">${ellD(520, 420, 260, 22)}${ellD(1240, 380, 300, 18)}</g>`,
    `<use href="#M"/>`,
    rr(0, HZ, W, H - HZ, 0, ' fill="url(#lk)"'),
    `<g clip-path="url(#lc)"><g filter="url(#rb)" opacity=".5"><use href="#M" transform="matrix(1 0 0 -1 0 ${2 * HZ})"/></g></g>`,
    rr(0, HZ, W, H - HZ, 0, ' fill="url(#lt)"'),
    P(rip, 'fill="#fff" fill-opacity=".22"'),
    P(shore, 'fill="#1f332f"'), P(big, 'fill="#172a27"'),
    grainE,
  ].join('');
  return [defs, b];
});

scene('sea', 'landscape', '#c9727f', () => {
  const HZ = 690;
  let cl = '';
  for (let i = 0; i < 9; i++) cl += ellD(rand(0, W), rand(360, 600), rand(160, 420), rand(6, 15));
  let refl = '', refl2 = '';
  for (let i = 0; i < 70; i++) {
    const t = rand() ** 1.3, y = HZ + 4 + t * 430, w = (24 + 300 * t) * rand(.25, 1), x = 800 + rand(-1, 1) * (16 + 140 * t) - w / 2;
    if (i % 3) refl += rectD(x, y, w, 2 + 5 * t); else refl2 += rectD(x, y, w, 2 + 5 * t);
  }
  let wv = '';
  for (let i = 0; i < 40; i++) { const t = rand() ** 1.2, y = HZ + 30 + t * 380; wv += rectD(rand(-100, W), y, rand(60, 260) * (1 + t), 1.5 + t * 2); }
  const sand = smooth([[-40, 1000], [300, 985], [700, 1030], [1100, 1080], [1400, 1110], [1640, 1120]]) + `L1640 1200L-40 1200Z`;
  const wet = smooth([[-40, 975], [320, 962], [720, 1006], [1120, 1058], [1420, 1090], [1640, 1100]]) + `L1640 1200L-40 1200Z`;
  const foam = smooth([[-40, 978], [200, 966], [420, 976], [700, 1004], [960, 1036], [1200, 1066], [1640, 1102]]);
  const defs = [
    lin('sk', [[0, '#222658'], [.35, '#5e4384'], [.62, '#cf6a88'], [.84, '#f59f5f'], [1, '#ffd49a']]),
    radU('sg', [[0, '#fff2c6', 1], [.1, '#ffd894', .85], [.38, '#ff9d6c', .35], [1, '#ff9d6c', 0]], 800, 660, 760),
    lin('cl', [[0, '#9a4f80', .85], [1, '#ffb27a', .9]]),
    lin('se', [[0, '#f3a56c'], [.1, '#cf7c7f'], [.42, '#6a4a7f'], [1, '#202350']]),
    lin('sa', [[0, '#c7866c'], [1, '#5e3a4e']]), lin('we', [[0, '#e9a17c', .9], [1, '#8a5560', .2]]),
    blurF('b2', 3), grainF(),
  ].join('');
  const b = [
    rr(0, 0, W, HZ + 2, 0, ' fill="url(#sk)"'), `<rect width="${W}" height="${H}" fill="url(#sg)"/>`,
    `<circle cx="800" cy="664" r="92" fill="#fff4d2"/>`,
    `<path d="${cl}" fill="url(#cl)" filter="url(#b2)"/>`,
    P(smooth([[1150, HZ + 2], [1260, HZ - 26], [1380, HZ - 44], [1500, HZ - 36], [1640, HZ - 50], [1640, HZ + 2]], true), 'fill="#4d3354"'),
    P(smooth([[-40, HZ + 2], [-40, HZ - 22], [80, HZ - 30], [200, HZ - 12], [260, HZ + 2]], true), 'fill="#523758"'),
    rr(0, HZ, W, H - HZ, 0, ' fill="url(#se)"'),
    P(wv, 'fill="#1a1b44" fill-opacity=".22"'),
    P(refl, 'fill="#ffe3a6" fill-opacity=".5"'), P(refl2, 'fill="#fff1cc" fill-opacity=".85"'),
    // 帆船与海鸟
    P('M560 686l40-2-6 6h-30z', 'fill="#3a2648"'), P('M582 684l0-62 22 58z', 'fill="#3a2648"'),
    P('M980 470q14-12 28 0q14-12 28 0M1080 430q10-9 20 0q10-9 20 0M930 520q8-7 16 0q8-7 16 0', 'fill="none" stroke="#3d2a4a" stroke-width="4" stroke-linecap="round"'),
    P(wet, 'fill="url(#we)"'), P(sand, 'fill="url(#sa)"'),
    P(foam, 'fill="none" stroke="#fff" stroke-opacity=".75" stroke-width="5"'),
    grainE,
  ].join('');
  return [defs, b];
});

scene('forest', 'landscape', '#9fb89a', () => {
  // 竹林晨雾：远中近四层竹子，层间夹雾
  // leafLen：叶长（像素）；leaves：每个竹节长叶簇的概率；leafTop：只在这个高度以上长叶
  // 竹节用虚线描边画（每根竹子一条线），比逐个矩形省体积
  const cluster = (bx, by, sg, k, len) => {
    let s = '';
    for (let j = 0; j < k; j++) { bx += sg * len * .2; by += len * .07; s += leafD(bx, by, sg > 0 ? rand(.3, 1.2) : Math.PI - rand(.3, 1.2), len * rand(.7, 1.2), .12); }
    return s;
  };
  const layer = (count, wmin, wmax, base, col, nodeCol, gap, leafCol, leaves, leafLen, x0 = -40, x1 = W + 40, leafTop = base * .45) => {
    let st = '', nd = '', lf = '';
    for (let i = 0; i < count; i++) {
      const x = lerp(x0, x1, (i + rand(.1, .9)) / count), w = rand(wmin, wmax), lean = rand(-.025, .025) * base;
      st += poly([[x, base], [x + w, base], [x + w * .9 + lean, -20], [x + w * .1 + lean, -20]]);
      if (nodeCol) nd += `<path d="M${n(x + w / 2)} ${base}l${n(lean)} ${-base - 20}" stroke-width="${n(w + 2)}" stroke-dashoffset="${n(rand(0, gap))}"/>`;
      if (leaves) for (let y = leafTop * rand(.6, 1); y > -20; y -= rand(1.4, 2.6) * leafLen) if (R() < leaves) {
        const sg = R() < .5 ? -1 : 1, xx = x + lean * (1 - y / base);
        lf += cluster(xx + (sg > 0 ? w : 0), y, sg, Math.round(rand(3, 6)), leafLen);
      }
    }
    return P(st, `fill="${col}"`) + (nd ? `<g fill="none" stroke="${nodeCol}" stroke-dasharray="${Math.max(2, n(wmin * .12))} ${gap}">${nd}</g>` : '') + (lf ? P(lf, `fill="${leafCol}"`) : '');
  };
  let canopy = '';
  for (let i = 0; i < 18; i++) canopy += cluster(rand(-40, W), rand(-30, 240), R() < .5 ? -1 : 1, Math.round(rand(3, 5)), rand(26, 40));
  let rays = '';
  for (let i = 0; i < 6; i++) { const x = 900 + i * 150 + rand(-40, 40), w = rand(40, 110); rays += poly([[x, -20], [x + w, -20], [x - 900 + w * 3, H + 40], [x - 900, H + 40]]); }
  const defs = [
    lin('bg', [[0, '#f3f6ee'], [.55, '#dde7d8'], [1, '#bfd0b8']]),
    radU('sg', [[0, '#fffbe6', .95], [1, '#fffbe6', 0]], 1260, 80, 1000),
    lin('ry', [[0, '#fffdf0', .5], [1, '#fffdf0', 0]]),
    lin('ms', [[0, '#f4f7f0', 0], [.55, '#f1f5ee', .55], [1, '#eef3ea', .9]]),
    lin('gd', [[0, '#8fa982'], [1, '#55704c']]), grainF(),
    lin('s2', [[0, '#8fb886'], [.35, '#77a46f'], [1, '#5b8a55']], [0, 0, 1, 0]),
    lin('s3', [[0, '#5f9058'], [.3, '#4a7c45'], [1, '#2f5a30']], [0, 0, 1, 0]),
  ].join('');
  const b = [
    rr(0, 0, W, H, 0, ' fill="url(#bg)"'), rr(0, 0, W, H, 0, ' fill="url(#sg)"'),
    P(canopy, 'fill="#cfdcc9"'),
    layer(44, 6, 12, 860, '#c9d7c4', null, 0, '', 0, 0),
    rr(0, 300, W, 600, 0, ' fill="url(#ms)"'),
    layer(26, 12, 22, 960, '#a6bf9f', '#bdd0b7', 150, '#a3bc9d', .15, 36),
    rr(0, 380, W, 620, 0, ' fill="url(#ms)" opacity=".8"'),
    P(smooth([[-40, 980], [300, 950], [700, 990], [1100, 960], [1640, 1000], [1640, 1200], [-40, 1200]], true), 'fill="url(#gd)"'),
    P('M700 1200C760 1120 900 1090 860 1040S760 990 800 968L812 968C790 990 900 1010 930 1050S860 1140 980 1200Z', 'fill="#d3c8aa" fill-opacity=".75"'),
    layer(12, 24, 38, 1080, 'url(#s2)', '#a3c49a', 200, '#6b9b61', .4, 58),
    P(rays, 'fill="url(#ry)"'),
    layer(3, 52, 74, 1240, 'url(#s3)', '#77a46c', 300, '#3f7a39', .7, 92, -60, 380, 620),
    layer(2, 52, 70, 1240, 'url(#s3)', '#77a46c', 300, '#3c7436', .7, 92, 1300, 1640, 620),
    grainE,
  ].join('');
  return [defs, b];
});

// 城市楼群：返回 [楼体路径, 窗灯路径]
const skyline = (x0, x1, base, hmin, hmax, wmin, wmax, litP, gap = [2, 16], winW = 4, winH = 6) => {
  let b = ''; const w = [];
  for (let x = x0; x < x1;) {
    const bw = rand(wmin, wmax), bh = rand(hmin, hmax), top = base - bh, k = R();
    if (k < .55) b += rectD(x, top, bw, bh + 4);
    else if (k < .75) b += rectD(x, top + 30, bw, bh - 26) + rectD(x + bw * .2, top, bw * .6, 34);
    else if (k < .88) b += poly([[x, base + 4], [x, top + 26], [x + bw, top], [x + bw, base + 4]]);
    else b += rectD(x, top, bw, bh + 4) + rectD(x + bw / 2 - 2, top - bh * .18, 4, bh * .18);
    if (litP) for (let yy = top + 34; yy < base - 10; yy += 14) for (let xx = x + 6; xx < x + bw - 8; xx += 10) if (R() < litP) w.push([xx + winW / 2, yy]);
    x += bw + rand(gap[0], gap[1]);
  }
  return [b, w];
};
// 窗灯：竖向短线 + 描边宽度 = 窗宽
const winP = (pts, color, ww = 4, wh = 6, extra = '') => pts.length ? `<path d="${dotsD(pts, 'v' + wh, 0, wh)}" fill="none" stroke="${color}" stroke-width="${ww}"${extra}/>` : '';

scene('city', 'landscape', '#c9708a', () => {
  const HZ = 820;
  const [far] = skyline(-30, W + 30, HZ, 50, 190, 34, 90, 0, [-10, 4]);
  const [mid, win] = skyline(-30, W + 30, HZ, 110, 330, 40, 100, .14, [6, 40]);
  // 陆家嘴地标：东方明珠、上海中心、环球金融中心、金茂
  const pearl = poly([[372, HZ], [392, HZ], [424, 612], [414, 612]]) + poly([[468, HZ], [488, HZ], [446, 612], [436, 612]]) + rectD(424, 300, 12, HZ - 300) +
    rectD(414, 412, 6, 176) + rectD(440, 412, 6, 176) + poly([[427, 302], [433, 302], [431, 186], [429, 186]]);
  const balls = circD(430, 588, 62) + circD(430, 410, 38) + circD(430, 300, 15) + circD(430, 760, 22);
  const sht = 'M830 820C838 560 852 330 866 168L936 140C944 330 960 560 972 820Z';
  const swfc = 'M1018 820L1058 212L1102 198L1144 820Z';
  const jm = (() => { const cx = 1214, lv = [[HZ, 37], [640, 34], [530, 30], [445, 26], [380, 22], [330, 17], [292, 12]]; const r = [];
    lv.forEach(([y, hw], i) => { if (i) r.push([cx + lv[i - 1][1] - 2, y + 8]); r.push([cx + hw, y]); r.push([cx + hw, lv[i + 1] ? lv[i + 1][0] + 8 : y - 18]); });
    r.push([cx + 4, 262], [cx + 1.5, 196]);
    return poly([...r, ...r.slice().reverse().map(([x, y]) => [2 * cx - x, y])]); })();
  let streak = '';
  for (let i = 0; i < 60; i++) { const x = rand(0, W), t = rand() ** 1.4; streak += rectD(x, HZ + 8 + t * 300, rand(6, 30) * (1 + t), 2 + t * 2); }
  let sun = '';
  for (let i = 0; i < 22; i++) { const t = rand() ** 1.3; sun += rectD(300 + rand(-1, 1) * (30 + 120 * t) - 40, HZ + 6 + t * 330, rand(30, 160) * (.4 + t), 2 + 3 * t); }
  let rail = '';
  for (let x = -10; x < W + 10; x += 38) rail += rectD(x, 1094 + x * .02, 5, 40);
  const defs = [
    linU('sk', [[0, '#1d285a'], [.36, '#584d8d'], [.66, '#d27189'], [.86, '#f6a46a'], [1, '#ffd6a1']], 0, 0, 0, HZ),
    radU('sg', [[0, '#ffe2ae', .95], [.35, '#ffb58a', .45], [1, '#ffb58a', 0]], 300, 790, 760),
    lin('fa', [[0, '#9b84ae'], [1, '#c99aac']]), lin('mi', [[0, '#4d4477'], [1, '#5f4f80']]),
    lin('st', [[0, '#77689d'], [.4, '#3f3a6c'], [1, '#2a2650']], [0, 0, 1, 0]),
    rad('pp', [[0, '#f0a8b3'], [.5, '#9a5f8c'], [1, '#3b3263']], .32, .3, .75),
    lin('rv', [[0, '#e49c86'], [.14, '#a9739a'], [.5, '#433d70'], [1, '#191b3c']]),
    lin('rt', [[0, '#191b3c', 0], [1, '#11122c', .6]]),
    `<clipPath id="wc"><rect y="${HZ}" width="${W}" height="${H - HZ}"/></clipPath>`, blurF('rb', '2 7'), grainF(),
    `<g id="C"><path d="${far}" fill="url(#fa)"/><path d="${mid}" fill="url(#mi)"/>${winP(win, '#ffd690', 4, 6, ' stroke-opacity=".8"')}` +
    `<path d="${sht}" fill="url(#st)"/><path d="M966 700C900 600 880 400 905 150" fill="none" stroke="#9a8fc8" stroke-opacity=".45" stroke-width="3"/>` +
    `<path d="${swfc}" fill="url(#st)"/><path d="M1062 234l36-10-4 40-28 6z" fill="url(#sk)"/><path d="${jm}" fill="url(#st)"/>` +
    `<path d="${pearl}" fill="#3a3463"/><path d="${balls}" fill="url(#pp)"/></g>`,
  ].join('');
  const b = [
    rr(0, 0, W, HZ + 2, 0, ' fill="url(#sk)"'), rr(0, 0, W, HZ + 2, 0, ' fill="url(#sg)"'),
    `<use href="#C"/>`,
    rr(0, HZ, W, H - HZ, 0, ' fill="url(#rv)"'),
    `<g clip-path="url(#wc)"><g filter="url(#rb)" opacity=".42"><use href="#C" transform="matrix(1 0 0 -1 0 ${2 * HZ})"/></g></g>`,
    rr(0, HZ, W, H - HZ, 0, ' fill="url(#rt)"'),
    P(sun, 'fill="#ffd9a0" fill-opacity=".55"'), P(streak, 'fill="#ffcf8c" fill-opacity=".4"'),
    // 游船
    P('M1180 948l210 0-18 22h-176z', 'fill="#1d1a36"'), P(rectD(1214, 926, 130, 22), 'fill="#2a2648"'), P('M1222 932h8v8h-8zM1242 932h8v8h-8zM1262 932h8v8h-8zM1282 932h8v8h-8zM1302 932h8v8h-8zM1322 932h8v8h-8z', 'fill="#ffd690"'),
    // 外滩堤岸、栏杆、路灯
    P('M-20 1100L1640 1132L1640 1200L-20 1200Z', 'fill="#17152c"'), P(rail, 'fill="#17152c"'), P('M-20 1092L1640 1124', 'stroke="#17152c" stroke-width="8"'),
    ...[180, 820, 1460].map((x) => `<circle cx="${x}" cy="${1000 + x * .02}" r="70" fill="#ffd28a" fill-opacity=".18"/>${P(rectD(x - 3, 1000 + x * .02, 6, 110), 'fill="#17152c"')}<circle cx="${x}" cy="${996 + x * .02}" r="12" fill="#ffe2a8"/>`),
    grainE,
  ].join('');
  return [defs, b];
});

scene('city-night', 'landscape', '#141a3a', () => {
  const HZ = 780;
  const stars = Array.from({ length: 46 }, () => [rand(0, W), rand(0, 420) * rand(.4, 1)]);
  const [far, fw] = skyline(-30, W + 30, HZ, 120, 300, 40, 90, .12, [-6, 6]);
  let near = '', near2 = '', led = '', strips = '';
  const warm = [], cool = [];
  for (let x = -40; x < W + 40;) {
    const bw = rand(80, 160), bh = rand(240, 600) * (1 - Math.abs(x - 800) / 2400), top = HZ - bh, k = R();
    const shape = k < .2 ? poly([[x, HZ + 4], [x, top + 40], [x + bw / 2, top], [x + bw, top + 40], [x + bw, HZ + 4]]) : rectD(x, top, bw, bh + 4);
    if (R() < .4) near2 += shape; else near += shape;
    if (k > .82) strips += Array.from({ length: Math.floor(bw / 18) }, (_, i) => rectD(x + 8 + i * 18, top + 20, 3, bh - 30)).join('');
    else for (let yy = top + 44; yy < HZ - 8; yy += 13) { const rowLit = R() < .22; for (let xx = x + 9; xx < x + bw - 9; xx += 11) if (rowLit ? R() < .8 : R() < .16) (R() < .75 ? warm : cool).push([xx, yy]); }
    if (R() < .45) led += rectD(x, k < .2 ? top + 40 : top, bw, 5);
    x += bw + rand(8, 50);
  }
  const deck = 'M-40 1000Q700 830 1640 868L1640 906Q700 870 -40 1042Z';
  const lane = (o) => `M-40 ${n(996 - o)}Q700 ${n(826 - o)} 1640 ${n(864 - o)}`;
  const white = [6, 14, 22].map(lane).join(''), red = [32, 40, 48].map(lane).join('');
  let bok = '';
  for (let i = 0; i < 14; i++) bok += `<circle cx="${n(rand(0, W))}" cy="${n(rand(1060, 1200))}" r="${n(rand(18, 56))}" fill="${pick(['#ffcf8a', '#ff7a6b', '#8fd3ff'])}" fill-opacity="${d1(rand(.12, .3))}"/>`;
  const defs = [
    lin('sk', [[0, '#03061a'], [.55, '#0b1435'], [.85, '#2a2152'], [1, '#4b2b5c']]),
    radU('cg', [[0, '#ff8a5c', .35], [1, '#ff8a5c', 0]], 800, HZ, 900),
    lin('nb', [[0, '#1b2452'], [1, '#0b1130']]), lin('nc', [[0, '#2a2f5e'], [1, '#120f2c']]), blurF('gl', 8), blurF('bk', 5), grainF(),
  ].join('');
  const b = [
    rr(0, 0, W, H, 0, ' fill="url(#sk)"'), dots(stars, '#fff', 1.2, ' stroke-opacity=".6"'), rr(0, 0, W, H, 0, ' fill="url(#cg)"'),
    P(far, 'fill="#162048"'), winP(fw, '#7f95d6', 4, 6, ' stroke-opacity=".5"'),
    P(near, 'fill="url(#nb)"'), P(near2, 'fill="url(#nc)"'), P(strips, 'fill="#bfe0ff" fill-opacity=".55"'), winP(warm, '#ffd27f', 5, 7, ' stroke-opacity=".9"'), winP(cool, '#d4e8ff', 5, 7, ' stroke-opacity=".8"'),
    `<g filter="url(#gl)">${P(led, 'fill="#4fe6ff"')}</g>`, P(led, 'fill="#bff6ff"'),
    rr(0, HZ, W, H - HZ, 0, ' fill="#070a1c"'),
    ...[160, 560, 980, 1400].map((x) => P(rectD(x, 900, 46, 320), 'fill="#05081a"')),
    P(deck, 'fill="#0b1026"'), P('M-40 1000Q700 830 1640 868', 'fill="none" stroke="#2d3a6e" stroke-width="3"'),
    `<g filter="url(#gl)" fill="none" stroke-width="16" opacity=".6"><path d="${white}" stroke="#ffe7b0"/><path d="${red}" stroke="#ff3d3d"/></g>`,
    P(white, 'fill="none" stroke="#fff6dc" stroke-width="3"'), P(red, 'fill="none" stroke="#ff5a4a" stroke-width="3"'),
    `<g filter="url(#bk)">${bok}</g>`,
    grainE,
  ].join('');
  return [defs, b];
});

scene('street', 'landscape', '#d9a347', () => {
  // 透视：消失点 (VX,VY)，相机高 1.6 米
  const VX = 800, VY = 540, F = 900, CAM = 1.6, ZN = 1.5, ZF = 160;
  const Pj = (X, Y, Z) => [VX + (X * F) / Z, VY + ((CAM - Y) * F) / Z];
  const quad = (X1, Y1, Z1, X2, Y2, Z2, flat) => flat ? poly([Pj(X1, Y1, Z1), Pj(X2, Y1, Z1), Pj(X2, Y1, Z2), Pj(X1, Y1, Z2)]) : poly([Pj(X1, Y1, Z1), Pj(X1, Y2, Z1), Pj(X1, Y2, Z2), Pj(X1, Y1, Z2)]);
  const PAL = ['#f2c14e', '#e9a53a', '#dc8a2c', '#f6d46e', '#c9842e'];
  let fac = '', win = '', shop = '';
  for (const s of [-1, 1]) {
    fac += quad(s * 8, 0, ZN, 0, 18, ZF);
    for (let z = 2.2; z < 46; z += 3.4) { shop += quad(s * 8, 1.1, z + .5, 0, 2.9, z + 2.4); win += quad(s * 8, 4.2, z + .9, 0, 5.9, z + 2); win += quad(s * 8, 7.2, z + .9, 0, 8.9, z + 2); }
  }
  const road = quad(-4, 0, ZN, 4, 0, ZF, true), walk = quad(-8, 0, ZN, 8, 0, ZF, true);
  const curb = quad(-4.2, 0, ZN, -4, 0, ZF, true) + quad(4, 0, ZN, 4.2, 0, ZF, true);
  let light = '', leaves = ['', '', ''];
  for (let i = 0; i < 26; i++) { const X = rand(-7, 7), Z = rand(2.2, 24), [x, y] = Pj(X, 0, Z), r = (rand(.3, .9) * F) / Z; light += ellD(x, y, r, r * .22); }
  for (let i = 0; i < 110; i++) { const X = rand(-7.8, 7.8), Z = ZN + 1 + 24 * rand() ** 1.6, [x, y] = Pj(X, 0, Z), a = (rand(.05, .09) * F) / Z, k = i % 3; leaves[k] += `M${n(x - a)} ${n(y)}l${n(a)} ${-n(a * .35)}l${n(a)} ${n(a * .35)}l${-n(a)} ${n(a * .35)}z`; }
  const trees = [];
  for (const s of [-1, 1]) for (let z = 2.4 + (s > 0 ? 2.2 : 0); z < 62; z += 4.4) trees.push([s * 5.7, z]);
  trees.sort((a, b) => b[1] - a[1]);
  const can = { far: [], near: [] }, trunks = { far: '', near: '' }, bark = ['', ''];
  for (const [X, Z] of trees) {
    const bin = Z > 14 ? 'far' : 'near';
    trunks[bin] += poly([Pj(X - .3, 0, Z), Pj(X - .22, 4.6, Z), Pj(X + .22, 4.6, Z), Pj(X + .3, 0, Z)]);
    for (const dx of [-1.7, 1.5, .4]) trunks[bin] += poly([Pj(X - .2, 4.3, Z), Pj(X + dx - .1, dx === .4 ? 9.5 : 8.2, Z), Pj(X + dx + .1, dx === .4 ? 9.5 : 8.2, Z), Pj(X + .2, 4.3, Z)]);
    if (Z < 12) for (let k = 0; k < 9; k++) { const [x, y] = Pj(X + rand(-.22, .22), rand(.2, 4.4), Z), r = (rand(.06, .14) * F) / Z; bark[k % 2] += ellD(x, y, r, r * rand(1.2, 2)); }
    for (let k = 0; k < 9; k++) {
      const z = Math.max(1.4, Z + rand(-1.8, 1.8)), Y = rand(6.2, 11), [x, y] = Pj(X + rand(-2.8, 2.8), Y, z), r = (rand(1.3, 2.4) * F) / z;
      if (y + r < 0 || y - r > H || x + r < 0 || x - r > W) continue;
      can[bin].push([x, y, r, PAL[Y < 7.4 ? 4 : Math.floor(rand(0, 4))]]);
    }
  }
  const person = (X, Z, c) => { const [x, y] = Pj(X, 0, Z), s = F / Z / 100; return P(`M${n(x - 18 * s)} ${n(y - 150 * s)}q${n(18 * s)} ${n(-14 * s)} ${n(36 * s)} 0l${n(4 * s)} ${n(80 * s)}h${n(-10 * s)}l${n(-4 * s)} ${n(70 * s)}h${n(-8 * s)}l${n(-2 * s)} ${n(-62 * s)}l${n(-4 * s)} ${n(62 * s)}h${n(-8 * s)}l${n(-2 * s)} ${n(-70 * s)}h${n(-10 * s)}z` + circD(x, y - 162 * s, 11 * s), `fill="${c}"`); };
  const defs = [
    lin('sk', [[0, '#cfe2ea'], [.6, '#f3ead3'], [1, '#f6dfb0']]),
    linU('fl', [[0, '#e6d0ae'], [1, '#b99878']], 0, 0, 760, 0), linU('fr', [[0, '#a98a6e'], [1, '#d8bf9c']], 840, 0, W, 0),
    linU('rd', [[0, '#c5b9a6'], [.3, '#8a807a'], [1, '#5a524f']], 0, VY, 0, H), linU('wk', [[0, '#d9cbb3'], [1, '#a8957d']], 0, VY, 0, H),
    radU('hz', [[0, '#fff6dc', .95], [.5, '#fff0cc', .45], [1, '#fff0cc', 0]], VX, VY - 30, 460), grainF(),
  ].join('');
  const b = [
    rr(0, 0, W, H, 0, ' fill="url(#sk)"'),
    P(quad(-8, 0, ZN, 0, 18, ZF), 'fill="url(#fl)"'), P(quad(8, 0, ZN, 0, 18, ZF), 'fill="url(#fr)"'),
    P(win, 'fill="#5d4a3c" fill-opacity=".75"'), P(shop, 'fill="#f3c47c" fill-opacity=".85"'),
    P(walk, 'fill="url(#wk)"'), P(road, 'fill="url(#rd)"'), P(curb, 'fill="#e8dcc6"'),
    P(light, 'fill="#ffe7a6" fill-opacity=".3"'),
    ...leaves.map((d, i) => P(d, `fill="${PAL[i]}"`)),
    blobs(can.far, 5), P(trunks.far, 'fill="#8b8468"'),
    rr(0, 0, W, H, 0, ' fill="url(#hz)"'),
    person(6.6, 13, '#4a3d38'), person(-6.3, 24, '#5b4b44'),
    blobs(can.near, 5), P(trunks.near, 'fill="#8f8a6c"'),
    P(bark[0], 'fill="#d9d1b0"'), P(bark[1], 'fill="#6f6950"'),
    grainE,
  ].join('');
  return [defs, b];
});

scene('desert', 'landscape', '#e3a466', () => {
  let rip = '';
  for (let i = 0; i < 16; i++) { const y = 960 + i * 16 + rand(-4, 4), x = rand(500, 1300); rip += `M${n(x)} ${n(y)}q${n(rand(120, 220))} ${n(rand(-24, -8))} ${n(rand(300, 460))} ${n(rand(6, 20))}`; }
  const camel = (x, y, s) => `M${x} ${y}` + [[0, -30], [8, -48], [20, -40], [30, -52], [40, -38], [48, -36], [50, -28], [58, -42], [62, -50], [70, -48], [71, -42], [63, -37], [57, -22], [52, -20], [52, 0], [49, 0], [47, -16], [41, -16], [41, 0], [38, 0], [36, -16], [14, -18], [12, 0], [9, 0], [8, -18], [4, -18], [3, 0], [0, 0]].map(([a, c]) => `L${n(x + a * s)} ${n(y + c * s)}`).join('') + 'Z';
  const defs = [
    lin('sk', [[0, '#4f86c6'], [.45, '#9cc1df'], [.82, '#f0d6b0'], [1, '#f7c58c']]),
    radU('sg', [[0, '#fff8e6', 1], [.15, '#ffe9bf', .7], [1, '#ffe9bf', 0]], 1230, 560, 560),
    lin('d0', [[0, '#efc79a'], [1, '#e7b483']]), lin('d1', [[0, '#eeb072'], [1, '#e39d5c']]), lin('d2', [[0, '#f3b978'], [1, '#e7a262']]), lin('d3', [[0, '#f8c487'], [1, '#eaa868']]),
    grainF(.16),
  ].join('');
  const b = [
    rr(0, 0, W, 700, 0, ' fill="url(#sk)"'), rr(0, 0, W, 700, 0, ' fill="url(#sg)"'), `<circle cx="1230" cy="560" r="44" fill="#fffaf0"/>`,
    P(area(wave(640, 18, -40, W + 40, 90), H, true), 'fill="url(#d0)"'),
    P('M-40 700Q200 610 430 600Q700 610 980 720L980 1200L-40 1200Z', 'fill="url(#d1)"'),
    P('M430 600Q200 610 -40 700L-40 820Q200 730 330 680Q400 640 430 600Z', 'fill="#b56a3e" fill-opacity=".5"'),
    P('M600 780Q900 600 1150 560Q1380 580 1640 690L1640 1200L600 1200Z', 'fill="url(#d2)"'),
    P('M1150 560Q900 600 600 780L600 880Q900 770 1050 680Q1120 620 1150 560Z', 'fill="#b0623a" fill-opacity=".5"'),
    P(camel(930, 640, 1) + camel(1005, 612, .95) + camel(1074, 590, .9), 'fill="#6b3c22"'),
    P('M1112 584l4-26q6-6 10 0l4 26z', 'fill="#6b3c22"'),
    P('M-40 1010C300 900 520 860 760 870C1000 880 1300 960 1640 1020L1640 1200L-40 1200Z', 'fill="url(#d3)"'),
    P('M760 870C520 860 300 900 -40 1010L-40 1200L180 1200C420 1080 650 950 760 870Z', 'fill="#bf733f" fill-opacity=".55"'),
    P(rip, 'fill="none" stroke="#c98547" stroke-opacity=".4" stroke-width="3"'),
    grainE,
  ].join('');
  return [defs, b];
});

// 带积雪的松树：返回 [树, 雪]
const snowPine = (x, y, h, tiers = 5) => {
  const w = h * .44, top = y - h, body = h * .88; let g = '', s = '';
  for (let i = 0; i < tiers; i++) {
    const t1 = (i + 1) / tiers, yT = i ? top + (body * i) / tiers - (body / tiers) * .45 : top, yB = top + body * t1, wB = (w / 2) * (.3 + .7 * t1) * rand(.9, 1.1), k = yB - yT;
    g += poly([[x, yT], [x + wB, yB], [x + wB * .5, yB - k * .06], [x, yB + k * .04], [x - wB * .5, yB - k * .06], [x - wB, yB]]);
    s += poly([[x, yT + k * .04], [x + wB * .58, yB - k * .4], [x + wB * .22, yB - k * .5], [x - wB * .18, yB - k * .36], [x - wB * .5, yB - k * .44], [x - wB * .82, yB - k * .2]]);
  }
  return [g + rectD(x - h * .025, y - h * .12, h * .05, h * .12), s];
};

scene('snow', 'landscape', '#c7d8e8', () => {
  const ridge = jag([[-40, 560], [220, 460], [430, 520], [700, 400], [960, 500], [1240, 420], [1640, 520]], .1, 3);
  let pg = '', ps = '', bg = '', bs = '';
  const addPine = (x, y, h, near) => { const [g, s] = snowPine(x, y, h, h > 150 ? 6 : 4); if (near) { bg += g; bs += s; } else { pg += g; ps += s; } };
  const farTrees = treeline(-20, W + 20, 712, (x) => 26 + 14 * Math.sin(x / 120) + rand(0, 16), 9, 18);
  for (let x = 40; x < 1560; x += rand(70, 130)) if (x < 860 || x > 1280) addPine(x, 770 + rand(-10, 10), rand(80, 130));
  for (let x = -40; x < 360; x += rand(60, 90)) addPine(x, 1080 - x * .12, rand(300, 420), 1);
  for (let x = 1420; x < 1660; x += rand(60, 90)) addPine(x, 1040 + (x - 1420) * .14, rand(280, 400), 1);
  const fl1 = [], fl2 = [];
  for (let i = 0; i < 90; i++) (R() < .75 ? fl1 : fl2).push([rand(0, W), rand(0, H)]);
  let steps = '';
  for (let i = 0; i < 9; i++) { const t = i / 9, x = lerp(760, 1010, t ** .8) + (i % 2 ? 16 : -16) * (1 - t), y = lerp(1180, 900, t); steps += ellD(x, y, 14 * (1 - t * .6), 6 * (1 - t * .6)); }
  const defs = [
    lin('sk', [[0, '#a3c3e2'], [.55, '#d5e4f1'], [1, '#f3f6f9']]),
    radU('sg', [[0, '#fffdf6', .9], [1, '#fffdf6', 0]], 380, 200, 700),
    lin('mt', [[0, '#d7e3ef'], [1, '#eef3f8']]), lin('h1', [[0, '#f6f9fc'], [1, '#e2ebf4']]), lin('h2', [[0, '#ffffff'], [1, '#e8eff6']]),
    radU('wg', [[0, '#ffc970', .7], [1, '#ffc970', 0]], 1040, 822, 120), blurF('sm', 10), grainF(.1),
  ].join('');
  const b = [
    rr(0, 0, W, H, 0, ' fill="url(#sk)"'), rr(0, 0, W, H, 0, ' fill="url(#sg)"'),
    P(area(ridge, 760), 'fill="url(#mt)"'),
    P(area(jag([[-40, 600], [260, 540], [520, 590], [800, 530], [1060, 580], [1360, 530], [1640, 590]], .08, 3), 760), 'fill="#c3d3e4" fill-opacity=".7"'),
    P(area(wave(670, 22, -40, W + 40, 100), H, true), 'fill="url(#h1)"'),
    P(farTrees, 'fill="#7f9aa3"'), P(area(wave(722, 10, -40, W + 40, 120), H, true), 'fill="#f1f5f9"'),
    P(pg, 'fill="#2f4a47"'), P(ps, 'fill="#f4f8fb"'),
    P(area([[-40, 870], [400, 884], [800, 900], [1200, 884], [1640, 926]], H, true), 'fill="url(#h2)"'),
    // 木屋
    P('M1120 792h126v96h-126z', 'fill="#5e3a28"'), P('M960 782h160v106h-160z', 'fill="#7a4b33"'), P('M960 782l80-70 80 70z', 'fill="#6a4029"'),
    P('M966 812h148M966 840h148M966 866h148M1126 822h114M1126 852h114', 'stroke="#5a3826" stroke-width="3"'),
    rr(1012, 800, 56, 46, 4, ' fill="#ffd27c"'), P('M1040 800v46M1012 823h56', 'stroke="#7a4b33" stroke-width="4"'),
    `<rect x="900" y="700" width="280" height="240" fill="url(#wg)"/>`,
    rr(1144, 820, 40, 34, 3, ' fill="#ffcf78"'),
    P('M1084 690h20v40h-20z', 'fill="#5a3826"'), P('M1080 684h28v10h-28z', 'fill="#fff"'),
    P('M1094 676c-20-40 30-60 10-110', 'fill="none" stroke="#e8eef4" stroke-width="16" stroke-linecap="round" filter="url(#sm)" opacity=".8"'),
    P('M940 790l100-92 100 92-14 6-86-78-86 78z', 'fill="#4a2f22"'), P('M932 784l108-98 108 98-12 2-96-86-96 86z', 'fill="#fbfdff"'),
    P('M1040 688h118l100 98h-130z', 'fill="#e9f0f7"'), P('M1132 786h126', 'stroke="#c9d6e4" stroke-width="6"'),
    P(steps, 'fill="#c3d2e3"'),
    P(bg, 'fill="#2a4541"'), P(bs, 'fill="#f6f9fc"'),
    dots(fl1, '#fff', 3, ' stroke-opacity=".85"'), dots(fl2, '#fff', 6, ' stroke-opacity=".7"'),
    grainE,
  ].join('');
  return [defs, b];
});

const pagoda = (cx, base, h, tiers = 5) => {
  let body = '', eave = '';
  const th = (h * .78) / tiers, w0 = h * .3;
  let y = base;
  body += rectD(cx - w0 * .75, y - 8, w0 * 1.5, 8); y -= 8;
  for (let i = 0; i < tiers; i++) {
    const wb = w0 * (1 - i * .1), ew = wb * 1.55, ey = y - th;
    body += rectD(cx - wb / 2, ey, wb, th);
    eave += poly([[cx - ew / 2, ey - 7], [cx - wb / 2, ey + 5], [cx + wb / 2, ey + 5], [cx + ew / 2, ey - 7], [cx + wb * .42, ey - 3], [cx - wb * .42, ey - 3]]);
    y = ey;
  }
  body += poly([[cx - w0 * .4, y], [cx, y - th * .7], [cx + w0 * .4, y]]) + rectD(cx - 2, y - th * 1.7, 4, th);
  return [body, eave];
};

scene('lake', 'landscape', '#c3ccc6', () => {
  const HZ = 700;
  const hill1 = area([[-40, 560], [180, 520], [420, 548], [700, 500], [980, 540], [1200, 505], [1450, 532], [1640, 512]], HZ, true);
  const hill2 = area([[-40, 640], [160, 604], [380, 624], [620, 596], [860, 634], [1020, 580], [1130, 548], [1250, 584], [1440, 624], [1640, 604]], HZ, true);
  let cz = rectD(-40, HZ - 9, 1000, 11);
  for (let x = -40; x < 960; x += rand(16, 30)) cz += circD(x, HZ - 10, rand(9, 20));
  const [pb, pe] = pagoda(1132, 552, 176);
  const bridge = 'M150 702L150 686Q300 652 450 686L450 702L362 702A62 46 0 0 0 238 702Z';
  let rip = '';
  for (let i = 0; i < 46; i++) { const t = rand() ** 1.4; rip += rectD(rand(-60, W), HZ + 6 + t * 480, rand(40, 200) * (1 + t), 1.5 + t * 2); }
  let wl = '', wl2 = '';
  for (let i = 0; i < 16; i++) {
    const x = rand(-60, 520), len = rand(260, 640) * (1 - x / 1400), sw = rand(-40, 40);
    const d = `M${n(x)} -20C${n(x + 30)} ${n(len * .3)} ${n(x + sw)} ${n(len * .7)} ${n(x + sw * 1.4 + 10)} ${n(len)}`;
    if (i % 2) wl += d; else wl2 += d;
  }
  let crown = '';
  for (let i = 0; i < 9; i++) crown += circD(rand(-60, 380), rand(-70, 10), rand(40, 80));
  const lotus = [[1300, 1080, 92, 26], [1446, 1132, 112, 32], [1180, 1154, 82, 22], [1524, 1042, 72, 18], [1380, 1010, 62, 16], [1600, 1160, 90, 26]];
  const boat = `<g id="bt"><path d="M560 900Q720 936 880 896L868 914Q720 950 576 916Z" fill="#3e3029"/><path d="M566 902Q720 934 874 898" fill="none" stroke="#8a6a52" stroke-width="3"/>` +
    `<path d="M664 900V846M780 900V846" stroke="#3e3029" stroke-width="5"/><path d="M640 848Q720 816 802 848L802 858Q720 828 640 858Z" fill="#2d4c5c"/><path d="M642 858h160" stroke="#c9a46a" stroke-width="3" stroke-dasharray="4 5"/>` +
    `<path d="M842 896l4-62q6-12 14 0l4 62z" fill="#2f2a28"/><circle cx="852" cy="822" r="9" fill="#2f2a28"/><path d="M832 818l20-14 20 14z" fill="#b89b6a"/><path d="M872 840L906 948" stroke="#5a4636" stroke-width="5"/></g>`;
  const defs = [
    lin('sk', [[0, '#d5dfdf'], [.7, '#eceee7'], [1, '#f4efe2']]),
    radU('sg', [[0, '#fffaf0', .85], [1, '#fffaf0', 0]], 1220, 260, 560),
    lin('m1', [[0, '#c4cfcf'], [1, '#dfe5e2']]), lin('m2', [[0, '#a7b6b5'], [1, '#c8d1ce']]),
    lin('ms', [[0, '#eef0ea', 0], [.7, '#eef0ea', .75], [1, '#eef0ea', .3]]),
    lin('wt', [[0, '#e4e7df'], [.35, '#c8d2cd'], [1, '#90a5a4']]),
    `<clipPath id="wc"><rect y="${HZ}" width="${W}" height="${H - HZ}"/></clipPath>`, blurF('rb', '1.5 4'), grainF(.12),
    `<g id="L"><path d="${hill1}" fill="url(#m1)"/><rect y="520" width="${W}" height="${HZ - 520}" fill="url(#ms)"/><path d="${hill2}" fill="url(#m2)"/>` +
    `<path d="${pb}" fill="#66716f"/><path d="${pe}" fill="#4d5756"/><rect y="610" width="${W}" height="${HZ - 610}" fill="url(#ms)" opacity=".7"/>` +
    `<path d="${cz}" fill="#6f8580"/><path d="${bridge}" fill="#9aa6a3"/></g>`,
  ].join('');
  const b = [
    rr(0, 0, W, HZ + 2, 0, ' fill="url(#sk)"'), rr(0, 0, W, HZ, 0, ' fill="url(#sg)"'),
    `<use href="#L"/>`, rr(0, HZ, W, H - HZ, 0, ' fill="url(#wt)"'),
    `<g clip-path="url(#wc)"><g filter="url(#rb)" opacity=".38"><use href="#L" transform="matrix(1 0 0 -1 0 ${2 * HZ})"/></g></g>`,
    P(rip, 'fill="#fff" fill-opacity=".3"'),
    `<g opacity=".22" filter="url(#rb)"><use href="#bt" transform="matrix(1 0 0 -1 0 1812)"/></g>`, boat,
    P('M520 924h440M600 934h300', 'stroke="#fff" stroke-opacity=".5" stroke-width="2"'),
    P(lotus.map(([x, y, a, c]) => ellD(x, y, a, c)).join(''), 'fill="#5c7d4b"'),
    P(lotus.map(([x, y, a, c]) => ellD(x - a * .1, y - c * .15, a * .7, c * .6)).join(''), 'fill="#7c9c5c"'),
    P('M1352 1012C1350 990 1354 970 1356 950', 'fill="none" stroke="#5c7d4b" stroke-width="4"'), P('M1356 952c-16-14-14-40 0-54c14 14 16 40 0 54z', 'fill="#e79aa8"'),
    P(crown, 'fill="#6f8a4c"'),
    P(wl2, 'fill="none" stroke="#6f8a4c" stroke-width="10" stroke-dasharray="16 7" stroke-opacity=".9"'),
    P(wl, 'fill="none" stroke="#9cb664" stroke-width="9" stroke-dasharray="13 8" stroke-opacity=".9"'),
    P(wl + wl2, 'fill="none" stroke="#56683c" stroke-width="2"'),
    grainE,
  ].join('');
  return [defs, b];
});

scene('countryside', 'landscape', '#c9a94a', () => {
  // 婺源秋天：梯田、徽派白墙黛瓦与晒秋
  // 梯田：沿山坡等高线的弧带，近宽远窄，中间有一道向前凸出的山脊
  const spur = (x) => Math.exp(-(((x - 420) / 460) ** 2));
  const C = (k, x) => 744 + k * (9 + k * 2.4) + (10 + k * 7) * spur(x) + 14 * Math.sin(x / 260 + k * .3);
  const gold = ['#e4b33e', '#d9a332', '#ecc257', '#d1982c', '#e8bb4a'];
  let bands = '', walls = '', lights = '';
  for (let k = 0; C(k, 1600) < H + 60 || C(k, 420) < H + 60; k++) {
    const top = [], bot = [];
    for (let x = -80; x <= W + 80; x += 160) { top.push([x, C(k, x)]); bot.push([x, C(k + 1, x)]); }
    bands += P(smooth(top) + smooth(bot.reverse()).replace('M', 'L') + 'Z', `fill="${k % 6 === 4 ? '#a7b858' : gold[(k * 3) % 5]}"`);
    walls += smooth(top); lights += smooth(top.map(([x, y]) => [x, y + 3 + k * .3]));
  }
  const house = (x, y, w, h, tray) => {
    const s1 = h * .17, a = w * .17;
    const wall = poly([[x, y], [x, y - h], [x + a, y - h], [x + a, y - h - s1], [x + 2 * a, y - h - s1], [x + 2 * a, y - h - 2 * s1], [x + w - 2 * a, y - h - 2 * s1], [x + w - 2 * a, y - h - s1], [x + w - a, y - h - s1], [x + w - a, y - h], [x + w, y - h], [x + w, y]]);
    const cap = `M${n(x - 4)} ${n(y - h)}h${n(a + 4)}M${n(x + a - 3)} ${n(y - h - s1)}h${n(a + 3)}M${n(x + 2 * a - 3)} ${n(y - h - 2 * s1)}h${n(w - 4 * a + 6)}M${n(x + w - 2 * a)} ${n(y - h - s1)}h${n(a + 3)}M${n(x + w - a)} ${n(y - h)}h${n(a + 4)}`;
    const win = rectD(x + w * .22, y - h * .62, w * .1, h * .16) + rectD(x + w * .68, y - h * .62, w * .1, h * .16) + rectD(x + w * .42, y - h * .38, w * .16, h * .38);
    let tr = '';
    if (tray) {
      const ty = y - h * .5, tx = x + (tray % 2 ? w : -6);
      tr += `<path d="M${n(tx)} ${n(ty + 8)}h${tray % 2 ? 150 : -150}" stroke="#7a5a3a" stroke-width="5"/>`;
      for (let i = 0; i < 3; i++) tr += `<ellipse cx="${n(tx + (tray % 2 ? 1 : -1) * (26 + i * 48))}" cy="${n(ty)}" rx="24" ry="9" fill="${['#d9452b', '#f0b235', '#e8742a'][(i + tray) % 3]}"/>`;
    }
    return [wall, cap, win, tr];
  };
  const H0 = [[700, 650, 120, 96, 0], [836, 640, 130, 104, 0], [990, 652, 120, 96, 0], [1130, 636, 140, 110, 0], [1290, 648, 124, 98, 0], [1430, 640, 136, 106, 0],
    [620, 730, 136, 116, 2], [780, 742, 150, 126, 1], [954, 736, 140, 120, 0], [1110, 746, 160, 132, 1], [1300, 738, 140, 120, 0], [1460, 748, 150, 128, 3]];
  let walls2 = '', caps = '', wins = '', trays = '';
  for (const [x, y, w, h, t] of H0) { const [a, c, d, e] = house(x, y, w, h, t); walls2 += a; caps += c; wins += d; trays += e; }
  const trees = [], trees2 = [];
  for (let i = 0; i < 14; i++) trees.push([rand(640, 1600), rand(560, 620), rand(26, 44), '#4c7d4b']);
  for (let i = 0; i < 12; i++) trees2.push([rand(420, 640), rand(560, 700), rand(36, 70), i % 3 ? '#3f6f45' : '#4f8350']);
  const forest = [];
  for (let x = -40; x < W + 40; x += rand(30, 60)) forest.push([x, 600 + Math.sin(x / 210) * 20 + rand(-8, 8), rand(26, 46), '#5d8a5f']);
  const defs = [
    lin('sk', [[0, '#77b0e2'], [.7, '#cbe3f2'], [1, '#eaf2f1']]), lin('cl', [[0, '#ffffff'], [1, '#dbe6ef']]),
    lin('m1', [[0, '#9ab8b6'], [1, '#c1d3cf']]), lin('m2', [[0, '#7aa08d'], [1, '#9ab9a2']]),
    lin('ms', [[0, '#e9f1f0', 0], [1, '#e9f1f0', .7]]), grainF(.12),
  ].join('');
  const b = [
    rr(0, 0, W, 760, 0, ' fill="url(#sk)"'),
    P(cloudD(140, 250, 360, 110) + cloudD(980, 190, 300, 90) + cloudD(1260, 300, 260, 80), 'fill="url(#cl)"'),
    P(area([[-40, 470], [200, 400], [430, 450], [700, 380], [960, 440], [1220, 390], [1460, 450], [1640, 420]], 760, true), 'fill="url(#m1)"'),
    P(area([[-40, 560], [240, 500], [520, 540], [820, 490], [1100, 540], [1380, 500], [1640, 540]], 760, true), 'fill="url(#m2)"'),
    rr(0, 480, W, 160, 0, ' fill="url(#ms)"'),
    blobs(forest, 3), rr(-40, 600, W + 80, 200, 0, ' fill="#5d8a5f"'), blobs(trees, 3),
    P(walls2, 'fill="#f4f0e7"'), P(wins, 'fill="#3e4148"'), P(caps, 'fill="none" stroke="#3a3d45" stroke-width="10"'), trays,
    blobs(trees2, 3),
    bands, P(lights, 'fill="none" stroke="#fbe39a" stroke-opacity=".45" stroke-width="2"'), P(walls, 'fill="none" stroke="#6f5620" stroke-opacity=".45" stroke-width="3"'),
    grainE,
  ].join('');
  return [defs, b];
});

scene('sky', 'landscape', '#e9c0a8', () => {
  const peakL = jag([[-40, 960], [40, 560], [120, 420], [200, 300], [262, 372], [330, 330], [410, 480], [470, 580], [560, 960]], .1, 3);
  const peakR = jag([[1160, 960], [1250, 620], [1330, 470], [1404, 404], [1470, 470], [1544, 420], [1640, 560], [1640, 960]], .1, 3);
  const litL = poly([[200, 300], [262, 372], [330, 330], [410, 480], [470, 580], [560, 960], [300, 960], [250, 520]]);
  const litR = poly([[1404, 404], [1470, 470], [1544, 420], [1640, 560], [1640, 960], [1460, 960], [1420, 560]]);
  const pine = (x, y, s) => `<path d="M${x} ${y}c${n(-6 * s)} ${n(-20 * s)} ${n(4 * s)} ${n(-34 * s)} ${n(-10 * s)} ${n(-52 * s)}" fill="none" stroke="#262c40" stroke-width="${n(5 * s)}"/>` + P(ellD(x - 30 * s, y - 52 * s, 34 * s, 9 * s) + ellD(x + 4 * s, y - 40 * s, 26 * s, 8 * s) + ellD(x - 14 * s, y - 64 * s, 22 * s, 7 * s), 'fill="#262c40"');
  // 云海：每层三排云团，远层模糊、偏暖
  const band = (k) => {
    const y = 640 + k * 118, r = 26 + k * 30, items = [];
    for (let j = 0; j < 3; j++) for (let x = -60; x < W + 80; x += r * rand(.6, 1)) items.push([x, y + j * r * .5 + rand(-.3, .3) * r, r * rand(.55, 1.1) * (1 - j * .1), `url(#c${k})`]);
    return [blobs(items, 4) + rr(-60, y + r * .8, W + 120, H, 0, ` fill="url(#c${k})"`), y, r];
  };
  const cols = [['#f9d8c4', '#dcc3cb'], ['#fbe2cf', '#d8c6d4'], ['#fff1e4', '#cfc7dc'], ['#fff8f0', '#cac7de'], ['#ffffff', '#c8c6de']];
  let defsB = '', bodyB = '';
  for (let k = 0; k < 5; k++) {
    const [d, y, r] = band(k);
    defsB += linU('c' + k, [[0, cols[k][0]], [.55, mix(cols[k][0], cols[k][1], .5)], [1, cols[k][1]]], 0, y - r * 1.2, 0, y + r * 1.4) + (k < 3 ? blurF('cb' + k, 7 - k * 2) : '');
    bodyB += (k < 3 ? `<g filter="url(#cb${k})">${d}</g>` : d) + (k === 1 ? P(area(peakR, H), 'fill="url(#pk)"') + P(litR, 'fill="#f6b48a" fill-opacity=".28"') : '');
  }
  const defs = [
    lin('sk', [[0, '#4d6db2'], [.38, '#98acd9'], [.62, '#efc3a8'], [.78, '#ffd8ac'], [1, '#ffe8c6']]),
    radU('sg', [[0, '#fffaf0', 1], [.08, '#fff1d8', .9], [.4, '#ffd7a8', .35], [1, '#ffd7a8', 0]], 1060, 520, 760),
    lin('pk', [[0, '#495576'], [1, '#7a7f9c']]), defsB, grainF(.12),
  ].join('');
  const b = [
    rr(0, 0, W, H, 0, ' fill="url(#sk)"'), rr(0, 0, W, H, 0, ' fill="url(#sg)"'), `<circle cx="1060" cy="520" r="52" fill="#fffaf2"/>`,
    P(area(peakL, H), 'fill="url(#pk)"'), P(litL, 'fill="#f6b48a" fill-opacity=".28"'),
    bodyB, grainE,
  ].join('');
  return [defs, b];
});

scene('aurora', 'landscape', '#0b2a3a', () => {
  const HZ = 860;
  let big = '';
  const st1 = [], st2 = [];
  for (let i = 0; i < 160; i++) (R() < .7 ? st1 : st2).push([rand(0, W), rand(0, 760) * rand(.3, 1)]);
  for (let i = 0; i < 7; i++) { const x = rand(0, W), y = rand(30, 420); big += `<circle cx="${n(x)}" cy="${n(y)}" r="9" fill="#cfe8ff" fill-opacity=".18"/><circle cx="${n(x)}" cy="${n(y)}" r="2.6" fill="#fff"/>`; }
  const ribbon = (base, amp, hh, ph) => {
    const bot = [], top = [];
    for (let x = -120; x <= W + 120; x += 100) { const y = base + amp * Math.sin(x / 330 + ph) + 30 * Math.sin(x / 120 + ph * 2), h = hh * (.7 + .4 * Math.sin(x / 230 + ph * 3)); bot.push([x, y]); top.push([x, y - h]); }
    let r = '';
    for (let x = -60; x < W + 60; x += rand(14, 30)) { const y = yAt(bot, x), h = hh * rand(.3, .95); r += `M${n(x)} ${n(y)}l${n(rand(-10, 10))} ${-n(h)}`; }
    return [smooth(bot) + smooth(top.reverse()).replace('M', 'L') + 'Z', r];
  };
  const [ra, rya] = ribbon(560, 80, 330, 0), [rb, ryb] = ribbon(380, 60, 220, 2.2);
  const ridge = jag([[-40, 760], [160, 650], [330, 700], [560, 600], [760, 690], [980, 640], [1180, 700], [1400, 620], [1640, 700]], .1, 3);
  let pines = '';
  for (let x = -30; x < 300; x += rand(26, 44)) pines += pineD(x, H + 10, rand(260, 420), undefined, 7);
  for (let x = 1360; x < 1650; x += rand(26, 44)) pines += pineD(x, H + 10, rand(240, 400), undefined, 7);
  const defs = [
    lin('sk', [[0, '#030918'], [.5, '#06182f'], [1, '#0f2f45']]),
    lin('au', [[0, '#a56bff', 0], [.32, '#7c7dff', .22], [.72, '#38f0a4', .72], [1, '#c4ffe0', .95]]),
    lin('lk', [[0, '#0b2436'], [1, '#040c16']]), radU('tg', [[0, '#ffb35a', .5], [1, '#ffb35a', 0]], 1150, HZ - 6, 150),
    blurF('ab', 14), blurF('rf', 3), blurF('rb', '3 8'), grainF(.12),
    `<clipPath id="wc"><rect y="${HZ}" width="${W}" height="${H - HZ}"/></clipPath>`,
    `<g id="A"><g filter="url(#ab)"><path d="${rb}" fill="url(#au)" opacity=".6"/><path d="${ra}" fill="url(#au)"/></g><g filter="url(#rf)" fill="none" stroke="#a6ffd6" stroke-opacity=".16" stroke-width="7"><path d="${rya}"/><path d="${ryb}"/></g></g>`,
    `<g id="G"><path d="${area(ridge, HZ + 2)}" fill="#07121f"/><path d="${poly(ridge, false)}" fill="none" stroke="#6b8ea0" stroke-opacity=".35" stroke-width="3"/><path d="M1110 ${HZ + 2}l40-56 40 56z" fill="#ffb35a"/></g>`,
  ].join('');
  const b = [
    rr(0, 0, W, H, 0, ' fill="url(#sk)"'), dots(st1, '#fff', 1, ' stroke-opacity=".6"'), dots(st2, '#fff', 1.8, ' stroke-opacity=".8"'), big,
    `<use href="#A"/>`, `<use href="#G"/>`, rr(1000, HZ - 140, 300, 280, 0, ' fill="url(#tg)"'),
    rr(0, HZ, W, H - HZ, 0, ' fill="url(#lk)"'),
    `<g clip-path="url(#wc)" opacity=".55"><g filter="url(#rb)"><use href="#A" transform="matrix(1 0 0 -1 0 ${2 * HZ})"/><use href="#G" transform="matrix(1 0 0 -1 0 ${2 * HZ})"/></g></g>`,
    P(pines, 'fill="#02060d"'),
    grainE,
  ].join('');
  return [defs, b];
});

// =====================================================================
// 室内与生活
// =====================================================================
const ellR = (cx, cy, rx, ry, deg) => { const a = (deg * Math.PI) / 180, dx = rx * Math.cos(a), dy = rx * Math.sin(a); return `M${n(cx - dx)} ${n(cy - dy)}a${n(rx)} ${n(ry)} ${n(deg)} 1 0 ${n(2 * dx)} ${n(2 * dy)}a${n(rx)} ${n(ry)} ${n(deg)} 1 0 ${n(-2 * dx)} ${n(-2 * dy)}z`; };
const glow = (id, cx, cy, r, c, o = .55) => [radU(id, [[0, c, o], [.4, c, o * .4], [1, c, 0]], cx, cy, r), `<rect x="${n(cx - r)}" y="${n(cy - r)}" width="${n(2 * r)}" height="${n(2 * r)}" fill="url(#${id})"/>`];
const vignette = (o = .3) => [rad('vg', [[.55, '#000', 0], [1, '#000', o]], .5, .5, .75), `<rect width="${W}" height="${H}" fill="url(#vg)"/>`];
const pendant = (x, y, len, c = '#2f4a40') => `<path d="M${x} -10V${y - 70}" stroke="#2a2522" stroke-width="3"/><path d="M${x - 74} ${y}Q${x - 70} ${y - 72} ${x} ${y - 76}Q${x + 70} ${y - 72} ${x + 74} ${y}Z" fill="${c}"/><ellipse cx="${x}" cy="${y}" rx="74" ry="12" fill="#ffe7b0"/><circle cx="${x}" cy="${y + 4}" r="16" fill="#fff4d8"/>`;

scene('cafe', 'interior', '#c9a47e', () => {
  const [gd1, g1] = glow('l1', 820, 230, 300, '#ffd58e'), [gd2, g2] = glow('l2', 1090, 230, 300, '#ffd58e'), [gd3, g3] = glow('l3', 1360, 230, 300, '#ffd58e');
  const outside = [];
  for (let i = 0; i < 22; i++) outside.push([rand(60, 620), rand(260, 720), rand(40, 110), pick(['#9fc47e', '#86b56a', '#b8d79a', '#6f9e5c'])]);
  let slats = '';
  for (let x = 660; x < W; x += 30) slats += `M${x} 744V1200`;
  const shelfItems = (y) => {
    let s = '';
    for (let x = 740; x < 1540;) {
      const k = R(), w = rand(40, 80);
      if (k < .35) s += `<rect x="${n(x)}" y="${y - 70}" width="${n(w)}" height="70" rx="8" fill="#efe6d6" fill-opacity=".85"/><rect x="${n(x)}" y="${y - 36}" width="${n(w)}" height="36" rx="6" fill="#6b4630"/>`;
      else if (k < .6) for (let j = 0; j < 3; j++) s += `<rect x="${n(x)}" y="${y - 22 - j * 22}" width="${n(w * .8)}" height="20" rx="4" fill="#fbf8f2"/>`;
      else if (k < .8) s += `<path d="M${n(x)} ${y}l6-84h${n(w - 12)}l6 84z" fill="#c79d6c"/><rect x="${n(x + 8)}" y="${y - 60}" width="${n(w - 16)}" height="22" fill="#f4ecdf"/>`;
      else s += `<rect x="${n(x)}" y="${y - 44}" width="${n(w * .7)}" height="44" rx="6" fill="#e9e2d6"/>` + P(Array.from({ length: 6 }, (_, j) => leafD(x + w * .35, y - 40, -Math.PI / 2 + (j - 2.5) * .45, rand(40, 66), .28)).join(''), 'fill="#5f8f52"');
      x += w + rand(14, 30);
    }
    return s;
  };
  const defs = [
    lin('wl', [[0, '#f1e5d2'], [1, '#dcc5a6']], [0, 0, 1, 0]), linU('sk', [[0, '#dcebec'], [1, '#f3f2e4']], 0, 100, 0, 720),
    lin('mc', [[0, '#e9ebed'], [.5, '#a9aeb3'], [1, '#d8dbde']], [0, 0, 1, 0]), lin('ct', [[0, '#8e5d3c'], [1, '#6e4529']]),
    lin('sb', [[0, '#fff3d6', .32], [1, '#fff3d6', 0]], [0, 0, 1, .6]),
    `<clipPath id="wn"><rect x="70" y="100" width="540" height="610"/></clipPath>`, blurF('bo', 10), gd1, gd2, gd3, grainF(.1),
  ].join('');
  const b = [
    rr(0, 0, W, H, 0, ' fill="url(#wl)"'),
    `<g clip-path="url(#wn)"><rect x="60" y="90" width="560" height="640" fill="url(#sk)"/><rect x="380" y="140" width="260" height="420" fill="#e3ddd0"/><g filter="url(#bo)">${blobs(outside, 3)}</g></g>`,
    P('M70 100h540v610H70zM250 100v610M430 100v610M70 300h540M70 500h540', 'fill="none" stroke="#2d2a26" stroke-width="16"'),
    rr(50, 708, 580, 18, 3, ' fill="#3a332c"'),
    P('M610 120L1100 1200H640L330 720Z', 'fill="url(#sb)"'),
    rr(720, 300, 840, 14, 2, ' fill="#7a5136"'), rr(720, 470, 840, 14, 2, ' fill="#7a5136"'), shelfItems(300), shelfItems(470),
    g1, g2, g3,
    // 吧台与咖啡机
    rr(880, 512, 340, 196, 26, ' fill="url(#mc)"'), rr(900, 486, 300, 30, 10, ' fill="#c9ccd0"'),
    ...[930, 990, 1050, 1110].map((x) => rr(x, 462, 44, 28, 6, ' fill="#fbf8f2"')),
    rr(900, 560, 300, 70, 10, ' fill="#33302d"'), `<circle cx="960" cy="545" r="16" fill="#fff" stroke="#555" stroke-width="4"/><circle cx="1140" cy="545" r="16" fill="#fff" stroke="#555" stroke-width="4"/>`,
    P('M940 630h60v18h-60zM1100 630h60v18h-60z', 'fill="#8d9297"'), P('M960 648l-70 22M1120 648l-70 22', 'stroke="#1f1d1b" stroke-width="16" stroke-linecap="round"'),
    rr(920, 690, 260, 16, 4, ' fill="#4a4643"'), P('M1210 560q30 40 10 120', 'fill="none" stroke="#9aa0a6" stroke-width="8"'),
    rr(1262, 590, 76, 118, 10, ' fill="#2c2b2a"'), P('M1256 510h88l-12 82h-64z', 'fill="#e8dfd2" fill-opacity=".7"'), P('M1262 550h76l-6 42h-64z', 'fill="#5a3520"'), rr(1250, 496, 100, 16, 6, ' fill="#2c2b2a"'),
    rr(1400, 650, 60, 56, 8, ' fill="#fbf8f2"'), P('M1480 708l6-70h56l6 70z', 'fill="url(#mc)"'),
    rr(640, 704, 980, 30, 6, ' fill="#efe7dc"'), rr(640, 732, 980, 470, 0, ' fill="url(#ct)"'), P(slats, 'stroke="#5e3b24" stroke-width="3" stroke-opacity=".6"'),
    pendant(820, 210, 0), pendant(1090, 210, 0), pendant(1360, 210, 0),
    // 前景小桌、拿铁、可颂
    rr(-40, 760, 680, 300, 0, ' fill="#b48a62" fill-opacity=".35"'),
    rr(-40, 1028, 690, 200, 10, ' fill="#a8794f"'), rr(-40, 1022, 690, 18, 8, ' fill="#c4956a"'),
    `<ellipse cx="300" cy="1040" rx="130" ry="30" fill="#f8f5ef"/><path d="M226 960h148l-14 74q-60 14-120 0z" fill="#fbf8f2"/><path d="M374 976q44 4 30 34q-8 14-36 14" fill="none" stroke="#fbf8f2" stroke-width="12"/>`,
    `<ellipse cx="300" cy="962" rx="74" ry="18" fill="#a8703f"/><path d="M300 950c-18-6-30 8-14 18 6 4 14 4 14 4s8 0 14-4c16-10 4-24-14-18z" fill="#f4e7d2"/>`,
    P('M440 1060q60-60 150-20q-20 40-150 20z', 'fill="#d99a4e"'), P('M470 1048q20-20 30 4M510 1036q14-20 26 6M550 1036q14-12 18 10', 'fill="none" stroke="#b5732f" stroke-width="5"'),
    grainE,
  ].join('');
  return [defs, b];
});

scene('room', 'interior', '#cdbfae', () => {
  let planks = '';
  for (let x = -900; x < 2500; x += 130) planks += `M${x} 1200L${n(800 + (x - 800) * .52)} 842`;
  const [gd, g] = glow('lg', 440, 360, 320, '#ffdca0', .6);
  let leaves = '', leaves2 = '';
  for (let i = 0; i < 16; i++) { const y = rand(380, 720), sg = i % 2 ? 1 : -1, l = leafD(180 + rand(-14, 14), y, -Math.PI / 2 + sg * rand(.4, 1.2), rand(100, 150), .36); if (i % 3) leaves += l; else leaves2 += l; }
  const defs = [
    lin('wl', [[0, '#ede8e1'], [1, '#e0d8cd']]), lin('fl', [[0, '#c79c70'], [1, '#a57850']]),
    lin('gl', [[0, '#cfe3ee'], [1, '#eef3ef']]), lin('sf', [[0, '#8a9eac'], [1, '#6d808d']]), lin('sc', [[0, '#9aadba'], [1, '#7f93a1']]),
    lin('cu', [[0, '#fff', .55], [.5, '#fff', .9], [1, '#fff', .5]], [0, 0, 1, 0]), lin('lp', [[0, '#fff7e8', .45], [1, '#fff7e8', 0]]),
    gd, ...vignette(.32).slice(0, 1), grainF(.1),
  ].join('');
  const b = [
    rr(0, 0, W, 842, 0, ' fill="url(#wl)"'), rr(0, 842, W, 360, 0, ' fill="url(#fl)"'), P(planks, 'stroke="#8f6644" stroke-opacity=".35" stroke-width="3"'),
    rr(0, 828, W, 16, 0, ' fill="#f4f0ea"'),
    rr(1180, 120, 360, 600, 0, ' fill="url(#gl)"'), P('M1210 600q60-140 140-60q60-120 160 10v120h-300z', 'fill="#b9d2c0" fill-opacity=".7"'),
    P('M1180 120h360v600h-360zM1360 120v600M1180 400h360', 'fill="none" stroke="#f8f6f2" stroke-width="16"'),
    P('M1100 92h500', 'stroke="#5a524a" stroke-width="6"'), rr(1120, 96, 110, 740, 0, ' fill="url(#cu)"'), rr(1500, 96, 110, 740, 0, ' fill="url(#cu)"'),
    P('M900 850L1500 850L1600 1200L1050 1200Z', 'fill="url(#lp)"'),
    // 墙上装饰画
    rr(560, 230, 340, 240, 4, ' fill="#3a3330"'), rr(576, 246, 308, 208, 0, ' fill="#f7f4ee"'), `<circle cx="780" cy="320" r="40" fill="#e2a35a"/>`, P('M600 430q80-90 150-30t140-20v54H600z', 'fill="#7f9a8f"'),
    rr(930, 300, 130, 170, 4, ' fill="#3a3330"'), rr(942, 312, 106, 146, 0, ' fill="#e9e1d4"'), P('M960 440q20-80 70-100', 'fill="none" stroke="#c46a4a" stroke-width="6"'),
    // 落地灯
    P('M180 1000V400Q190 300 440 330', 'fill="none" stroke="#2e2d2c" stroke-width="10"'), `<ellipse cx="180" cy="1000" rx="60" ry="14" fill="#2e2d2c"/>`,
    g, P('M380 344q60-70 120 0z', 'fill="#2e2d2c"'),
    // 绿植
    rr(110, 760, 140, 150, 18, ' fill="#ddd6ca"'), rr(110, 760, 140, 20, 8, ' fill="#cfc6b7"'), P('M180 770V360', 'stroke="#4a6b3c" stroke-width="6"'),
    P(leaves2, 'fill="#3d6b44"'), P(leaves, 'fill="#5b8c56"'),
    // 地毯与沙发
    `<ellipse cx="760" cy="1000" rx="560" ry="130" fill="#e8dfd2"/><ellipse cx="760" cy="1000" rx="520" ry="110" fill="none" stroke="#cdbfac" stroke-width="5"/>`,
    rr(340, 760, 820, 64, 12, ' fill="#62747f"'), P('M380 824v30M1120 824v30', 'stroke="#3a3330" stroke-width="12"'),
    rr(360, 520, 780, 200, 44, ' fill="url(#sf)"'), rr(410, 540, 330, 150, 30, ' fill="url(#sc)"'), rr(760, 540, 330, 150, 30, ' fill="url(#sc)"'),
    rr(400, 670, 700, 110, 26, ' fill="#899daa"'), P('M750 676v100', 'stroke="#6d808d" stroke-width="4"'),
    rr(320, 600, 110, 220, 40, ' fill="url(#sf)"'), rr(1070, 600, 110, 220, 40, ' fill="url(#sf)"'),
    `<rect x="440" y="590" width="130" height="110" rx="26" fill="#d6a240" transform="rotate(-8 505 645)"/><rect x="590" y="606" width="110" height="94" rx="24" fill="#efe6d6" transform="rotate(5 645 653)"/><rect x="930" y="592" width="128" height="108" rx="26" fill="#c46a4a" transform="rotate(7 994 646)"/>`,
    P('M1080 600q60 10 80 70l-20 170q-50-10-60-40z', 'fill="#d8cbb6"'),
    // 茶几
    P('M620 950l-30 90M900 950l30 90M760 960v90', 'stroke="#8a6440" stroke-width="10"'),
    `<ellipse cx="760" cy="946" rx="232" ry="50" fill="#a47a52"/><ellipse cx="760" cy="934" rx="232" ry="48" fill="#c79d6e"/>`,
    rr(620, 900, 130, 20, 4, ' fill="#3f5f6e"'), rr(630, 884, 110, 18, 4, ' fill="#e3c26b"'),
    P('M860 920q-20-50 10-60q30 10 10 60z', 'fill="#ece6dc"'), P('M870 862q-10-60-40-90M872 862q10-70 50-100', 'fill="none" stroke="#6b5a48" stroke-width="3"'),
    `<rect width="${W}" height="${H}" fill="url(#vg)"/>`,
    grainE,
  ].join('');
  return [defs, b];
});

const hotelRoom = (day) => () => {
  const [cityB, cityW] = skyline(1120, 1620, 700, 60, 300, 30, 70, day ? 0 : .22, [2, 12]);
  let seams = '', ch = '', folds = '';
  for (let x = 140; x < 1120; x += 140) seams += `M${x} 0V860`;
  for (let x = 274; x < 900; x += 36) ch += `M${x} 412V650`;
  for (let x = 1104; x < 1210; x += 18) folds += `M${x} 0V900`;
  const [gd1, g1] = glow('s1', 175, 600, 260, '#ffcf8a', .6), [gd2, g2] = glow('s2', 985, 600, 260, '#ffcf8a', .6);
  const lamp = (x) => `<rect x="${x - 10}" y="640" width="20" height="60" fill="#c9b08a"/><path d="M${x - 50} 640l14-80h72l14 80z" fill="#f6ead2"/>`;
  const defs = [
    day ? lin('wl', [[0, '#c9ae90'], [1, '#a88b6e']]) : lin('wl', [[0, '#7c6252'], [1, '#5c4738']]),
    day ? lin('sk', [[0, '#8fbbe3'], [.7, '#cfe2ef'], [1, '#eef2f0']]) : lin('sk', [[0, '#27356a'], [.55, '#7a67a0'], [.85, '#ee9f7a'], [1, '#f6c08f']]),
    day ? lin('rv', [[0, '#9fb6c6'], [1, '#6f8ea3']]) : lin('rv', [[0, '#5a5a8a'], [1, '#262a4f']]), lin('dv', [[0, '#ffffff'], [1, '#ebe8e2']]),
    day ? lin('cp', [[0, '#9a8676'], [1, '#76655a']]) : lin('cp', [[0, '#5b4b41'], [1, '#3d322b']]),
    lin('cu', [[0, '#a8957c'], [.5, '#c8b69c'], [1, '#9c8a72']], [0, 0, 1, 0]), gd1, gd2, ...vignette(day ? .18 : .35).slice(0, 1), grainF(.1),
  ].join('');
  const b = [
    rr(0, 0, 1130, 870, 0, ' fill="url(#wl)"'), P(seams, `stroke="${day ? '#9c8064' : '#4a382c'}" stroke-width="3"`),
    rr(1120, 0, 480, 870, 0, ' fill="url(#sk)"'), P(cityB, `fill="${day ? '#9aa9b8' : '#2b2c52'}"`), winP(cityW, '#ffd690', 4, 6), rr(1120, 700, 480, 170, 0, ' fill="url(#rv)"'),
    day ? '' : P('M1140 730h120M1300 760h200M1180 800h160', 'stroke="#ffd690" stroke-opacity=".35" stroke-width="4"'),
    P('M1370 0v870M1120 0v870', 'stroke="#c9c3bb" stroke-width="12"'),
    rr(1096, 0, 120, 900, 0, ' fill="url(#cu)"'), P(folds, 'stroke="#8a7864" stroke-opacity=".5" stroke-width="3"'),
    rr(0, 0, 1130, 26, 0, ' fill="#ffd9a0" fill-opacity=".35"'),
    rr(0, 860, W, 340, 0, ' fill="url(#cp)"'),
    g1, g2,
    rr(250, 400, 660, 270, 18, ' fill="#d8cbb8"'), P(ch, 'stroke="#c2b39e" stroke-width="3"'),
    rr(100, 700, 150, 170, 6, ' fill="#4a382c"'), rr(910, 700, 150, 170, 6, ' fill="#4a382c"'), lamp(175), lamp(985),
    P('M270 640H890L1000 900H160Z', 'fill="url(#dv)"'), P('M160 900H1000L994 1010H166Z', 'fill="#e2ded7"'),
    P('M262 700H898L914 744H246Z', 'fill="#f0ede7"'), P('M246 744H914', 'stroke="#d6d1c8" stroke-width="3"'),
    rr(300, 572, 270, 120, 30, ' fill="#fbfbf9"'), rr(590, 572, 270, 120, 30, ' fill="#fbfbf9"'),
    rr(340, 630, 210, 92, 24, ' fill="#f1eee8"'), rr(610, 630, 210, 92, 24, ' fill="#f1eee8"'), rr(530, 664, 100, 64, 16, ' fill="#7c5236"'),
    P('M206 820H954L1000 900H160Z', `fill="${day ? '#3f5f6e' : '#7c5236'}"`), P('M160 900H1000L997 952H163Z', `fill="${day ? '#344f5c' : '#6a4429'}"`), P('M190 852H970', 'stroke="#d9b874" stroke-width="3"'),
    `<rect width="${W}" height="${H}" fill="url(#vg)"/>`,
    grainE,
  ].join('');
  return [defs, b];
};
scene('hotel', 'interior', '#7a6252', hotelRoom(false));
scene('hotel-day', 'interior', '#c2a88c', hotelRoom(true));

scene('pool', 'interior', '#3c97b8', () => {
  // 室内泳池：透视水面、落地窗外的夜景、躺椅
  const VX = 800, VY = 520;
  const [cb, cw] = skyline(300, 1300, 560, 60, 260, 30, 70, .2, [2, 14]);
  let caus = '';
  for (let k = 0; k < 14; k++) { const t = (k + 1) / 15, y = lerp(600, 1200, t * t), hw = lerp(250, 760, t * t); let d = `M${n(VX - hw)} ${n(y)}`; for (let j = 0; j < 8; j++) d += `q${n(hw / 8)} ${n(rand(-14, 14) * t)} ${n(hw / 4)} 0`; caus += d; }
  let streak = '';
  for (let i = 0; i < 30; i++) { const x = rand(560, 1040), t = rand(), y = lerp(620, 1100, t); streak += rectD(VX + (x - VX) * (1 + t * 1.6), y, 3 + t * 6, 20 + t * 60); }
  const downs = Array.from({ length: 9 }, (_, i) => [200 + i * 150, 70 + Math.abs(i - 4) * 6]);
  const lounger = (x, y, s) => `<path d="M${x} ${y}l${n(160 * s)} 0l${n(40 * s)} ${n(-60 * s)}l${n(14 * s)} ${n(6 * s)}l${n(-36 * s)} ${n(70 * s)}l${n(-178 * s)} 0z" fill="#f4f1ea"/><path d="M${x + n(10 * s)} ${y + n(10 * s)}v${n(26 * s)}M${x + n(150 * s)} ${y + n(10 * s)}v${n(26 * s)}" stroke="#8a8378" stroke-width="${n(6 * s)}"/>`;
  const defs = [
    lin('cl', [[0, '#e9e6df'], [1, '#d6d1c7']]), lin('sk', [[0, '#16204a'], [.7, '#3a3a72'], [1, '#6a4a7a']]),
    linU('wt', [[0, '#7fd6ea'], [.35, '#3fb0d2'], [1, '#14709a']], 0, 560, 0, 1200), lin('dk', [[0, '#e3ddd2'], [1, '#c9c1b3']]), grainF(.1),
  ].join('');
  const b = [
    rr(0, 0, W, H, 0, ' fill="url(#cl)"'), dots(downs, '#fff8e4', 10), dots(downs, '#ffe7b0', 26, ' stroke-opacity=".25"'),
    rr(300, 150, 1000, 412, 0, ' fill="url(#sk)"'), P(cb, 'fill="#1e2448"'), winP(cw, '#ffd690', 4, 6),
    P('M300 150h1000v412H300zM550 150v412M800 150v412M1050 150v412', 'fill="none" stroke="#3a3530" stroke-width="12"'),
    P('M0 0L300 150V562L0 700ZM1600 0L1300 150V562L1600 700Z', 'fill="#cfc9be"'),
    P('M0 700L300 562H1300L1600 700V1200H0Z', 'fill="url(#dk)"'),
    P(`M${VX - 250} 600H${VX + 250}L${VX + 760} 1200H${VX - 760}Z`, 'fill="url(#wt)"'),
    P(caus, 'fill="none" stroke="#e6fbff" stroke-opacity=".35" stroke-width="3"'), P(streak, 'fill="#ffe7b0" fill-opacity=".35"'),
    P(`M${VX - 250} 600H${VX + 250}`, 'stroke="#f6f3ec" stroke-width="10"'),
    P('M1160 640v120M1190 640v120M1160 670h30M1160 700h30M1160 730h30', 'stroke="#d9dde0" stroke-width="6"'),
    lounger(1200, 760, .9), lounger(1290, 860, 1.1), lounger(1400, 990, 1.3),
    grainE,
  ].join('');
  return [defs, b];
});

scene('office', 'interior', '#d9dee3', () => {
  let blinds = '', books = '';
  for (let y = 100; y < 520; y += 22) blinds += `M0 ${y}h380`;
  for (let x = 1200; x < 1460;) { const w = rand(18, 34), h = rand(90, 130); books += `<rect x="${n(x)}" y="${n(250 - h)}" width="${n(w)}" height="${n(h)}" fill="${pick(['#c46a4a', '#3f5f6e', '#e3c26b', '#7f9a8f', '#2f3b4f', '#d9cbb6'])}"/>`; x += w + 2; }
  const bars = [.5, .72, .4, .86, .62, .95, .7].map((h, i) => rectD(530 + 120 + i * 30, 470 - h * 120, 18, h * 120)).join('');
  let snake = '';
  for (let i = 0; i < 9; i++) snake += leafD(190 + (i - 4) * 9, 650, -Math.PI / 2 + (i - 4) * .09, rand(170, 260), .1);
  const [gd, g] = glow('lg', 1430, 690, 240, '#ffe2a8', .5);
  const defs = [
    lin('wl', [[0, '#eef1f3'], [1, '#dfe4e8']]), lin('dk', [[0, '#dcbd94'], [1, '#c39d72']]), lin('wn', [[0, '#e7f1f6'], [1, '#fbfbf7']]),
    lin('lp', [[0, '#fffaf0', .5], [1, '#fffaf0', 0]], [0, 0, 1, .4]), gd, grainF(.08),
  ].join('');
  const b = [
    rr(0, 0, W, 780, 0, ' fill="url(#wl)"'),
    rr(0, 80, 380, 680, 0, ' fill="url(#wn)"'), P(blinds, 'stroke="#d5dadf" stroke-width="10"'), P('M380 80v680', 'stroke="#cfd5da" stroke-width="12"'),
    P('M380 120L900 780H380Z', 'fill="url(#lp)"'),
    rr(1180, 250, 380, 14, 2, ' fill="#b48b62"'), books, rr(1480, 196, 56, 54, 6, ' fill="#efe9df"'), P(leafD(1508, 200, -2, 60, .3) + leafD(1508, 200, -1.1, 60, .3), 'fill="#5b8c56"'),
    rr(-40, 760, W + 80, 460, 0, ' fill="url(#dk)"'), P('M-40 860q400-20 820 6t860-6M-40 990q500-30 900 8t740-8', 'fill="none" stroke="#b58d62" stroke-opacity=".35" stroke-width="4"'),
    // 显示器
    `<ellipse cx="800" cy="806" rx="130" ry="20" fill="#000" fill-opacity=".12"/><ellipse cx="800" cy="798" rx="120" ry="18" fill="#cfd2d6"/>`, rr(778, 620, 44, 180, 6, ' fill="#d6d9dd"'),
    rr(466, 226, 668, 418, 18, ' fill="#1b1c1f"'), rr(480, 240, 640, 390, 6, ' fill="#f5f6f8"'),
    rr(480, 240, 120, 390, 0, ' fill="#e7eaf0"'), ...[0, 1, 2, 3, 4].map((i) => rr(500, 290 + i * 40, 80, 14, 7, ` fill="${i === 1 ? '#4f7dff' : '#c9cfd9'}"`)),
    rr(620, 260, 480, 26, 6, ' fill="#ffffff"'),
    rr(620, 302, 230, 190, 12, ' fill="#ffffff"'), P(bars, 'fill="#4f7dff"'),
    rr(866, 302, 234, 190, 12, ' fill="#ffffff"'), P('M886 450l40-30 36 18 40-60 40 26 40-50', 'fill="none" stroke="#ff7a59" stroke-width="6" stroke-linejoin="round"'),
    rr(620, 508, 480, 106, 12, ' fill="#ffffff"'), `<circle cx="680" cy="561" r="32" fill="none" stroke="#e7eaf0" stroke-width="14"/><circle cx="680" cy="561" r="32" fill="none" stroke="#34c47c" stroke-width="14" stroke-dasharray="140 300" transform="rotate(-90 680 561)"/>`,
    rr(740, 540, 300, 14, 7, ' fill="#c9cfd9"'), rr(740, 568, 200, 14, 7, ' fill="#e1e5ec"'),
    // 键盘、鼠标、手机
    P('M560 840H1020L1040 910H540Z', 'fill="#e9eaec"'), P('M568 858h444M562 876h456M556 894h468', 'stroke="#cfd2d6" stroke-width="3"'),
    `<ellipse cx="1130" cy="878" rx="30" ry="44" fill="#f7f7f7"/>`, `<rect x="1190" y="900" width="64" height="120" rx="14" fill="#2a2c31" transform="rotate(-12 1222 960)"/>`,
    // 笔记本、马克杯、台灯、绿植
    `<path d="M230 880l230-30 30 120-230 34z" fill="#f8f6f1"/><path d="M262 900l170-22M266 920l170-22M270 940l170-22M274 960l120-16" stroke="#d3cec4" stroke-width="3"/><path d="M470 872l-90 120" stroke="#2f3b4f" stroke-width="8" stroke-linecap="round"/>`,
    rr(1270, 760, 90, 100, 14, ' fill="#2f5d62"'), P('M1360 780q34 0 30 30t-30 30', 'fill="none" stroke="#2f5d62" stroke-width="12"'), P('M1300 740q-10-30 10-50M1330 740q-10-30 10-50', 'fill="none" stroke="#fff" stroke-opacity=".7" stroke-width="5" stroke-linecap="round"'),
    g, `<ellipse cx="1470" cy="800" rx="60" ry="14" fill="#2c2e33"/><path d="M1470 800L1520 620L1400 560" fill="none" stroke="#2c2e33" stroke-width="10"/><path d="M1350 610l40-90 70 50z" fill="#2c2e33"/>`,
    rr(130, 700, 120, 110, 14, ' fill="#e9e2d6"'), P(snake, 'fill="#4c7d4b"'), P(snake.replace(/q/g, 'q'), 'fill="none" stroke="#c9d86a" stroke-width="3" stroke-opacity=".5"'),
    grainE,
  ].join('');
  return [defs, b];
});

// =====================================================================
// 美食
// =====================================================================
const woodGrain = (c, o = .4, k = 14) => { let d = ''; for (let i = 0; i < k; i++) { const y = (i + rand(0, .6)) * (H / k); d += `M-40 ${n(y)}q400 ${n(rand(-30, 30))} 820 ${n(rand(-10, 10))}t860 ${n(rand(-20, 20))}`; } return P(d, `fill="none" stroke="${c}" stroke-opacity="${o}" stroke-width="5"`); };
const shadowE = (cx, cy, rx, ry, o = .35) => `<ellipse cx="${n(cx)}" cy="${n(cy)}" rx="${n(rx)}" ry="${n(ry)}" fill="#000" fill-opacity="${o}" filter="url(#sh)"/>`;

scene('food-bowl', 'food', '#7a5236', () => {
  let nd = '';
  for (let i = 0; i < 20; i++) { let x = rand(520, 760), y = rand(640, 760); nd += `M${n(x)} ${n(y)}`; for (let j = 0; j < 4; j++) { const dx = rand(40, 70), dy = rand(20, 50); nd += `q${n(dx / 2)} ${n(rand(-30, 30))} ${n(dx)} ${n(dy)}`; } }
  const onion = [], oil = [];
  for (let i = 0; i < 34; i++) { const a = rand(0, 6.28), r = rand(40, 300); onion.push([800 + Math.cos(a) * r, 610 + Math.sin(a) * r]); }
  for (let i = 0; i < 40; i++) { const a = rand(0, 6.28), r = rand(60, 340); oil.push([800 + Math.cos(a) * r, 610 + Math.sin(a) * r, rand(4, 14), '#f7d496']); }
  const chashu = (x, y, r) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#8a4a2e"/><circle cx="${x}" cy="${y}" r="${r - 12}" fill="#d9987a"/><path d="M${x - r * .6} ${y - 10}q${n(r * .4)} -30 ${n(r * .9)} 6t${n(r * .4)} 20M${x - r * .4} ${y + r * .4}q${n(r * .4)} -20 ${n(r)} -6" fill="none" stroke="#f3d4c2" stroke-width="10" stroke-linecap="round"/>`;
  const egg = (x, y, deg) => `<g transform="rotate(${deg} ${x} ${y})"><ellipse cx="${x}" cy="${y}" rx="96" ry="72" fill="#fbf7ee"/><ellipse cx="${x}" cy="${y}" rx="54" ry="42" fill="#f08a17"/><ellipse cx="${x}" cy="${y}" rx="36" ry="26" fill="#ffb032"/></g>`;
  const defs = [
    lin('tb', [[0, '#6a4630'], [1, '#4a2f20']]), rad('br', [[0, '#eab873'], [.7, '#d99a52'], [1, '#bf7a38']]), rad('bw', [[.8, '#efe8dd'], [1, '#d9d0c2']]),
    lin('cs', [[0, '#d9a66c'], [1, '#a8713c']], [0, 0, 1, 0]), blurF('sh', 26), grainF(.12),
  ].join('');
  const b = [
    rr(0, 0, W, H, 0, ' fill="url(#tb)"'), woodGrain('#3a2418', .45),
    shadowE(840, 650, 470, 470, .45),
    `<circle cx="800" cy="610" r="452" fill="#f6f2ea"/><circle cx="800" cy="610" r="436" fill="none" stroke="#2f4a7a" stroke-width="12"/><circle cx="800" cy="610" r="404" fill="url(#bw)"/>`,
    `<circle cx="800" cy="610" r="362" fill="url(#br)"/>`, blobs(oil, 3, ' stroke-opacity=".7"'),
    P(nd, 'fill="none" stroke="#c99a45" stroke-width="18" stroke-linecap="round"'), P(nd, 'fill="none" stroke="#f3d27e" stroke-width="11" stroke-linecap="round"'),
    chashu(610, 470, 100), chashu(720, 400, 92), chashu(560, 590, 86),
    egg(990, 520, -20), egg(1040, 660, 25),
    `<path d="M830 240l130-30 36 190-130 30z" fill="#1d3124"/><path d="M846 250l100-24" stroke="#3c5a46" stroke-width="6"/>`,
    `<circle cx="900" cy="800" r="64" fill="#fbf7f1"/><path d="M900 800m-8 0a8 8 0 1 1 16 0a18 18 0 1 1 -32 0a30 30 0 1 1 52 6" fill="none" stroke="#e5728f" stroke-width="8"/>`,
    P('M1010 790l90 30-10 22-90-30zM1000 830l84 40-10 20-84-40zM1040 760l80 18-6 22-80-18z', 'fill="#c9a35c"'),
    dots(onion, '#5aa04a', 10), dots(onion.map(([x, y]) => [x + 1, y + 1]), '#d9f0b0', 4),
    P('M1560 90L960 780', 'stroke="#c8955c" stroke-width="22" stroke-linecap="round"'), P('M1600 160L1010 812', 'stroke="#b8844d" stroke-width="22" stroke-linecap="round"'),
    P('M1300 1030q60-60 140-30q30 40-30 80q-60 20-110-50z', 'fill="#f7f4ee"'), P('M1430 1010l160-70', 'stroke="#f7f4ee" stroke-width="30" stroke-linecap="round"'),
    grainE,
  ].join('');
  return [defs, b];
});

scene('food-table', 'food', '#8a6242', () => {
  const plate = (x, y, r, rim = '#ffffff', ring = '#e9e3d8') => shadowE(x + 18, y + 22, r, r, .3) + `<circle cx="${x}" cy="${y}" r="${r}" fill="${rim}"/><circle cx="${x}" cy="${y}" r="${n(r * .78)}" fill="${ring}"/>`;
  const fish = `<ellipse cx="800" cy="600" rx="350" ry="200" fill="#fff"/><ellipse cx="800" cy="600" rx="330" ry="182" fill="none" stroke="#3b5b8f" stroke-width="8"/><ellipse cx="800" cy="610" rx="270" ry="120" fill="#8a5a2e" fill-opacity=".45"/>` +
    `<path d="M560 600q60-90 230-90q140 0 230 70l70-50q-10 70 0 140l-70-50q-90 70-230 70q-170 0-230-90z" fill="url(#fs)"/><path d="M700 540q20 60 0 120M770 530q20 70 0 140M840 532q20 66 0 136M910 546q14 54 0 108" fill="none" stroke="#a8916f" stroke-width="5"/><circle cx="610" cy="586" r="10" fill="#3a2c22"/>`;
  let shreds = '', reds = '';
  for (let i = 0; i < 18; i++) { const x = rand(640, 980), y = rand(520, 680); shreds += `M${n(x)} ${n(y)}l${n(rand(30, 70))} ${n(rand(-20, 20))}`; }
  for (let i = 0; i < 6; i++) { const x = rand(660, 960), y = rand(540, 660); reds += `M${n(x)} ${n(y)}l${n(rand(26, 50))} ${n(rand(-16, 16))}`; }
  let pork = '';
  for (let i = 0; i < 9; i++) { const a = (i / 9) * 6.28 + rand(-.2, .2), r = i < 3 ? rand(20, 50) : rand(70, 110); pork += `<rect x="${n(320 + Math.cos(a) * r - 34)}" y="${n(290 + Math.sin(a) * r - 30)}" width="68" height="60" rx="14" fill="#9a3e22" transform="rotate(${n(rand(-30, 30))} ${n(320 + Math.cos(a) * r)} ${n(290 + Math.sin(a) * r)})"/>`; }
  let greens = '';
  for (let i = 0; i < 16; i++) { const a = rand(0, 6.28), r = rand(10, 120); greens += leafD(1280 + Math.cos(a) * r, 280 + Math.sin(a) * r, rand(0, 6.28), rand(70, 110), .3); }
  let egg = '';
  for (let i = 0; i < 7; i++) { const x = rand(250, 380), y = rand(870, 990); egg += `M${n(x)} ${n(y)}q30 -24 60 0t60 0`; }
  const dump = [];
  for (let i = 0; i < 6; i++) { const a = (i / 6) * 6.28, x = 1270 + Math.cos(a) * 90, y = 930 + Math.sin(a) * 90; dump.push(`<path d="M${n(x - 50)} ${n(y + 10)}q50 -70 100 0q-50 22 -100 0z" fill="#f4efe4" transform="rotate(${n((a * 180) / Math.PI + 90)} ${n(x)} ${n(y)})"/>`); }
  const rice = [];
  for (const [cx, cy] of [[730, 1080], [960, 1110]]) for (let i = 0; i < 26; i++) { const a = rand(0, 6.28), r = rand(0, 62); rice.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]); }
  const defs = [lin('tb', [[0, '#8a6242'], [1, '#6d4b31']]), lin('fs', [[0, '#e9dcc4'], [1, '#c8b494']]), blurF('sh', 16), grainF(.1)].join('');
  const b = [
    rr(0, 0, W, H, 0, ' fill="url(#tb)"'), woodGrain('#5a3d27', .4),
    shadowE(818, 622, 350, 200, .3), fish, P(shreds, 'fill="none" stroke="#8fc464" stroke-width="5" stroke-linecap="round"'), P(reds, 'fill="none" stroke="#e0402a" stroke-width="5" stroke-linecap="round"'),
    plate(320, 290, 210), pork, P('M200 230q30-40 60 0M420 360q30-40 60 0', 'fill="none" stroke="#6fae4a" stroke-width="12" stroke-linecap="round"'),
    plate(1280, 280, 200), P(greens, 'fill="#3f7a3a"'), P(greens, 'fill="none" stroke="#7fb05a" stroke-width="3"'),
    plate(320, 930, 180, '#ffffff', '#ffffff'), `<circle cx="320" cy="930" r="140" fill="#e2603a"/>`, P(egg, 'fill="none" stroke="#f6d35a" stroke-width="12" stroke-linecap="round"'),
    plate(1270, 930, 200, '#3a3a3e', '#2c2c30'), ...dump, `<circle cx="1440" cy="1120" r="60" fill="#fff"/><circle cx="1440" cy="1120" r="44" fill="#6a3a1c"/>`,
    plate(730, 1080, 96, '#ffffff', '#ffffff'), plate(960, 1110, 96, '#ffffff', '#ffffff'), dots(rice, '#f2eee6', 7), dots(rice.map(([x, y]) => [x + 2, y + 2]), '#ffffff', 4),
    P('M820 1180L1000 960M846 1192L1030 970', 'stroke="#2b1c14" stroke-width="12" stroke-linecap="round"'),
    plate(800, 150, 70), `<circle cx="800" cy="150" r="50" fill="#c4893a"/>`, plate(980, 120, 62), `<circle cx="980" cy="120" r="44" fill="#c4893a"/>`,
    grainE,
  ].join('');
  return [defs, b];
});

scene('coffee', 'food', '#d9cbb8', () => {
  const heart = (cx, cy, w, h) => `M${n(cx)} ${n(cy + h * .5)}C${n(cx - w * .62)} ${n(cy + h * .05)} ${n(cx - w * .5)} ${n(cy - h * .55)} ${n(cx)} ${n(cy - h * .18)}C${n(cx + w * .5)} ${n(cy - h * .55)} ${n(cx + w * .62)} ${n(cy + h * .05)} ${n(cx)} ${n(cy + h * .5)}Z`;
  let beans = '', seams = '';
  for (let i = 0; i < 14; i++) {
    const a = rand(0, 360), x = pick([rand(60, 300), rand(1300, 1560)]), y = rand(80, 1120), r = (a * Math.PI) / 180;
    beans += ellR(x, y, 34, 24, a); seams += `M${n(x - Math.cos(r) * 26)} ${n(y - Math.sin(r) * 26)}q${n(-Math.sin(r) * 10 + Math.cos(r) * 26)} ${n(Math.cos(r) * 10 + Math.sin(r) * 26)} ${n(Math.cos(r) * 52)} ${n(Math.sin(r) * 52)}`;
  }
  const defs = [
    rad('bg', [[0, '#f6efe4'], [1, '#d9cab5']], .3, .25, .9), rad('sc', [[.6, '#fbf9f5'], [1, '#e9e3d9']]), rad('cf', [[0, '#c98c52'], [.75, '#a8683a'], [1, '#6f4220']]),
    lin('sp', [[0, '#e9ebee'], [1, '#a9aeb4']]), blurF('sh', 24), grainF(.1),
  ].join('');
  const b = [
    rr(0, 0, W, H, 0, ' fill="url(#bg)"'),
    shadowE(830, 670, 400, 400, .25), `<circle cx="780" cy="620" r="400" fill="url(#sc)"/><circle cx="780" cy="620" r="300" fill="none" stroke="#e6dfd3" stroke-width="6"/>`,
    P('M440 860l-200 180', 'stroke="url(#sp)" stroke-width="22" stroke-linecap="round"'), `<ellipse cx="470" cy="830" rx="60" ry="40" fill="url(#sp)" transform="rotate(-42 470 830)"/>`,
    shadowE(820, 650, 260, 260, .3),
    `<path d="M1010 560h70q70 0 70 60t-70 60h-70v-34h66q34 0 34-26t-34-26h-66z" fill="#fbfaf6"/>`,
    `<circle cx="780" cy="620" r="252" fill="#fdfcf9"/><circle cx="780" cy="620" r="232" fill="#efe9df"/><circle cx="780" cy="620" r="214" fill="url(#cf)"/>`,
    `<circle cx="780" cy="620" r="168" fill="#c08048" fill-opacity=".5"/>`,
    P(heart(780, 720, 250, 200) + heart(780, 610, 196, 150) + heart(780, 518, 140, 108), 'fill="#f6ecdc"'),
    P(heart(780, 720, 200, 150) + heart(780, 610, 150, 110), 'fill="none" stroke="#c08a54" stroke-width="5" stroke-opacity=".5"'),
    P('M780 440V790', 'stroke="#c08a54" stroke-width="6" stroke-opacity=".6"'),
    P(beans, 'fill="#5a3520"'), P(seams, 'fill="none" stroke="#2a170c" stroke-width="5"'),
    `<circle cx="1340" cy="230" r="90" fill="#d8a868"/>`, dots([[1310, 200], [1370, 240], [1330, 270], [1360, 190], [1300, 250]], '#5a3520', 9),
    grainE,
  ].join('');
  return [defs, b];
});

scene('fruit', 'food', '#f3c9a6', () => {
  const orange = (x, y, r) => shadowE(x + 16, y + 20, r, r, .2) + `<circle cx="${x}" cy="${y}" r="${r}" fill="url(#or)"/><circle cx="${x + r * .1}" cy="${y - r * .05}" r="5" fill="#c9620f"/>`;
  const half = (x, y, r, rind, flesh, sep) => {
    let seg = '';
    for (let i = 0; i < 10; i++) { const a = (i / 10) * 6.28; seg += `M${x} ${y}l${n(Math.cos(a) * r * .8)} ${n(Math.sin(a) * r * .8)}`; }
    return shadowE(x + 16, y + 20, r, r, .2) + `<circle cx="${x}" cy="${y}" r="${r}" fill="${rind}"/><circle cx="${x}" cy="${y}" r="${n(r * .9)}" fill="${sep}"/><circle cx="${x}" cy="${y}" r="${n(r * .82)}" fill="${flesh}"/>` +
      P(seg, `stroke="${sep}" stroke-width="6"`) + `<circle cx="${x}" cy="${y}" r="10" fill="${sep}"/>`;
  };
  const grapes = [];
  for (let r = 0; r < 5; r++) for (let j = 0; j < 5 - r; j++) grapes.push([330 + (j - (4 - r) / 2) * 62 + rand(-6, 6), 300 + r * 56 + rand(-5, 5)]);
  const defs = [
    rad('bg', [[0, '#fbe6d3'], [1, '#f0c3a0']], .4, .35, .9), rad('or', [[0, '#ffc15a'], [.6, '#f6901f'], [1, '#d7680c']], .35, .3, .75),
    rad('lm', [[0, '#fff38a'], [.7, '#f5d63a'], [1, '#d9b41e']], .35, .3, .75), rad('ch', [[0, '#ff5a6a'], [.6, '#c0142c'], [1, '#7a0a1c']], .35, .3, .7),
    rad('gp', [[0, '#b884c9'], [.7, '#7a3e8a'], [1, '#55245f']], .35, .3, .7), blurF('sh', 18), grainF(.1),
  ].join('');
  const b = [
    rr(0, 0, W, H, 0, ' fill="url(#bg)"'),
    shadowE(340, 420, 190, 170, .18), ...grapes.map(([x, y]) => `<circle cx="${n(x)}" cy="${n(y)}" r="34" fill="url(#gp)"/>`), P('M330 270q6-50 40-80', 'fill="none" stroke="#5a7a2a" stroke-width="8"'),
    orange(690, 500, 220), orange(1290, 470, 180),
    P(leafD(760, 300, -.9, 170, .28) + leafD(760, 300, -2.2, 140, .28), 'fill="#4f8a3a"'), P('M760 300l60-80', 'stroke="#3a6a2a" stroke-width="4"'),
    half(1010, 830, 200, '#f28a1a', '#f9a43a', '#fde3b5'),
    shadowE(470, 930, 180, 120, .2), `<path d="${ellR(450, 910, 176, 122, -24)}" fill="url(#lm)"/>`,
    half(1430, 960, 130, '#4f8a2a', '#c6e27a', '#eaf6c4'),
    ...[[930, 180], [1010, 150], [180, 760], [250, 800]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="42" fill="url(#ch)"/>`),
    P('M930 142q20-80 50-110q10 40 30 78M180 722q20-80 50-110q10 40 20 188', 'fill="none" stroke="#5a7a2a" stroke-width="6"'),
    P(leafD(1120, 240, .5, 110, .3) + leafD(140, 1060, -.6, 100, .3) + leafD(1520, 700, -1.4, 100, .3) + leafD(720, 1110, 3.6, 100, .3), 'fill="#5f9a4a"'),
    grainE,
  ].join('');
  return [defs, b];
});

// 蒸笼小笼包（俯拍）；crab = 蟹粉（顶上一点橙色蟹黄）
const dimsum = (crab) => () => {
  const bun = (x, y, r) => {
    let pl = '';
    for (let i = 0; i < 14; i++) { const a = (i / 14) * 6.28; pl += `M${n(x + Math.cos(a) * r * .18)} ${n(y + Math.sin(a) * r * .18)}Q${n(x + Math.cos(a + .25) * r * .6)} ${n(y + Math.sin(a + .25) * r * .6)} ${n(x + Math.cos(a + .1) * r * .92)} ${n(y + Math.sin(a + .1) * r * .92)}`; }
    return `<circle cx="${n(x)}" cy="${n(y)}" r="${n(r)}" fill="url(#bn)"/>` + P(pl, 'fill="none" stroke="#d9cdb8" stroke-width="5"') + `<circle cx="${n(x)}" cy="${n(y)}" r="${n(r * .16)}" fill="${crab ? '#f08a24' : '#efe4d0'}"/>`;
  };
  let slats = '';
  for (let r = 380; r > 60; r -= 34) slats += circD(800, 620, r);
  const pos = crab ? [[800, 620], [640, 520], [960, 520], [640, 730], [960, 730], [800, 410]] : [[800, 620], [620, 500], [800, 420], [980, 500], [620, 740], [800, 820], [980, 740], [800, 620]];
  const defs = [lin('tb', [[0, '#4a3a30'], [1, '#2f241d']]), rad('bn', [[0, '#fffdf8'], [.7, '#f6efe2'], [1, '#e2d5bf']], .42, .38, .62), lin('st', [[0, '#d9b67a'], [1, '#b98f52']], [0, 0, 1, 1]), blurF('sh', 24), grainF(.1)].join('');
  const b = [
    rr(0, 0, W, H, 0, ' fill="url(#tb)"'), woodGrain('#1f1712', .4),
    shadowE(840, 660, 470, 470, .45), `<circle cx="800" cy="620" r="470" fill="url(#st)"/><circle cx="800" cy="620" r="440" fill="none" stroke="#a37a44" stroke-width="10"/><circle cx="800" cy="620" r="410" fill="#e9dcc0"/>`,
    P(slats, 'fill="none" stroke="#d4c29e" stroke-width="3"'),
    ...(crab ? pos : pos.slice(1)).map(([x, y]) => bun(x, y, crab ? 128 : 112)),
    `<ellipse cx="1360" cy="1000" rx="150" ry="120" fill="#f4f1ea"/><ellipse cx="1360" cy="1000" rx="120" ry="94" fill="#3a1f12"/>` + P('M1300 980l40-20M1330 1010l50-10M1360 970l40 10M1390 1010l30-24', 'stroke="#e8c070" stroke-width="7" stroke-linecap="round"'),
    P('M1500 120L1100 420M1540 160L1140 460', 'stroke="#c8955c" stroke-width="20" stroke-linecap="round"'),
    grainE,
  ].join('');
  return [defs, b];
};
scene('dimsum', 'food', '#c9a46a', dimsum(false));
scene('dimsum-crab', 'food', '#c9a46a', dimsum(true));

scene('shengjian', 'food', '#3a3330', () => {
  const pos = [[640, 480], [860, 440], [1060, 540], [560, 700], [790, 680], [1010, 760], [700, 900], [920, 960]];
  const ses = [], scal = [];
  for (const [x, y] of pos) { for (let i = 0; i < 9; i++) ses.push([x + rand(-60, 60), y + rand(-50, 50)]); for (let i = 0; i < 4; i++) scal.push([x + rand(-50, 50), y + rand(-40, 40)]); }
  const defs = [lin('tb', [[0, '#d8cfc2'], [1, '#b9ad9c']]), rad('pn', [[0, '#3a3836'], [.85, '#232220'], [1, '#121110']]), rad('bn', [[0, '#fffaf0'], [.6, '#f3e6cd'], [.85, '#e2b86e'], [1, '#c2843a']], .45, .42, .6), blurF('sh', 24), grainF(.1)].join('');
  const b = [
    rr(0, 0, W, H, 0, ' fill="url(#tb)"'),
    shadowE(840, 700, 520, 520, .4), `<path d="M1260 520l340-120" stroke="#1b1a19" stroke-width="60" stroke-linecap="round"/>`,
    `<circle cx="800" cy="680" r="520" fill="url(#pn)"/><circle cx="800" cy="680" r="470" fill="#2b2927"/><circle cx="800" cy="680" r="520" fill="none" stroke="#4a4744" stroke-width="8"/>`,
    ...pos.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="124" fill="url(#bn)"/>`),
    dots(ses, '#2b2216', 3.5), dots(ses.map(([x, y]) => [x + 2, y - 2]), '#fff6e0', 2.2), dots(scal, '#4f9a3c', 8),
    grainE,
  ].join('');
  return [defs, b];
});

scene('wonton', 'food', '#6e5a48', () => {
  const won = (x, y, deg) => `<g transform="rotate(${deg} ${x} ${y})"><path d="M${x - 90} ${y + 10}q30-70 90-60q70 10 90 60q-30 40-90 30q-60 10-90-30z" fill="#f6efe2"/><path d="M${x - 40} ${y - 20}q40 30 80 0M${x - 60} ${y + 14}q60 20 120 0" fill="none" stroke="#e0d2bb" stroke-width="5"/><ellipse cx="${x}" cy="${y + 2}" rx="34" ry="22" fill="#e8c9b4" fill-opacity=".7"/></g>`;
  const shrimp = [], onion = [];
  for (let i = 0; i < 26; i++) { const a = rand(0, 6.28), r = rand(40, 320); shrimp.push([800 + Math.cos(a) * r, 610 + Math.sin(a) * r]); }
  for (let i = 0; i < 26; i++) { const a = rand(0, 6.28), r = rand(40, 320); onion.push([800 + Math.cos(a) * r, 610 + Math.sin(a) * r]); }
  let nori = '';
  for (let i = 0; i < 8; i++) { const a = rand(0, 6.28), r = rand(80, 300); nori += ellR(800 + Math.cos(a) * r, 610 + Math.sin(a) * r, rand(30, 60), rand(12, 22), rand(0, 180)); }
  const defs = [lin('tb', [[0, '#7a6450'], [1, '#5a4636']]), rad('br', [[0, '#e9d7b0'], [1, '#c9ab76']]), rad('bw', [[.8, '#efe8dd'], [1, '#d9d0c2']]), blurF('sh', 26), grainF(.1)].join('');
  const b = [
    rr(0, 0, W, H, 0, ' fill="url(#tb)"'), woodGrain('#4a382a', .4), shadowE(840, 650, 460, 460, .4),
    `<circle cx="800" cy="610" r="452" fill="#f6f2ea"/><circle cx="800" cy="610" r="436" fill="none" stroke="#b9473a" stroke-width="10"/><circle cx="800" cy="610" r="404" fill="url(#bw)"/><circle cx="800" cy="610" r="362" fill="url(#br)"/>`,
    P(nori, 'fill="#1d2a22" fill-opacity=".8"'),
    won(700, 500, -20), won(910, 470, 15), won(640, 680, 30), won(860, 650, -10), won(1000, 760, 40), won(760, 820, -30),
    dots(shrimp, '#e98a5a', 7), dots(onion, '#5aa04a', 9),
    P('M1300 1030q60-60 140-30q30 40-30 80q-60 20-110-50z', 'fill="#f7f4ee"'), P('M1430 1010l160-70', 'stroke="#f7f4ee" stroke-width="30" stroke-linecap="round"'),
    grainE,
  ].join('');
  return [defs, b];
});

// =====================================================================
// 产品（透明背景，影棚底色由 CSS 提供；studio = [浅色中心, 浅色边缘, 深色中心, 深色边缘]）
// =====================================================================
const floor = (cx, y, rx, o = .3) => `<ellipse cx="${cx}" cy="${y}" rx="${rx}" ry="${n(rx * .12)}" fill="#000" fill-opacity="${o * .6}" filter="url(#fs)"/><ellipse cx="${cx}" cy="${y - 4}" rx="${n(rx * .8)}" ry="${n(rx * .05)}" fill="#000" fill-opacity="${o}" filter="url(#fc)"/>`;
const floorDefs = () => blurF('fs', 30) + blurF('fc', 8);
const sheen = (id, o = .14) => lin(id, [[0, '#fff', 0], [.42, '#fff', 0], [.5, '#fff', o], [.62, '#fff', 0], [1, '#fff', 0]], [0, 0, 1, 1]);

const phone = (pal) => () => {
  const x = 610, y = 190, w = 380, h = 800, r = 72;
  const lens = (cx, cy) => `<circle cx="${cx}" cy="${cy}" r="50" fill="url(#lr)"/><circle cx="${cx}" cy="${cy}" r="40" fill="#0c0d10"/><circle cx="${cx}" cy="${cy}" r="30" fill="url(#ln)"/><circle cx="${cx - 9}" cy="${cy - 10}" r="7" fill="#fff" fill-opacity=".55"/><path d="M${cx + 8} ${cy + 22}a24 24 0 0 0 16-20" fill="none" stroke="#7a8cff" stroke-opacity=".5" stroke-width="4"/>`;
  const defs = [
    lin('pb', [[0, pal[0]], [.55, pal[1]], [1, pal[2]]], [0, 0, 1, 1]), lin('pf', [[0, pal[3]], [.5, tint(pal[3], .35)], [1, pal[3]]], [0, 0, 1, 0]),
    lin('pl', [[0, tint(pal[1], .12)], [1, tint(pal[1], -.06)]], [0, 0, 1, 1]), lin('lr', [[0, tint(pal[3], .3)], [1, tint(pal[3], -.25)]], [0, 0, 1, 1]),
    rad('ln', [[0, '#3b4a72'], [.55, '#0d1222'], [1, '#05060a']], .4, .35, .65), sheen('sn', .16), floorDefs(),
  ].join('');
  const b = [
    floor(800, 1010, 230),
    rr(x - 9, y - 9, w + 18, h + 18, r + 9, ' fill="url(#pf)"'), rr(x, y, w, h, r, ' fill="url(#pb)"'), rr(x, y, w, h, r, ' fill="url(#sn)"'),
    P(`M${x - 13} ${y + 170}h5v64h-5zM${x - 13} ${y + 260}h5v100h-5zM${x + w + 8} ${y + 220}h5v130h-5z`, `fill="${tint(pal[3], -.1)}"`),
    rr(x + 26, y + 26, 232, 240, 60, ' fill="url(#pl)"'), rr(x + 26, y + 26, 232, 240, 60, ` fill="none" stroke="${tint(pal[1], .25)}" stroke-width="3"`),
    lens(x + 92, y + 94), lens(x + 92, y + 200), lens(x + 194, y + 147),
    `<circle cx="${x + 194}" cy="${y + 62}" r="15" fill="#f3eedf"/><circle cx="${x + 194}" cy="${y + 232}" r="13" fill="#15161a"/><circle cx="${x + 150}" cy="${y + 64}" r="4" fill="#15161a"/>`,
    `<circle cx="${x + w / 2}" cy="${y + h / 2 + 20}" r="36" fill="none" stroke="${tint(pal[1], .3)}" stroke-width="7" stroke-opacity=".7"/><circle cx="${x + w / 2 + 16}" cy="${y + h / 2 + 4}" r="8" fill="${tint(pal[1], .3)}" fill-opacity=".7"/>`,
  ].join('');
  return [defs, b];
};
const STUDIO = {
  warm: ['#fbf3ec', '#e9d8c8', '#2b2521', '#100d0b'], cool: ['#f3f5f8', '#d9dfe7', '#23272e', '#0c0e12'], lilac: ['#f7f3fb', '#e2d9ee', '#27232f', '#0f0d13'],
  grey: ['#f4f4f2', '#dcdbd7', '#262629', '#0e0e10'], peach: ['#f8efe7', '#e8d5c4', '#28221e', '#100d0b'], sage: ['#f2f4f0', '#dbe0d8', '#222621', '#0c0e0c'],
};
scene('phone-orange', 'product', '#ead9c9', phone(['#f7a35a', '#ee7a2e', '#d65f1a', '#c9763e']), { studio: STUDIO.warm });
scene('phone-dark', 'product', '#d9dfe7', phone(['#46536b', '#2c3648', '#1c2331', '#56607a']), { studio: STUDIO.cool });
scene('phone-purple', 'product', '#e2d9ee', phone(['#d9cbee', '#b8a3dc', '#9c86c6', '#c2b2de']), { studio: STUDIO.lilac });
scene('phone-white', 'product', '#dcdbd7', phone(['#fbfaf7', '#e9e7e2', '#d6d3cc', '#d9d6cf']), { studio: STUDIO.grey });

scene('watch', 'product', '#d9dfe7', () => {
  const ring = (r, c, f) => `<circle cx="800" cy="610" r="${r}" fill="none" stroke="${c}" stroke-opacity=".25" stroke-width="26"/><circle cx="800" cy="610" r="${r}" fill="none" stroke="${c}" stroke-width="26" stroke-linecap="round" stroke-dasharray="${n(2 * Math.PI * r * f)} 2000" transform="rotate(-90 800 610)"/>`;
  let holes = '';
  for (let yy = 940; yy < 1200; yy += 46) holes += circD(800, yy, 7);
  const defs = [
    lin('bd', [[0, '#7f98b2'], [.3, '#a7bdd2'], [.5, '#b6cadc'], [.8, '#93acc4'], [1, '#7690aa']], [0, 0, 1, 0]),
    lin('cs', [[0, '#f4ede2'], [.45, '#d8ccb9'], [.7, '#efe6d8'], [1, '#c9bba5']], [0, 0, 1, 1]), lin('gl', [[0, '#fff', .18], [.4, '#fff', 0]], [0, 0, .6, 1]), floorDefs(),
  ].join('');
  const b = [
    floor(800, 1150, 180, .2),
    P('M664 470L680 -40H920L936 470Z', 'fill="url(#bd)"'), P('M664 760L676 1240H924L936 760Z', 'fill="url(#bd)"'), P(holes, 'fill="#5f7790"'),
    P('M664 470h272', 'stroke="#000" stroke-opacity=".12" stroke-width="10"'),
    rr(984, 494, 34, 92, 12, ' fill="#d3c6b2"'), P('M992 500v80M1000 500v80M1008 500v80', 'stroke="#b7a891" stroke-width="3"'), rr(990, 620, 20, 96, 8, ' fill="#cfc2ad"'),
    rr(608, 378, 384, 464, 112, ' fill="url(#cs)"'), rr(632, 402, 336, 416, 92, ' fill="#08090b"'),
    ring(140, '#fa114f', .78), ring(108, '#9cff3a', .62), ring(76, '#16e6f0', .9),
    `<circle cx="700" cy="460" r="8" fill="#fff" fill-opacity=".7"/><circle cx="900" cy="460" r="8" fill="#ff9f0a"/>`,
    rr(632, 402, 336, 416, 92, ' fill="url(#gl)"'),
  ].join('');
  return [defs, b];
}, { studio: STUDIO.cool });

scene('headphones', 'product', '#d9dfe7', () => {
  const cup = (x) => `<rect x="${x}" y="540" width="250" height="360" rx="118" fill="url(#cp)"/><rect x="${x + 26}" y="570" width="198" height="300" rx="96" fill="none" stroke="#fff" stroke-opacity=".25" stroke-width="4"/>`;
  const defs = [
    lin('cp', [[0, '#c5d6e5'], [.45, '#a3bad0'], [1, '#7d97b1']], [0, 0, 1, 1]), linU('hb', [[0, '#e9eef2'], [1, '#b9c6d2']], 0, 180, 0, 600),
    lin('st', [[0, '#d7dce1'], [.5, '#ffffff'], [1, '#a9b1ba']], [0, 0, 1, 0]), floorDefs(),
  ].join('');
  const b = [
    floor(800, 960, 420, .25),
    P('M480 600C470 260 640 150 800 150S1130 260 1120 600', 'fill="none" stroke="url(#hb)" stroke-width="64" stroke-linecap="round"'),
    P('M520 600C512 300 660 200 800 200S1088 300 1080 600', 'fill="none" stroke="#9fb2c5" stroke-width="30" stroke-dasharray="3 7"'),
    rr(486, 470, 26, 120, 12, ' fill="url(#st)"'), rr(1088, 470, 26, 120, 12, ' fill="url(#st)"'),
    cup(380), cup(970),
    rr(1150, 590, 28, 60, 10, ' fill="#c9d3dc"'), rr(1154, 680, 20, 50, 8, ' fill="#8ea3b8"'),
    P('M412 620q-20 120 10 230M1188 620q20 120-10 230', 'fill="none" stroke="#fff" stroke-opacity=".35" stroke-width="10" stroke-linecap="round"'),
  ].join('');
  return [defs, b];
}, { studio: STUDIO.cool });

scene('earbuds', 'product', '#dcdbd7', () => {
  const bud = (x, y, deg) => `<g transform="rotate(${deg} ${x} ${y})"><rect x="${x - 26}" y="${y + 20}" width="52" height="250" rx="26" fill="url(#bw)"/><rect x="${x - 24}" y="${y + 236}" width="48" height="34" rx="20" fill="#c9cdd2"/><ellipse cx="${x}" cy="${y}" rx="78" ry="70" fill="url(#bw)"/><ellipse cx="${x - 24}" cy="${y - 4}" rx="24" ry="30" fill="#2a2c30"/><circle cx="${x + 30}" cy="${y + 26}" r="6" fill="#2a2c30"/></g>`;
  const defs = [
    lin('cw', [[0, '#ffffff'], [.6, '#f1f1f2'], [1, '#d9dadd']]), lin('bw', [[0, '#ffffff'], [.6, '#eeeff1'], [1, '#d3d5d9']], [0, 0, 1, 1]),
    radU('ld', [[0, '#3ad06b', .9], [1, '#3ad06b', 0]], 800, 710, 26), floorDefs(),
  ].join('');
  const b = [
    floor(800, 850, 280, .25), floor(430, 960, 90, .2), floor(1170, 960, 90, .2),
    rr(590, 480, 420, 360, 140, ' fill="url(#cw)"'), P('M596 610H1004', 'stroke="#cfd1d6" stroke-width="4"'),
    `<rect x="770" y="690" width="60" height="40" fill="url(#ld)"/><circle cx="800" cy="710" r="7" fill="#3ad06b"/>`,
    rr(590, 480, 420, 360, 140, ' fill="none" stroke="#fff" stroke-width="6" stroke-opacity=".8"'),
    bud(420, 640, 14), bud(1180, 640, -14),
  ].join('');
  return [defs, b];
}, { studio: STUDIO.grey });

const wallpaper = (id, c) => lin(id, [[0, c[0]], [.5, c[1]], [1, c[2]]], [0, 0, 1, 1]);
scene('laptop', 'product', '#d9dfe7', () => {
  const defs = [
    wallpaper('wp', ['#2b1f73', '#c2408f', '#ffb36b']), lin('al', [[0, '#e3e6ea'], [1, '#b8bdc4']]), lin('bs', [[0, '#d4d8dd'], [.5, '#eef0f2'], [1, '#c3c8ce']], [0, 0, 1, 0]), floorDefs(),
  ].join('');
  const b = [
    floor(800, 840, 600, .25),
    rr(364, 214, 872, 566, 28, ' fill="url(#al)"'), rr(374, 224, 852, 546, 22, ' fill="#0d0e10"'), rr(392, 244, 816, 508, 6, ' fill="url(#wp)"'),
    P('M392 600q200-160 420-60t396-100v312H392z', 'fill="#ff7a8a" fill-opacity=".45"'), P('M392 680q260-120 460-30t356-60v162H392z', 'fill="#ffd27a" fill-opacity=".5"'),
    rr(760, 224, 80, 20, 8, ' fill="#0d0e10"'),
    P('M300 778H1300L1340 812Q1340 820 1330 820H270Q260 820 260 812Z', 'fill="url(#bs)"'), P('M720 780h160q-10 14-30 14h-100q-20 0-30-14z', 'fill="#a9aeb5"'),
  ].join('');
  return [defs, b];
}, { studio: STUDIO.cool });

scene('tablet', 'product', '#e2ddd3', () => {
  const defs = [
    wallpaper('wp', ['#0f6d7a', '#3fb3a8', '#c5ead2']), lin('fr', [[0, '#efe9df'], [1, '#cfc6b8']]), lin('pc', [[0, '#ffffff'], [1, '#dcdcdc']]), floorDefs(),
    `<clipPath id="sc"><rect x="330" y="280" width="940" height="640" rx="28"/></clipPath>`,
  ].join('');
  const b = [
    floor(800, 960, 540, .22),
    rr(296, 246, 1008, 708, 56, ' fill="url(#fr)"'), rr(306, 256, 988, 688, 48, ' fill="#0d0e10"'), rr(330, 280, 940, 640, 28, ' fill="url(#wp)"'),
    `<g clip-path="url(#sc)"><circle cx="560" cy="520" r="220" fill="#ffffff" fill-opacity=".14"/><circle cx="1060" cy="760" r="300" fill="#0b4d57" fill-opacity=".35"/>`,
    P('M330 760q300-140 520-40t420-60v260H330z', 'fill="#0b5560" fill-opacity=".45"') + '</g>',
    `<circle cx="800" cy="268" r="6" fill="#26292e"/>`,
    rr(520, 226, 560, 22, 11, ' fill="url(#pc)"'), P('M1080 237l26-8v16z', 'fill="#cfcfcf"'),
  ].join('');
  return [defs, b];
}, { studio: STUDIO.grey });

scene('speaker', 'product', '#e8d5c4', () => {
  const defs = [
    lin('sp', [[0, '#cfc8bf'], [.3, '#f3eee8'], [.55, '#e9e3db'], [1, '#bdb5ab']], [0, 0, 1, 0]),
    `<pattern id="mesh" width="14" height="14" patternUnits="userSpaceOnUse"><circle cx="7" cy="7" r="2.6" fill="#000" fill-opacity=".09"/></pattern>`,
    rad('tp', [[0, '#ffffff'], [.6, '#efe8e0'], [1, '#d8d0c6']]), rad('sw', [[0, '#ff6aa8'], [.45, '#8a5cff', .9], [.8, '#2bc4ff', .5], [1, '#2bc4ff', 0]], .45, .45, .5), floorDefs(),
  ].join('');
  const b = [
    floor(800, 960, 260, .3),
    P('M590 360V820Q590 960 800 960T1010 820V360Z', 'fill="url(#sp)"'), P('M590 360V820Q590 960 800 960T1010 820V360Z', 'fill="url(#mesh)"'),
    `<ellipse cx="800" cy="360" rx="210" ry="44" fill="url(#tp)"/><ellipse cx="800" cy="360" rx="120" ry="24" fill="url(#sw)"/>`,
    P('M752 360h20M828 360h20M838 350v20', 'stroke="#fff" stroke-width="5" stroke-opacity=".8"'),
  ].join('');
  return [defs, b];
}, { studio: STUDIO.peach });

scene('bedding', 'product', '#e0dbd2', () => {
  let stripes = '';
  for (let x = 120; x < 1500; x += 52) stripes += `M${x} 560L${n(800 + (x - 800) * 1.3)} 1000`;
  const defs = [
    lin('hd', [[0, '#d9d4cc'], [1, '#c3bcb1']]), lin('dv', [[0, '#f3f2ef'], [1, '#dddbd6']]), lin('df', [[0, '#d6d3cd'], [1, '#c4c0b9']]),
    `<clipPath id="dc"><path d="M380 640H1220L1310 860H290Z"/><path d="M290 860H1310L1300 990H300Z"/></clipPath>`, floorDefs(),
  ].join('');
  const b = [
    floor(800, 1060, 560, .25),
    rr(330, 300, 940, 360, 60, ' fill="url(#hd)"'), P('M390 340V640M1210 340V640', 'stroke="#b5ad9f" stroke-width="3"'),
    P('M380 640H1220L1310 860H290Z', 'fill="url(#dv)"'), P('M290 860H1310L1300 990H300Z', 'fill="url(#df)"'),
    `<g clip-path="url(#dc)">${P(stripes, 'stroke="#9aa1a8" stroke-opacity=".2" stroke-width="10"')}</g>`,
    P('M372 690H1228L1250 744H350Z', 'fill="#e9e8e4"'), P('M350 744H1250', 'stroke="#c9c6bf" stroke-width="3"'),
    rr(420, 520, 360, 150, 46, ' fill="#fbfaf8"'), rr(820, 520, 360, 150, 46, ' fill="#fbfaf8"'),
    rr(470, 590, 300, 120, 38, ' fill="#a4abb2"'), rr(830, 590, 300, 120, 38, ' fill="#a4abb2"'),
    P('M470 620h300M830 620h300M470 650h300M830 650h300M470 680h300M830 680h300', 'stroke="#fff" stroke-opacity=".35" stroke-width="6"'),
    P('M330 800H1270L1308 880H292Z', 'fill="#8b939b"'), P('M292 880H1308L1304 940H296Z', 'fill="#7c848c"'),
    P('M340 1000v40M1260 1000v40', 'stroke="#6b5a48" stroke-width="16"'),
  ].join('');
  return [defs, b];
}, { studio: STUDIO.grey });

scene('jacket', 'product', '#dcdfd9', () => {
  const half = [[800, 150], [900, 164], [962, 226], [978, 300], [968, 336], [1110, 386], [1180, 470], [1300, 880], [1222, 920], [1120, 600], [1076, 560], [1086, 1030], [800, 1056]];
  const outline = poly([...half, ...half.slice(1, -1).reverse().map(([x, y]) => [1600 - x, y])]);
  const defs = [
    lin('jk', [[0, '#ec6a48'], [.5, '#de5333'], [1, '#c2412a']], [0, 0, 1, 1]), `<clipPath id="jc"><path d="${outline}"/></clipPath>`, floorDefs(),
  ].join('');
  const b = [
    floor(800, 1090, 520, .2),
    `<path d="${outline}" fill="url(#jk)"/>`,
    `<g clip-path="url(#jc)"><path d="M300 440Q800 560 1300 440L1300 100H300Z" fill="#a8371f"/><path d="M300 440Q800 560 1300 440" fill="none" stroke="#fff" stroke-opacity=".25" stroke-width="4"/>` +
    `<path d="M560 600L520 880M1040 600L1080 880" stroke="#000" stroke-opacity=".12" stroke-width="5"/><path d="M1210 880L1300 860M390 880L300 860" stroke="#7a2a18" stroke-width="40"/></g>`,
    `<ellipse cx="800" cy="262" rx="98" ry="78" fill="#3a1f18"/><path d="M702 262q98-140 196 0" fill="none" stroke="#a8371f" stroke-width="22"/>`,
    P('M800 340V1052', 'stroke="#2b2b2b" stroke-width="14"'), P('M800 340V1052', 'stroke="#555" stroke-width="8" stroke-dasharray="4 4"'), rr(788, 360, 24, 50, 6, ' fill="#f2c84b"'),
    P('M880 520L990 640M720 760L620 900M880 760L980 900', 'stroke="#2b2b2b" stroke-width="6"'), rr(984, 632, 12, 30, 4, ' fill="#f2c84b"'),
    P('M840 480l20-30 20 30z', 'fill="#fff" fill-opacity=".85"'),
    P('M760 1040v30M840 1040v30', 'stroke="#2b2b2b" stroke-width="5"'), `<circle cx="760" cy="1078" r="9" fill="#2b2b2b"/><circle cx="840" cy="1078" r="9" fill="#2b2b2b"/>`,
  ].join('');
  return [defs, b];
}, { studio: STUDIO.sage });

scene('mug', 'product', '#d9dfe7', () => {
  const defs = [
    lin('bd', [[0, '#5e7487'], [.22, '#a9bccd'], [.38, '#c5d4e0'], [.7, '#8197ab'], [1, '#56697b']], [0, 0, 1, 0]),
    lin('ld', [[0, '#a7adb3'], [.3, '#f2f4f6'], [.6, '#c9ced3'], [1, '#8f969c']], [0, 0, 1, 0]), floorDefs(),
  ].join('');
  const b = [
    floor(800, 1010, 210, .3),
    P('M676 386H924L912 960Q912 1004 800 1004T688 960Z', 'fill="url(#bd)"'),
    P('M690 960Q690 990 800 992T910 960', 'fill="none" stroke="#000" stroke-opacity=".15" stroke-width="6"'),
    rr(690, 300, 220, 96, 22, ' fill="url(#ld)"'), rr(676, 380, 248, 22, 8, ' fill="#7d8389"'),
    P('M740 300Q740 180 800 180T860 300', 'fill="none" stroke="#8f969c" stroke-width="22"'),
    P('M720 450V900', 'stroke="#fff" stroke-opacity=".35" stroke-width="14" stroke-linecap="round"'),
    P('M780 640l20-34 20 34z', 'fill="#fff" fill-opacity=".7"'),
  ].join('');
  return [defs, b];
}, { studio: STUDIO.cool });

scene('nuts', 'product', '#e8dac4', () => {
  const nut = (x, y, k, deg) => k === 0 ? `<path d="${ellR(x, y, 34, 20, deg)}" fill="#a96a3c"/>`
    : k === 1 ? `<path d="M${x - 30} ${y}q10-40 50-30q20 8 10 24q-20-10-36 10q-14 14-24-4z" fill="#e3c08a" transform="rotate(${deg} ${x} ${y})"/>`
      : `<circle cx="${x}" cy="${y}" r="30" fill="#b98a52"/><path d="M${x - 18} ${y - 8}q10 10 18 0t18 4M${x - 16} ${y + 10}q10-8 18 2t16-2" fill="none" stroke="#8a5f30" stroke-width="5"/>`;
  let win = '', spill = '';
  for (let i = 0; i < 18; i++) win += nut(rand(690, 910), rand(600, 740), i % 3, n(rand(0, 180)));
  for (let i = 0; i < 12; i++) spill += nut(rand(380, 1220), rand(1000, 1080), i % 3, n(rand(0, 180)));
  const defs = [
    lin('kr', [[0, '#d7ab74'], [.5, '#c99a62'], [1, '#ad7f4a']], [0, 0, 1, 0]), `<clipPath id="wn"><rect x="660" y="580" width="280" height="180" rx="30"/></clipPath>`, floorDefs(),
  ].join('');
  const b = [
    floor(800, 990, 300, .3),
    P('M560 260H1040L1060 900Q1062 970 1000 976H600Q538 970 540 900Z', 'fill="url(#kr)"'),
    rr(556, 230, 488, 60, 8, ' fill="#c3955f"'), P('M556 300H1044', 'stroke="#9a6d3c" stroke-width="5"'), P('M556 246l14 10-14 10M1044 246l-14 10 14 10', 'fill="#f6efe2"'),
    rr(610, 380, 380, 440, 26, ' fill="#f6efe2"'), rr(610, 380, 380, 120, 26, ' fill="#3e6b4a"'), rr(610, 470, 380, 30, 0, ' fill="#3e6b4a"'),
    P(leafD(800, 470, -2.1, 70, .35) + leafD(800, 470, -1.05, 70, .35), 'fill="#bfe0a0"'),
    rr(660, 580, 280, 180, 30, ' fill="#efe2cc"'), `<g clip-path="url(#wn)">${win}</g>`, rr(660, 580, 280, 180, 30, ' fill="none" stroke="#fff" stroke-opacity=".6" stroke-width="4"'),
    rr(680, 780, 240, 14, 7, ' fill="#c9b796"'),
    P('M570 300V900M1030 300V900', 'stroke="#000" stroke-opacity=".08" stroke-width="20"'),
    spill,
  ].join('');
  return [defs, b];
}, { studio: STUDIO.peach });

scene('charger', 'product', '#dcdbd7', () => {
  const defs = [lin('fr', [[0, '#ffffff'], [1, '#e4e5e8']]), lin('tp', [[0, '#ffffff'], [1, '#f0f1f3']]), lin('sd', [[0, '#d9dbdf'], [1, '#c4c7cc']]), lin('pn', [[0, '#e9ebee'], [.5, '#ffffff'], [1, '#b9bec4']], [0, 0, 1, 0]), floorDefs()].join('');
  const b = [
    floor(780, 900, 330, .28),
    P('M940 860C1120 860 1180 980 1360 960S1560 900 1640 920', 'fill="none" stroke="#f4f4f5" stroke-width="26" stroke-linecap="round"'),
    P('M940 860C1120 860 1180 980 1360 960S1560 900 1640 920', 'fill="none" stroke="#d6d8dc" stroke-width="26" stroke-dasharray="2 10"'),
    P('M560 440L640 380H1060L980 440Z', 'fill="url(#tp)"'), P('M980 440L1060 380V820L980 880Z', 'fill="url(#sd)"'), rr(560, 440, 420, 440, 46, ' fill="url(#fr)"'),
    rr(700, 360, 36, 70, 6, ' fill="url(#pn)"'), rr(860, 360, 36, 70, 6, ' fill="url(#pn)"'),
    rr(700, 600, 140, 46, 23, ' fill="#2a2c30"'), rr(700, 690, 140, 46, 23, ' fill="#2a2c30"'), rr(724, 614, 92, 18, 9, ' fill="#55595f"'), rr(724, 704, 92, 18, 9, ' fill="#55595f"'),
    P('M770 520l14-10 14 10z', 'fill="#c9ccd1"'),
  ].join('');
  return [defs, b];
}, { studio: STUDIO.grey });

scene('pillow', 'product', '#dcdbd7', () => {
  const top = 'M300 640C340 480 560 470 640 560C720 640 880 640 960 560C1040 470 1260 480 1300 640';
  const defs = [lin('fc', [[0, '#fbfaf6'], [1, '#e6e2d8']]), lin('tp', [[0, '#ffffff'], [1, '#f1eee6']]),
    `<pattern id="ho" width="40" height="40" patternUnits="userSpaceOnUse"><circle cx="20" cy="20" r="6" fill="#d9d3c5"/></pattern>`, floorDefs()].join('');
  const b = [
    floor(800, 860, 560, .25),
    `<path d="${top}L1300 820Q800 880 300 820Z" fill="url(#fc)"/><path d="${top}L1300 820Q800 880 300 820Z" fill="url(#ho)" opacity=".6"/>`,
    `<path d="${top}" fill="none" stroke="#fff" stroke-width="16"/><path d="M300 640Q800 700 1300 640" fill="none" stroke="#000" stroke-opacity=".05" stroke-width="40"/>`,
    P('M300 820Q800 880 1300 820', 'fill="none" stroke="#cfc8b8" stroke-width="5"'),
  ].join('');
  return [defs, b];
}, { studio: STUDIO.grey });

// =====================================================================
// 人物（半身剪影，不画五官）
// =====================================================================
const HAIR = {
  short: { front: 'M666 480C640 320 740 268 820 276C920 286 962 360 936 480C930 430 912 400 880 388C830 404 760 400 712 392C690 410 676 440 666 480Z' },
  long: { back: 'M650 420C630 300 720 250 800 250C900 250 980 320 960 440C950 560 990 700 1010 870C960 890 880 890 856 866C896 744 904 640 900 560L700 560C696 640 704 744 744 866C720 890 640 890 590 870C610 700 650 560 650 420Z', front: 'M668 470C660 330 740 280 820 282C920 288 960 360 940 470C900 380 820 360 760 380C730 400 690 430 668 470Z' },
  bun: { bun: [800, 290, 74], front: 'M670 460C660 330 740 296 800 296C870 296 940 330 930 460C900 384 850 356 800 356C750 356 700 384 670 460Z' },
  bob: { back: 'M640 430C630 300 720 260 800 260C880 260 970 300 960 430C960 520 970 600 990 650C930 672 880 662 860 640L740 640C720 662 670 672 610 650C630 600 640 520 640 430Z', front: 'M668 430C670 320 740 280 800 280C860 280 930 320 932 430C900 412 860 404 800 404C740 404 700 412 668 430Z' },
};
const person = (o) => () => {
  const sk = o.skin, sh = tint(sk, -.2), hl = tint(sk, .14), hc = o.hair;
  let back = '', front = '';
  if (o.style === 'curly') {
    const c = [];
    for (let i = 0; i < 22; i++) { const a = Math.PI * (.9 + (i / 21) * 1.2), r = rand(60, 86); c.push([800 + Math.cos(a) * 200, 450 + Math.sin(a) * 190, r, hc]); }
    back = blobs(c, 3) + `<ellipse cx="800" cy="420" rx="210" ry="200" fill="${hc}"/>`;
    const f = [];
    for (let i = 0; i < 9; i++) { const a = Math.PI * (1.15 + (i / 8) * .7); f.push([800 + Math.cos(a) * 128, 470 + Math.sin(a) * 150, 34, tint(hc, .06)]); }
    front = blobs(f, 2);
  } else {
    const h = HAIR[o.style === 'grey' ? 'short' : o.style];
    if (h.back) back = `<path d="${h.back}" fill="url(#hr)"/>`;
    if (h.bun) front += `<circle cx="${h.bun[0]}" cy="${h.bun[1]}" r="${h.bun[2]}" fill="url(#hr)"/>`;
    front += `<path d="${h.front}" fill="url(#hr)"/><path d="${h.front}" fill="none" stroke="#fff" stroke-opacity=".08" stroke-width="6"/>`;
  }
  const neck = { crew: `<path d="M700 806Q800 870 900 806" fill="none" stroke="${tint(o.top, -.28)}" stroke-width="16"/>`,
    turtle: `<path d="M726 820V730Q726 700 760 696H840Q874 700 874 730V820Q800 850 726 820Z" fill="${tint(o.top, .08)}"/><path d="M730 748q70 18 140 0M730 778q70 18 140 0" fill="none" stroke="${tint(o.top, -.25)}" stroke-width="5"/>`,
    collar: `<path d="M720 790L800 900L760 820ZM880 790L800 900L840 820Z" fill="${tint(o.top, .2)}"/><path d="M700 800L800 900L900 800L860 780L800 860L740 780Z" fill="${tint(o.top, .15)}"/><path d="M800 900V1240" stroke="${tint(o.top, -.25)}" stroke-width="4"/>`,
    v: `<path d="M720 800L800 920L880 800Z" fill="${sh}"/><path d="M712 796L800 924L888 796" fill="none" stroke="${tint(o.top, -.18)}" stroke-width="10"/>` }[o.neck];
  const defs = [
    rad('bg', [[0, o.bg[0]], [1, o.bg[1]]], .5, .32, .9), rad('fc', [[0, hl], [.62, sk], [1, sh]], .42, .36, .72),
    lin('tp', [[0, tint(o.top, .12)], [1, tint(o.top, -.22)]]), lin('hr', [[0, tint(hc, .16)], [1, tint(hc, -.14)]]),
    `<clipPath id="hc"><ellipse cx="800" cy="470" rx="130" ry="162"/></clipPath>`, grainF(.1),
  ].join('');
  const b = [
    rr(0, 0, W, H, 0, ' fill="url(#bg)"'), `<circle cx="760" cy="520" r="430" fill="#fff" fill-opacity=".14"/>`,
    '<g transform="translate(800 560) scale(1.22) translate(-800 -560)">',
    back,
    P('M750 590V720Q800 760 850 720V590Z', `fill="${sh}"`),
    `<g transform="translate(0 -56)">${P('M330 1300C350 960 520 842 700 806Q800 790 900 806C1080 842 1250 960 1270 1300Z', 'fill="url(#tp)"')}${neck}</g>`,
    `<ellipse cx="672" cy="492" rx="20" ry="34" fill="${tint(sk, -.06)}"/><ellipse cx="928" cy="492" rx="20" ry="34" fill="${sh}"/>`,
    `<ellipse cx="800" cy="470" rx="130" ry="162" fill="url(#fc)"/>`,
    `<g clip-path="url(#hc)"><ellipse cx="930" cy="520" rx="100" ry="200" fill="${sh}" fill-opacity=".35"/><ellipse cx="744" cy="548" rx="30" ry="16" fill="#e8706a" fill-opacity=".12"/><ellipse cx="856" cy="548" rx="30" ry="16" fill="#e8706a" fill-opacity=".1"/></g>`,
    o.style === 'long' ? `<path d="${HAIR.long.back}" fill="url(#hr)" clip-path="url(#sd)"/>` : '',
    front,
    o.glasses ? `<g fill="none" stroke="#2b2b2b" stroke-width="7"><rect x="704" y="456" width="84" height="62" rx="22"/><rect x="812" y="456" width="84" height="62" rx="22"/><path d="M788 482q12-8 24 0M704 478l-30-6M896 478l30-6"/></g>` : '',
    '</g>',
    grainE,
  ].join('');
  return [defs.replace('</clipPath>', '</clipPath><clipPath id="sd"><path d="M560 560H700V900H560ZM900 560H1040V900H900Z"/></clipPath>'), b];
};
scene('person-1', 'person', '#a9c1e0', person({ bg: ['#e0eaf6', '#a7bfdf'], skin: '#f1c7a5', hair: '#1f1a17', top: '#2f3e5c', style: 'short', neck: 'crew' }));
scene('person-2', 'person', '#f0b99a', person({ bg: ['#fde6d6', '#efb594'], skin: '#d9a07a', hair: '#3b2418', top: '#efe4d2', style: 'long', neck: 'v' }));
scene('person-3', 'person', '#a9d2bb', person({ bg: ['#e4f2ea', '#a6d0b8'], skin: '#f3d0b5', hair: '#2a1c16', top: '#7f9f84', style: 'bun', neck: 'crew' }));
scene('person-4', 'person', '#bca8e0', person({ bg: ['#efe6f8', '#b9a4de'], skin: '#8a5a3c', hair: '#1c1410', top: '#d9a43a', style: 'curly', neck: 'crew' }));
scene('person-5', 'person', '#f2d77e', person({ bg: ['#fcf3d6', '#f0d47a'], skin: '#e8b896', hair: '#141418', top: '#26262a', style: 'bob', neck: 'turtle' }));
scene('person-6', 'person', '#d9a184', person({ bg: ['#f7e3d6', '#d69e80'], skin: '#c98f6a', hair: '#bdbcb8', top: '#5b7ea6', style: 'grey', neck: 'collar', glasses: true }));

// =====================================================================
// 专辑封面（方形构图，主体在中间 1200×1200 内）
// =====================================================================
scene('album-1', 'album', '#e9a08e', () => {
  let st = '';
  for (let y = 620; y < 1000; y += 22 + (y - 600) * .06) st += rectD(400, y, 800, 3 + (y - 600) * .012);
  const defs = [lin('sk', [[0, '#f9d0a8'], [.6, '#f2a08f'], [1, '#e48b86']]), lin('se', [[0, '#3a7b8b'], [1, '#143a52']]), `<clipPath id="c"><circle cx="800" cy="600" r="380"/></clipPath>`, grainF(.22)].join('');
  const b = [
    rr(0, 0, W, H, 0, ' fill="#efe7da"'),
    `<g clip-path="url(#c)"><rect x="400" y="200" width="800" height="420" fill="url(#sk)"/><circle cx="800" cy="600" r="120" fill="#fff2d8"/><rect x="400" y="600" width="800" height="420" fill="url(#se)"/>${P(st, 'fill="#9fd0d4" fill-opacity=".25"')}${P('M760 620h80M740 650h120M770 690h60', 'stroke="#ffe7c2" stroke-opacity=".7" stroke-width="5"')}</g>`,
    `<circle cx="800" cy="600" r="420" fill="none" stroke="#cfc4b2" stroke-width="3"/>`,
    grainE,
  ].join('');
  return [defs, b];
});
scene('album-2', 'album', '#f6d3c4', () => {
  const defs = [rad('bg', [[0, '#fbf5ec'], [1, '#f1e4d4']]), grainF(.18)].join('');
  const b = [
    rr(0, 0, W, H, 0, ' fill="url(#bg)"'),
    `<g style="mix-blend-mode:multiply" opacity=".85"><circle cx="660" cy="500" r="290" fill="#ff9fb2"/><circle cx="940" cy="520" r="290" fill="#ffc27a"/><circle cx="800" cy="760" r="290" fill="#b9a7ff"/></g>`,
    `<circle cx="800" cy="590" r="40" fill="#fff" fill-opacity=".85"/>`, P('M300 1040h1000', 'stroke="#2b2b2b" stroke-opacity=".5" stroke-width="3"'),
    grainE,
  ].join('');
  return [defs, b];
});
scene('album-3', 'album', '#7e3a86', () => {
  const cols = ['#ffd27a', '#ffab5e', '#ff7a59', '#e8507a', '#b8407e', '#7e3a86', '#4f2f74'];
  let arcs = '';
  cols.forEach((c, i) => { const r = 120 + i * 62; arcs += `<path d="M${800 - r} 900A${r} ${r} 0 0 1 ${800 + r} 900" fill="none" stroke="${c}" stroke-width="54"/>`; });
  const b = [
    rr(0, 0, W, H, 0, ' fill="#2a1430"'), `<circle cx="800" cy="900" r="96" fill="#fff0c8"/>`, arcs,
    rr(0, 900, W, 300, 0, ' fill="#1a0c20"'), P('M560 940h480M620 980h360M680 1020h240', 'stroke="#ffab5e" stroke-opacity=".35" stroke-width="6"'),
    grainE,
  ].join('');
  return [grainF(.18), b];
});
scene('album-4', 'album', '#3a0f4f', () => {
  let grid = '';
  for (let i = -12; i <= 12; i++) grid += `M800 720L${800 + i * 140} 1200`;
  for (let k = 1; k < 9; k++) { const y = 720 + k * k * 7; grid += `M0 ${y}H1600`; }
  let bars = '';
  for (let k = 0; k < 6; k++) bars += rectD(500, 600 + k * 24, 600, 6 + k * 3);
  const defs = [lin('bg', [[0, '#0d0827'], [.6, '#36104d'], [1, '#160629']]), lin('sn', [[0, '#ffe07a'], [.5, '#ff8a5c'], [1, '#ff3d8b']]), blurF('gl', 6), grainF(.16)].join('');
  const b = [
    rr(0, 0, W, H, 0, ' fill="url(#bg)"'), dots(Array.from({ length: 40 }, () => [rand(0, W), rand(0, 560)]), '#fff', 1.6, ' stroke-opacity=".6"'),
    `<circle cx="800" cy="560" r="260" fill="url(#sn)"/>`, P(bars, 'fill="#1f0a36"'),
    P('M200 720l120-60 80 30 120-80 100 60 80-20 100 70H200zM900 720l110-50 90 30 130-70 110 60 60 30z', 'fill="#1b0b33"'),
    rr(0, 720, W, 480, 0, ' fill="#14062a"'),
    `<g filter="url(#gl)" opacity=".8">${P(grid, 'fill="none" stroke="#ff4fd8" stroke-width="6"')}</g>`, P(grid, 'fill="none" stroke="#ffb3f2" stroke-width="2"'),
    grainE,
  ].join('');
  return [defs, b];
});
scene('album-5', 'album', '#22356e', () => {
  const cr = [[820, 400, 40], [980, 520, 60], [880, 640, 30], [1040, 380, 24], [760, 560, 22]];
  const defs = [lin('bg', [[0, '#0b1636'], [1, '#2b3d7a']]), rad('mn', [[0, '#fffaf0'], [.8, '#efe8d6'], [1, '#d9d0bd']], .42, .4, .6), rad('gw', [[0, '#cfd8ff', .35], [1, '#cfd8ff', 0]]), grainF(.14)].join('');
  const b = [
    rr(0, 0, W, H, 0, ' fill="url(#bg)"'), dots(Array.from({ length: 60 }, () => [rand(0, W), rand(0, 800)]), '#fff', 1.6, ' stroke-opacity=".7"'),
    `<circle cx="900" cy="500" r="520" fill="url(#gw)"/><circle cx="900" cy="500" r="250" fill="url(#mn)"/>`, P(cr.map(([x, y, r]) => circD(x, y, r)).join(''), 'fill="#c9c0aa" fill-opacity=".35"'),
    P(area(jag([[-40, 860], [300, 700], [520, 800], [760, 660], [1000, 780], [1260, 690], [1640, 820]], .08, 3)), 'fill="#1c2a5c"'),
    P(area(jag([[-40, 960], [260, 860], [600, 940], [900, 840], [1200, 930], [1640, 880]], .08, 3)), 'fill="#121c42"'),
    P(area([[-40, 1060], [400, 1010], [800, 1050], [1200, 1000], [1640, 1040]], H, true), 'fill="#0a1130"'),
    grainE,
  ].join('');
  return [defs, b];
});
scene('album-6', 'album', '#163f46', () => {
  const bok = [];
  for (let i = 0; i < 24; i++) bok.push([rand(150, 1450), rand(100, 1100), rand(40, 140), pick(['#3fb3a8', '#7ad3c0', '#f2b866', '#2a7f8a', '#a8e6cf'])]);
  let rain = '';
  for (let i = 0; i < 70; i++) { const x = rand(0, W + 200), y = rand(-100, H), l = rand(40, 120); rain += `M${n(x)} ${n(y)}l${n(-l * .25)} ${n(l)}`; }
  const defs = [lin('bg', [[0, '#123a40'], [1, '#08202a']]), blurF('bk', 30), grainF(.16)].join('');
  const b = [rr(0, 0, W, H, 0, ' fill="url(#bg)"'), `<g filter="url(#bk)" opacity=".75">${blobs(bok, 4)}</g>`, P(rain, 'stroke="#e6fffa" stroke-opacity=".3" stroke-width="3" stroke-linecap="round"'), grainE].join('');
  return [defs, b];
});
scene('album-7', 'album', '#e8a93a', () => {
  const b = [
    rr(0, 0, W, H, 0, ' fill="#f1e9da"'),
    `<clipPath id="q"><rect x="220" y="20" width="1160" height="1160"/></clipPath>`,
    `<g clip-path="url(#q)"><circle cx="1180" cy="1060" r="420" fill="#23305a"/><rect x="900" y="180" width="300" height="440" fill="#e8a93a"/><circle cx="640" cy="470" r="230" fill="#d9452b"/><path d="M260 1100A240 240 0 0 1 740 1100Z" fill="#2f8f83"/></g>`,
    P('M220 680H1380M900 20V1180', 'stroke="#1b1b1b" stroke-width="6"'), `<circle cx="900" cy="680" r="34" fill="#1b1b1b"/>`,
    grainE,
  ].join('');
  return [grainF(.2), b];
});
scene('album-8', 'album', '#2b2a8f', () => {
  const defs = [rad('bg', [[0, '#2a1d5c'], [1, '#07070f']], .5, .5, .7), rad('sp', [[0, '#ffffff'], [.18, '#f6d3ff'], [.5, '#9a6bff'], [.82, '#2c2b93'], [1, '#121042']], .5, .5, .55, .36, .3),
    linU('rg', [[0, '#fff', .1], [.5, '#ffd6f6', .9], [1, '#fff', .1]], 340, 0, 1260, 0), grainF(.14)].join('');
  const ring = (sweep) => `<path d="M340 640A460 110 -16 0 ${sweep} 1260 560" fill="none" stroke="url(#rg)" stroke-width="10"/>`;
  const b = [rr(0, 0, W, H, 0, ' fill="url(#bg)"'), ring(0), `<circle cx="800" cy="600" r="300" fill="url(#sp)"/>`, `<circle cx="800" cy="600" r="300" fill="none" stroke="#ff9be8" stroke-opacity=".35" stroke-width="4"/>`, ring(1), grainE].join('');
  return [defs, b];
});

// =====================================================================
// 抽象（流体渐变 + 几何，适合横幅和头图）
// =====================================================================
const fluid = (bg, spots, sd = 110) => blobs(spots.map(([x, y, r, c]) => [x, y, r, c]), 3);
scene('abstract-1', 'abstract', '#3b2a8a', () => {
  let wv = '';
  for (let k = 0; k < 9; k++) { const p = []; for (let x = -40; x <= W + 200; x += 160) p.push([x, 700 + k * 26 + 120 * Math.sin(x / 300 + k * .25)]); wv += smooth(p); }
  const defs = [blurF('bl', 110), grainF(.16)].join('');
  const b = [rr(0, 0, W, H, 0, ' fill="#1b1446"'), `<g filter="url(#bl)">${fluid(0, [[380, 380, 360, '#4f6bff'], [1150, 300, 380, '#c04bff'], [900, 900, 400, '#ff5fa2'], [260, 1000, 320, '#2fd0ff']])}</g>`,
    P(wv, 'fill="none" stroke="#fff" stroke-opacity=".22" stroke-width="2"'), grainE].join('');
  return [defs, b];
});
scene('abstract-2', 'abstract', '#ff8a5c', () => {
  const defs = [blurF('bl', 120), grainF(.16)].join('');
  const b = [rr(0, 0, W, H, 0, ' fill="#ff8a5c"'), `<g filter="url(#bl)">${fluid(0, [[300, 300, 380, '#ffd36b'], [1200, 380, 400, '#ff5f6d'], [700, 1000, 420, '#ffb3a0'], [1400, 1000, 360, '#c94b7a']])}</g>`,
    `<circle cx="1080" cy="560" r="270" fill="#fff" fill-opacity=".12" stroke="#fff" stroke-opacity=".55" stroke-width="3"/><circle cx="560" cy="760" r="140" fill="#fff" fill-opacity=".1" stroke="#fff" stroke-opacity=".5" stroke-width="3"/><circle cx="1300" cy="300" r="60" fill="#fff" fill-opacity=".25"/>`, grainE].join('');
  return [defs, b];
});
scene('abstract-3', 'abstract', '#14605a', () => {
  const cols = [['#1d7a6e', '#155c55'], ['#2a9a7e', '#1b7466'], ['#47b98a', '#2a9378'], ['#7fd3a0', '#4fb48a'], ['#c3ecc4', '#8fd3a8']];
  let defsW = '', bodyW = '';
  cols.forEach(([a, c], k) => { const p = []; for (let x = -60; x <= W + 200; x += 160) p.push([x, 360 + k * 170 + 70 * Math.sin(x / 260 + k * 1.3)]); defsW += lin('w' + k, [[0, a], [1, c]]); bodyW += P(area(p, H, true), `fill="url(#w${k})"`); });
  const defs = [defsW, `<pattern id="dt" width="40" height="40" patternUnits="userSpaceOnUse"><circle cx="20" cy="20" r="3" fill="#fff" fill-opacity=".3"/></pattern>`, grainF(.12)].join('');
  const b = [rr(0, 0, W, H, 0, ' fill="#0f3d3e"'), rr(1000, 60, 520, 320, 0, ' fill="url(#dt)"'), `<circle cx="420" cy="260" r="110" fill="#c3ecc4" fill-opacity=".9"/>`, bodyW, grainE].join('');
  return [defs, b];
});
scene('abstract-4', 'abstract', '#0b1433', () => {
  let rings = '', grid = '';
  for (let r = 120; r <= 720; r += 100) rings += `<circle cx="1100" cy="600" r="${r}" fill="none" stroke="#5b7cff" stroke-opacity="${d1(.6 - r / 1600)}" stroke-width="2"/>`;
  for (let x = 0; x <= W; x += 80) grid += `M${x} 0V${H}`;
  for (let y = 0; y <= H; y += 80) grid += `M0 ${y}H${W}`;
  const nodes = Array.from({ length: 14 }, (_, i) => { const r = 120 + (i % 7) * 100, a = rand(0, 6.28); return [1100 + Math.cos(a) * r, 600 + Math.sin(a) * r]; });
  const defs = [blurF('bl', 80), grainF(.12)].join('');
  const b = [rr(0, 0, W, H, 0, ' fill="#060b1f"'), P(grid, 'stroke="#5b7cff" stroke-opacity=".08" stroke-width="2"'),
    `<g filter="url(#bl)">${fluid(0, [[1100, 600, 260, '#3d6bff'], [500, 300, 220, '#8a5cff'], [400, 1000, 200, '#20d5ff']])}</g>`, rings,
    `<circle cx="1100" cy="600" r="60" fill="#cfe0ff"/>`, dots(nodes, '#9fd8ff', 6), grainE].join('');
  return [defs, b];
});
scene('abstract-5', 'abstract', '#d9cdf5', () => {
  const defs = [lin('bg', [[0, '#efe8fd'], [1, '#cbbdf2']]), rad('s1', [[0, '#ffe3d6'], [.6, '#ffa7a0'], [1, '#e8768a']], .38, .32, .7),
    linU('t1', [[0, '#9fd8ff'], [1, '#5d7cf0']], 930, 250, 1270, 590), lin('p1', [[0, '#b9f3df'], [1, '#5fcfb0']], [0, 0, 1, 1]), lin('c1', [[0, '#ffe58a'], [1, '#f5b83d']]), blurF('sh', 26), grainF(.1)].join('');
  const b = [rr(0, 0, W, H, 0, ' fill="url(#bg)"'),
    shadowE(520, 760, 200, 40, .18), `<circle cx="500" cy="520" r="200" fill="url(#s1)"/>`,
    shadowE(1110, 650, 200, 36, .15), `<circle cx="1100" cy="420" r="170" fill="none" stroke="url(#t1)" stroke-width="90"/>`,
    shadowE(920, 960, 220, 34, .15), `<rect x="720" y="760" width="400" height="150" rx="75" fill="url(#p1)" transform="rotate(-18 920 835)"/>`,
    `<path d="M300 1000l90-170 90 170z" fill="url(#c1)"/>`, `<circle cx="1360" cy="900" r="46" fill="#fff" fill-opacity=".8"/>`, grainE].join('');
  return [defs, b];
});
scene('abstract-6', 'abstract', '#1a6d8f', () => {
  const cols = ['#0e4a66', '#14607f', '#1d7898', '#3092ae', '#55afc2', '#8fd0d8', '#c9ecee'];
  let body = '';
  cols.forEach((c, k) => { const p = []; for (let x = -60; x <= W + 240; x += 200) p.push([x, 140 + k * 150 + 90 * Math.sin(x / 300 + k * .9)]); body += P(area(p, H, true), `fill="${c}" filter="url(#ds)"`); });
  const defs = [`<filter id="ds" x="-5%" y="-20%" width="110%" height="140%"><feDropShadow dx="0" dy="-10" stdDeviation="14" flood-color="#04263a" flood-opacity=".35"/></filter>`, grainF(.12)].join('');
  return [defs, rr(0, 0, W, H, 0, ' fill="#0a3550"') + `<circle cx="1180" cy="220" r="110" fill="#ffe2a8"/>` + body + grainE];
});

// ==== OUTPUT ====
const hash = (s) => [...s].reduce((h, c) => Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0, 2166136261);
const only = process.argv.slice(2);
mkdirSync(OUT, { recursive: true });
if (!only.length) for (const f of readdirSync(OUT)) if (f.endsWith('.svg')) rmSync(path.join(OUT, f));
let total = 0;
const sizes = [];
for (const s of SCENES) {
  if (only.length && !only.includes(s.name)) continue;
  R = rng(hash(s.name));
  const [defs, body] = s.fn();
  const svg = wrap(defs, body);
  writeFileSync(path.join(OUT, s.name + '.svg'), svg);
  if (process.env.SCENE_DEBUG) { // 体积排查：列出最大的几个元素
    const parts = svg.split(/(?=<)/).map((p) => [p.length, p.slice(0, 70)]).sort((a, b) => b[0] - a[0]).slice(0, 6);
    console.log(s.name, svg.length, parts.map(([l, p]) => `\n   ${l} ${p}`).join(''));
  }
  total += svg.length;
  sizes.push([s.name, svg.length]);
}
for (const [nm, sz] of sizes) if (sz > 12 * 1024) console.log('  ! 超过 12 KB：' + nm + ' ' + (sz / 1024).toFixed(1) + ' KB');

// scenes.css
const css = ['/* 由 tools/build-scenes.mjs 生成，不要手改。用法见 COMPONENTS.md 第 16 节。 */',
  '.art[class*="sc-"] > .i { display: none; }'];
const darkCss = [];
for (const s of SCENES) {
  const url = `url("scenes/${s.name}.svg")`;
  if (s.studio) {
    const [a, b, da, db] = s.studio;
    css.push(`.art.sc-${s.name} { background: ${url} center / cover no-repeat, radial-gradient(120% 100% at 50% 30%, ${a}, ${b}) ${b}; }`);
    darkCss.push(`html[data-scheme="dark"] .art.sc-${s.name} { background-image: ${url}, radial-gradient(120% 100% at 50% 30%, ${da}, ${db}); background-color: ${db}; }`);
  } else css.push(`.art.sc-${s.name} { background: ${url} center / cover no-repeat, ${s.color}; }`);
}
css.push('/* 产品图的影棚底色跟随明暗模式 */', ...darkCss);
css.push('/* 裁切位置：默认居中；主体靠上或靠下时用 */',
  '.art[class*="sc-"].sc-top { background-position: center top; }',
  '.art[class*="sc-"].sc-bottom { background-position: center bottom; }', '');
if (!only.length) writeFileSync(path.join(ROOT, 'kit', 'scenes.css'), css.join('\n'));

// 预览页
const groups = {};
for (const s of SCENES) (groups[s.group] ||= []).push(s.name);
const preview = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<title>scenes preview</title>
<!-- 由 tools/build-scenes.mjs 生成。查询串：cols=6 ratio=4/3 only=a,b group=landscape scheme=dark label=0 -->
<link rel="stylesheet" href="../kit/scenes.css">
<style>
  body { margin: 0; padding: 16px; font: 13px/1.3 system-ui, sans-serif; background: #f2f2f4; color: #333; }
  html[data-scheme="dark"] body { background: #000; color: #ccc; }
  h2 { font-size: 13px; margin: 14px 0 8px; text-transform: uppercase; letter-spacing: .06em; color: #888; }
  .g { display: grid; grid-template-columns: repeat(var(--cols, 6), 1fr); gap: 12px; }
  figure { margin: 0; }
  figcaption { margin-top: 4px; font: 12px ui-monospace, Consolas, monospace; }
  .art { position: relative; overflow: hidden; display: grid; place-items: center; aspect-ratio: var(--ratio, 4 / 3); border-radius: 10px; background: #888; }
</style>
</head>
<body>
<script>
  const GROUPS = ${JSON.stringify(groups)};
  const q = new URLSearchParams(location.search);
  if (q.get('scheme') === 'dark') document.documentElement.dataset.scheme = 'dark';
  const only = (q.get('only') || '').split(',').filter(Boolean);
  const label = q.get('label') !== '0';
  document.body.style.setProperty('--cols', q.get('cols') || 6);
  if (q.get('ratio')) document.body.style.setProperty('--ratio', q.get('ratio'));
  for (const [g, names] of Object.entries(GROUPS)) {
    if (q.get('group') && q.get('group') !== g) continue;
    const list = names.filter((n) => !only.length || only.includes(n));
    if (!list.length) continue;
    if (label) document.body.insertAdjacentHTML('beforeend', '<h2>' + g + '</h2>');
    const grid = document.createElement('div'); grid.className = 'g';
    for (const n of list) grid.insertAdjacentHTML('beforeend', '<figure><div class="art sc-' + n + '"></div>' + (label ? '<figcaption>.sc-' + n + '</figcaption>' : '') + '</figure>');
    document.body.appendChild(grid);
  }
</script>
</body>
</html>
`;
if (!only.length) writeFileSync(path.join(ROOT, 'tools', 'scenes-preview.html'), preview);
console.log(`${sizes.length} 个场景，共 ${(total / 1024).toFixed(1)} KB，最大 ${sizes.sort((a, b) => b[1] - a[1]).slice(0, 3).map(([a, b]) => a + ' ' + (b / 1024).toFixed(1) + 'KB').join('、')}`);
