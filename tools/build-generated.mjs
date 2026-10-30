// 生成 kit/generated.css：
// 1) 弹簧动效：把 Apple（SwiftUI spring duration/bounce）和 Material 3（damping/stiffness）参数
//    数值积分成 CSS linear() 缓动曲线 + 时长。
// 2) 形状库：M3 Expressive 形状（cookie、clover、burst、sunny 等）和 iOS 图标超椭圆，生成 SVG 遮罩。
// 用法：node tools/build-generated.mjs
import { writeFile } from 'node:fs/promises';
import path from 'node:path';

function spring({ stiffness, damping }) {
  const k = stiffness, c = 2 * damping * Math.sqrt(k);
  let x = 1, v = 0, t = 0;
  const dt = 1 / 2000, samples = [];
  // 收敛到 0.1% 内且速度很小即认为结束
  while (t < 3) {
    samples.push([t, 1 - x]);
    const a = -k * x - c * v;
    v += a * dt; x += v * dt; t += dt;
    if (Math.abs(x) < 0.001 && Math.abs(v) < 0.01) break;
  }
  samples.push([t, 1]);
  const T = t;
  const N = 48, pts = [];
  for (let i = 0; i <= N; i++) {
    const tt = (T * i) / N;
    const s = samples[Math.min(samples.length - 1, Math.round(tt / dt))];
    pts.push(+s[1].toFixed(3));
  }
  pts[pts.length - 1] = 1;
  return { ms: Math.round(T * 1000), easing: `linear(${pts.join(', ')})` };
}
const apple = (duration, bounce) => ({ stiffness: (2 * Math.PI / duration) ** 2, damping: 1 - bounce });
const SPRINGS = {
  // Apple：SwiftUI .smooth / .snappy / .bouncy（duration 0.5）
  'apple-smooth': apple(0.5, 0), 'apple-snappy': apple(0.5, 0.15), 'apple-bouncy': apple(0.5, 0.3),
  // Material 3 motion scheme：standard 与 expressive，空间（spatial）与效果（effects）
  // 数值核对自 androidx-main compose/material3 tokens：StandardMotionTokens.kt、ExpressiveMotionTokens.kt（均为 VERSION v0_14_0）。
  // 两套方案的 effects 弹簧完全相同（damping 1.0，stiffness 3800 / 1600 / 800），所以只生成一组 md-*-effects。
  'md-std-fast-spatial': { damping: 0.9, stiffness: 1400 }, 'md-std-spatial': { damping: 0.9, stiffness: 700 },
  'md-std-slow-spatial': { damping: 0.9, stiffness: 300 },
  'md-exp-fast-spatial': { damping: 0.6, stiffness: 800 }, 'md-exp-spatial': { damping: 0.8, stiffness: 380 },
  'md-exp-slow-spatial': { damping: 0.8, stiffness: 200 },
  'md-fast-effects': { damping: 1, stiffness: 3800 }, 'md-effects': { damping: 1, stiffness: 1600 },
  'md-slow-effects': { damping: 1, stiffness: 800 },
};

// 形状：极坐标 r(θ) = 1 + a·cos(nθ)，再归一化到 0..100 的 viewBox
function polar(n, a, rot = 0, steps = 120) {
  const pts = [];
  for (let i = 0; i < steps; i++) {
    const th = (i / steps) * Math.PI * 2;
    const r = 1 + a * Math.cos(n * (th + rot));
    pts.push([Math.cos(th) * r, Math.sin(th) * r]);
  }
  return norm(pts);
}
// 超椭圆 |x|^p + |y|^p = 1（iOS 图标近似 p≈5）
function superellipse(p, steps = 96) {
  const pts = [];
  for (let i = 0; i < steps; i++) {
    const th = (i / steps) * Math.PI * 2;
    const c = Math.cos(th), s = Math.sin(th);
    pts.push([Math.sign(c) * Math.abs(c) ** (2 / p), Math.sign(s) * Math.abs(s) ** (2 / p)]);
  }
  return norm(pts);
}
function norm(pts) {
  const xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${+(((x - minX) / (maxX - minX)) * 100).toFixed(1)} ${+(((y - minY) / (maxY - minY)) * 100).toFixed(1)}`);
  return d.join('') + 'Z';
}
const SHAPES = {
  squircle: superellipse(5),
  'cookie-4': polar(4, 0.09, Math.PI / 4),
  'cookie-6': polar(6, 0.07),
  'cookie-9': polar(9, 0.055),
  'cookie-12': polar(12, 0.04),
  clover: polar(4, 0.22, Math.PI / 4),
  flower: polar(8, 0.12),
  burst: polar(12, 0.11),
  'soft-burst': polar(10, 0.07),
  gem: polar(5, 0.08, -Math.PI / 2),
};
// ---- M3 Expressive LoadingIndicator 的形状序列（LoadingIndicator.kt：SoftBurst → Cookie9Sided → Pentagon → Pill → Sunny → Cookie4Sided → Oval，
//      每 650ms 变形一次）。每个形状按同样的 72 个角度采样成 polygon()，CSS 才能在两个形状之间逐点插值。
const MORPH_N = 72, MORPH_R = 39.6;   // 形状占容器 38/48
function rayStadium(th, w, h, rot) {  // 胶囊（圆角矩形，短边全圆角）沿角度 th 的半径
  const a = th - rot, dx = Math.cos(a), dy = Math.sin(a), r0 = h / 2, hx = w / 2 - r0;
  let lo = 0, hi = 2;
  for (let i = 0; i < 40; i++) {
    const m = (lo + hi) / 2, x = Math.abs(dx * m), y = Math.abs(dy * m);
    const inside = x <= hx ? y <= r0 : (x - hx) ** 2 + y ** 2 <= r0 ** 2;
    if (inside) lo = m; else hi = m;
  }
  return lo;
}
const MORPH = {
  'soft-burst': (t) => 1 + 0.07 * Math.cos(10 * t),
  'cookie-9': (t) => 1 + 0.055 * Math.cos(9 * (t + Math.PI / 2)),
  pentagon: (t) => {
    const n = 5, seg = (2 * Math.PI) / n, a = ((((t + Math.PI / 2) % seg) + seg) % seg) - seg / 2;
    const poly = Math.cos(Math.PI / n) / Math.cos(a);
    return poly * 0.72 + 0.86 * 0.28;   // 和圆混合，得到圆角五边形
  },
  pill: (t) => rayStadium(t, 2, 1.12, -Math.PI / 4),
  sunny: (t) => 1 + 0.075 * Math.cos(8 * t),
  'cookie-4': (t) => 1 + 0.1 * Math.cos(4 * (t + Math.PI / 4)),
  oval: (t) => { const a = t + Math.PI / 4; return 1 / Math.sqrt((Math.cos(a) / 1) ** 2 + (Math.sin(a) / 0.72) ** 2); },
};
function morphPolygon(fn) {
  const rs = Array.from({ length: MORPH_N }, (_, i) => fn((i / MORPH_N) * 2 * Math.PI - Math.PI / 2));
  const max = Math.max(...rs);
  return 'polygon(' + rs.map((r, i) => {
    const t = (i / MORPH_N) * 2 * Math.PI - Math.PI / 2, k = (r / max) * MORPH_R;
    return `${+(50 + Math.cos(t) * k).toFixed(2)}% ${+(50 + Math.sin(t) * k).toFixed(2)}%`;
  }).join(',') + ')';
}
const uri = (d) => `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100' preserveAspectRatio='none'><path d='${d}'/></svg>`)}")`;

let css = `/* 自动生成，勿手改：node tools/build-generated.mjs */\n:root {\n`;
for (const [name, p] of Object.entries(SPRINGS)) {
  const s = spring(p);
  css += `  --spring-${name}: ${s.easing};\n  --spring-${name}-ms: ${s.ms}ms;\n`;
}
css += `}\n\n/* 形状遮罩：.shape-cookie-9 等。M3 Expressive 形状库的近似，以及 iOS 图标超椭圆 */\n`;
for (const [name, d] of Object.entries(SHAPES)) {
  css += `.shape-${name} { --shape-mask: ${uri(d)}; }\n`;
}
css += `[class*="shape-"] { -webkit-mask: var(--shape-mask) center / 100% 100% no-repeat; mask: var(--shape-mask) center / 100% 100% no-repeat; }\n`;
css += `[class*="shape-"]:is(${Object.keys(SHAPES).map((n) => '.shape-' + n).join(',')}) { border-radius: 0 !important; }\n`;
css += `.shape-arch { border-radius: 999px 999px 18% 18% / 50% 50% 18% 18% !important; }\n`;
css += `.shape-pill { border-radius: 999px !important; }\n.shape-circle { border-radius: 50% !important; }\n`;
css += `.shape-leaf { border-radius: 50% 6% 50% 6% !important; }\n.shape-ticket { border-radius: 28% !important; }\n`;
const seq = Object.keys(MORPH);
css += `\n/* M3 LoadingIndicator 形状变形：${seq.join(' → ')} → 循环，每段 650ms */\n@keyframes ui-m3-morph {\n`;
[...seq, seq[0]].forEach((name, i) => { css += `  ${+((i / seq.length) * 100).toFixed(3)}% { clip-path: ${morphPolygon(MORPH[name])}; }\n`; });
css += `}\n:root { --m3-morph-ms: ${seq.length * 650}ms; }\n`;
for (const name of seq) css += `.morph-${name} { clip-path: ${morphPolygon(MORPH[name])}; }\n`;
await writeFile(path.join(process.cwd(), 'kit', 'generated.css'), css);
console.log('springs', Object.keys(SPRINGS).length, 'shapes', Object.keys(SHAPES).length + 5, 'bytes', css.length);
for (const [name, p] of Object.entries(SPRINGS)) console.log(name, spring(p).ms + 'ms');
