# UI Kit 组件参考

同一份 HTML，切换 `<html data-lang>` 就能在两种设计语言之间换皮：

| | `data-lang="apple"` | `data-lang="google"` |
| :--- | :--- | :--- |
| 参考 | Apple HIG，iOS 26 / Liquid Glass | Material 3 Expressive（Android 16） |
| 颜色 | iOS 系统色，`--accent` 是 tint | 由种子色 `--accent` 推导 M3 色彩角色（OKLCH 近似） |
| 材质 | 浮动玻璃（标签栏、工具栏、栏按钮、sheet、菜单） | 不透明 surface container，靠色调分层 |
| 字体 | SF Pro（Apple 设备）/ Inter / 系统字体 | Google Sans Flex / Roboto Flex / 系统字体 |
| 形状 | 胶囊按钮、24px 圆角分组列表 | 按下变形的按钮、分段列表（首尾大圆角，中间 4px） |
| 动效 | SwiftUI 弹簧（smooth / snappy / bouncy） | M3 motion scheme（expressive 空间弹簧 + effects） |

明暗：`data-scheme="light|dark"`。高对比：`data-contrast="more"`。Apple 玻璃：`data-glass="clear|opaque"`。紧凑：`data-density="compact"`（Google）。
这些都可以用 URL 参数设置：`settings.html?lang=google&scheme=dark&accent=%23006a6a&scale=1.2&safe=54,34`。

---

## 1. 模板骨架

```html
<!doctype html>
<html lang="zh-CN" data-lang="apple">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>页面标题</title>
<meta name="ui:title" content="模板名（展示站里显示）">
<meta name="ui:desc" content="一句话说明这个模板包含什么">
<meta name="ui:category" content="分类（见下表）">
<meta name="ui:platform" content="phone">   <!-- phone | tablet | desktop | web -->
<meta name="ui:tags" content="逗号分隔的关键词">
<link rel="stylesheet" href="../../kit/ui.css">
<script src="../../kit/icons.js"></script>
<script src="../../kit/ui.js"></script>
</head>
<body class="app">      <!-- 网页用 class="site" -->
  <div class="screen"> … </div>
</body>
</html>
```

分类（`ui:category`）只用这些：

- App：引导与账户、首页与内容、社交与消息、电商与零售、出行与本地生活、效率工具、媒体与娱乐、健康与运动、金融与支付、智能家居、系统与设置、状态与反馈、平板与桌面
- 网页：营销与产品、定价与购买、内容与博客、文档与支持、公司与招聘、账户与表单、系统页面

## 2. 规则

1. **只用 kit 里的类名**。`node tools/lint.mjs` 会报出未定义的类。页面专用布局写在页面内的 `<style>` 里，类名加页面前缀（例如 `.np-cover`）。
2. **页面样式只用 token**：`var(--ui-surface)`、`var(--ui-text-2)`、`var(--ui-radius-l)`、`var(--c-blue)` 等（见第 4 节），这样两种语言、明暗模式都对。只有照片、封面等“内容”可以写死颜色。
3. **平台差异**用 `.only-apple` / `.only-google`。例如 iOS 的大标题副文案、Android 的 FAB、iOS 的分组列表无副标题而 Android 有。
4. **不加载任何外部资源**（图片、字体、脚本）。图片用 `.art.a1`～`.a12` 渐变占位，地图用 `.art.map`，人物用 `.avatar`。
5. 文案用简体中文，数据要像真的（具体人名、价格、时间、地名），不要写“标题”“描述文字”“Lorem”。
6. 手机按 402×874 设计，`--safe-top` / `--safe-bottom` 由展示站注入（iPhone 是 62/34，Pixel 是 48/24），顶栏、标签栏已经自动避让。
7. 交互只需要演示级：`ui.js` 已处理分段/标签/筛选片的单选，`data-open="id"` / `data-close` 开关浮层，滑块填充色。

## 3. 文字样式

同名角色两边映射到各自的字号表（Apple 是 Dynamic Type，Google 是 M3 type scale）：

| 类 | Apple | Google |
| :--- | :--- | :--- |
| `.t-display` | 48 Bold | display-medium 45 |
| `.t-large-title` | Large Title 34 Bold | headline-large 32 |
| `.t-title1` | Title 1 28 Bold | headline-medium 28 |
| `.t-title2` | Title 2 22 Bold | headline-small 24 |
| `.t-title3` | Title 3 20 Semibold | title-large 22 |
| `.t-headline` | Headline 17 Semibold | title-medium 16/500 |
| `.t-body` | Body 17 | body-large 16 |
| `.t-callout` | Callout 16 | body-medium 14 |
| `.t-subhead` | Subheadline 15 | title-small 14/500 |
| `.t-footnote` | Footnote 13 | body-small 12 |
| `.t-caption` / `.t-caption2` | Caption 12 / 11 | label-medium 12 / label-small 11 |
| `.t-hero` `.t-lead` `.t-eyebrow` | 网页首屏大标题 / 导语 / 眉标 | 同左 |

修饰：`.t-2` `.t-3` `.t-4`（次要文字层级）、`.t-accent` `.t-danger` `.t-success` `.t-warning`、`.t-bold` `.t-semibold` `.t-medium` `.t-regular`、`.t-num`（等宽数字）、`.t-mono`、`.t-center` `.t-right`、`.t-clamp-1/2/3`、`.t-upper`。

## 4. Token（页面样式可用）

- 背景与表面：`--ui-bg`（页面）、`--ui-bg-plain`、`--ui-surface`、`--ui-surface-2`、`--ui-surface-3`、`--ui-fill`、`--ui-fill-2`
- 文字：`--ui-text`、`--ui-text-2`、`--ui-text-3`、`--ui-text-4`；线：`--ui-line`、`--ui-line-strong`
- 强调：`--ui-accent` / `--ui-on-accent`、`--ui-accent-soft` / `--ui-on-accent-soft`、`--ui-accent-2-soft` / `--ui-on-accent-2-soft`、`--ui-accent-3` / `--ui-accent-3-soft` / `--ui-on-accent-3-soft`
- 状态：`--ui-danger` `--ui-success` `--ui-warning`，各有 `-soft` 与 `--ui-on-*-soft`；反色：`--ui-inverse` / `--ui-on-inverse`
- 命名色板：`--c-red` `--c-orange` `--c-yellow` `--c-green` `--c-mint` `--c-teal` `--c-cyan` `--c-blue` `--c-indigo` `--c-purple` `--c-pink` `--c-brown` `--c-gray`。Google 深色下会自动提亮；放在实心命名色上的文字用 `color: var(--c-on)`（通常是白色，Google 深色下变成深色）
- 形状：`--ui-radius-xs/s/m/l/xl/full`；阴影：`--ui-shadow-1/2/3`；玻璃底色：`--ui-glass-bg`
- 间距：`--sp-1`(4)…`--sp-24`(96)；页面边距 `--ui-margin`；安全区 `--safe-top` `--safe-bottom`；文字缩放 `--ts`
- 动效：`--ui-dur` `--ui-ease` `--ui-ease-spatial`，以及 `generated.css` 里的 `--spring-apple-*`、`--spring-md-*`

Google 专属角色也可直接用：`--md-primary` `--md-primary-container` `--md-tertiary-container` `--md-surface-container-high` 等；Apple 专属：`--ios-blue` 等。只在 `.only-*` 或 `html[data-lang=…]` 选择器里用。

## 5. 图标

```html
<svg class="i"><use href="#i-home"/></svg>          <!-- 24px -->
<svg class="i sm|lg|xl|xxl"><use href="#i-star"/></svg>
<svg class="i solid"><use href="#i-play"/></svg>    <!-- Apple 模式下填充成实心 -->
<use href="#i-home-fill"/>                          <!-- Google 实心版（选中态），Apple 下等同线条版 -->
```

Apple 用 Lucide（ISC），Google 用 Material Symbols（Apache-2.0）。平台语义别名：`back`（iOS ‹ / Android ←）、`overflow`（… / ⋮）。
全部 id（189 个）：activity add-circle airplay alert archive arrow-left arrow-right arrow-up-right at award back bag battery bed bell bike bluetooth bold book bookmark briefcase building calendar camera car card cart cast chart check check-square checklist chevron-down chevron-left chevron-right chevron-up circle circle-check clock close close-sheet cloud code coffee compass copy credit-score doc dot download droplet dumbbell edit expand external eye eye-off face-id fan file film filter fingerprint flag flame folder food forward gamepad gauge gem gift globe grid grip hash headphones heart heart-pulse help history home hotel image inbox info italic key keyboard laptop layers leaf library lightbulb link list list-music locate lock log-in logout mail map map-pin menu message mic mic-off minus moon more more-vert mountain music navigation news note overflow package palette paperclip pause percent phone pill pin plane play play-circle plus podcast power printer qr radio rain receipt redo refresh repeat reply scan search send settings share shield shrink shuffle sidebar skip-back skip-forward sliders smartphone smile snowflake sort sparkles speaker star store sun tag terminal thermometer ticket train trash trending-up truck tv type umbrella undo unlock upload user user-plus users video volume volume-off walk wallet warning wifi wind yen zap

有实心版（`-fill` 后缀）的：activity bag bell bookmark calendar camera compass doc folder grid heart home image inbox library lightbulb mail map map-pin message receipt search settings star user users wallet

## 6. App 外壳

```html
<div class="screen">
  <header class="topbar has-large">             <!-- has-large：大标题，滚动后小标题淡入 -->
    <div class="topbar-lead">
      <a class="bar-btn back" href="#"><svg class="i"><use href="#i-back"/></svg><span>设置</span></a>
    </div>
    <div class="topbar-title">通知</div>        <!-- 可加 <span class="topbar-sub">副标题</span> -->
    <div class="topbar-trail">
      <button class="bar-btn"><svg class="i"><use href="#i-search"/></svg></button>
      <button class="bar-btn prominent">完成</button>
    </div>
  </header>
  <main class="content">                       <!-- 左右已有页边距；.content.flush 去掉边距 -->
    <h1 class="page-title">通知</h1>            <!-- 配合 has-large；Google 下是 headline -->
    …
  </main>
  <nav class="tabbar">
    <a class="tab is-active" href="#"><svg class="i"><use href="#i-home-fill"/></svg><span>首页</span></a>
    <a class="tab" href="#"><svg class="i"><use href="#i-search"/></svg><span>搜索</span><span class="badge">3</span></a>
    …
  </nav>
  <button class="fab only-google"><svg class="i"><use href="#i-edit"/></svg></button>
</div>
```

- 顶栏：`.topbar`（Apple 标题居中、按钮是玻璃圆钮；Google 标题居左，64px）、`.topbar.transparent`（盖在媒体上，固定定位）、`.topbar.static`。
- `.bar-btn`：只有图标时自动变成圆钮；`.bar-btn.prominent` 是强调按钮（iOS 蓝色玻璃 ✓ / Android 实心按钮）；`.bar-group` 把多个按钮合进一个玻璃胶囊（Apple）。
- `.page-head`：大标题 + 右侧操作并排。
- 标签栏：Apple 是浮动玻璃胶囊，选中项有高亮底；Google 是满宽导航栏，选中图标外有药丸指示器。iOS 26 的独立搜索钮：`<nav class="tabbar"><div class="tab-group">…四个 .tab…</div><a class="tab search">…</a></nav>`。
- `.fab`（`.extended` 带文字、`.lg` `.md`、`.prominent`、`.tertiary`）：Google 是 FAB；Apple 下是玻璃圆钮，多数情况用 `.only-google`。
- `.toolbar.floating`（底部浮动工具栏，Google 可加 `.vibrant`）里放 `.icon-btn`；`.toolbar.docked` 是贴底工具栏。

## 7. 列表

```html
<section class="group">
  <h2 class="group-header">网络 <a href="#">编辑</a></h2>     <!-- .group-header.large：大号分组标题 -->
  <ul class="list has-icons">                                 <!-- has-icons / has-avatars 让分隔线缩进 -->
    <li><a class="row" href="#">
      <span class="row-icon" style="--tint:var(--c-blue)"><svg class="i"><use href="#i-wifi"/></svg></span>
      <span class="row-body"><span class="row-title">无线局域网</span><span class="row-sub">已连接</span></span>
      <span class="row-value">Home-5G</span>
      <svg class="i row-chevron"><use href="#i-chevron-right"/></svg>   <!-- Google 下自动隐藏 -->
    </a></li>
    <li><label class="row">…<input type="checkbox" class="switch" checked></label></li>
  </ul>
  <p class="group-footer">说明文字</p>
</section>
```

- `.list`：Apple 是白底圆角分组 + 发丝分隔线；Google 是分段列表（每项独立、间隔 2px）。
- `.list.plain`：满宽无圆角（收件箱、聊天列表），常配合 `.bleed`；`.list.no-sep` 去分隔线。
- 行内元素：`.row-icon`（`--tint` 设颜色；`.row-icon.plain` 只有彩色图标）、`.avatar`、`.row-body` > `.row-overline` / `.row-title` / `.row-sub`、`.row-value`、`.row-meta`（右侧两行：时间 + 标记）、`.row-chevron`、`.row-input`（表单行内输入）、`.switch` `.check` `.radio` `.badge` `.btn.xs`。
- 行修饰：`.row.destructive`（红色）、`.row.action`（强调色文字）、`.row.center`。

## 8. 卡片与小组件

```html
<a class="card" href="#">
  <div class="card-media art a3" style="--ratio:4/3"></div>
  <div class="card-body"><span class="card-title">周末去莫干山</span><span class="card-sub">2 晚 · ¥1,280 起</span></div>
  <div class="card-actions"><button class="btn sm filled">预订</button></div>
</a>
<div class="card pad">…</div>                     <!-- 直接带内边距 -->
<div class="card media-fill"><div class="art a9"></div><div class="card-body">…</div></div>  <!-- 图片铺满、文字压底 -->
<div class="widget" style="--tint:var(--c-orange)"><span class="widget-label"><svg class="i sm"><use href="#i-flame"/></svg>活动</span><span class="widget-value">426</span><span class="t-footnote t-2">千卡</span></div>
```

卡片变体：`.outlined` `.elevated` `.tinted`（强调色浅底）`.accent`（强调色实底）`.dark`；Google 另有 `.tonal-2` `.tonal-3`。小组件 `.widget`，`.widget.wide` 占两列。

## 9. 按钮

```html
<button class="btn filled">主要操作</button>
<button class="btn tonal">次要</button>  <button class="btn">默认</button>
<button class="btn outlined">描边</button>  <button class="btn text">文字</button>
<button class="btn neutral">中性</button>  <button class="btn glass">玻璃/浮起</button>
<button class="btn filled lg block">继续</button>
<button class="btn filled danger">删除</button>  <button class="btn tonal danger">移除</button>
<button class="btn filled" disabled>禁用</button>  <button class="btn filled is-loading">提交</button>
<button class="icon-btn"><svg class="i"><use href="#i-heart"/></svg></button>  <!-- .filled .tonal .neutral .outlined .glass .on-media .sm .lg .xl .is-active -->
<div class="btn-group"><button class="btn is-active">日</button><button class="btn">周</button><button class="btn">月</button></div>
<div class="split-btn"><button class="btn filled">发送</button><button class="btn filled"><svg class="i"><use href="#i-chevron-down"/></svg></button></div>
<a class="link-arrow" href="#">进一步了解</a>
```

尺寸：`.xs` `.sm` 默认 `.lg` `.xl`（Google 的 XL 是 96px 高）；形状：`.square`；`.icon-only`；`.on-media`（盖在图片上）。按钮排列：`.btn-row`（`.end` `.center` `.stretch`）、`.btn-stack`。

## 10. 分段、标签页、筛选片

```html
<div class="segmented"><button class="is-active">全部</button><button>未读</button><button>已标记</button></div>
<nav class="tabs"><a class="is-active" href="#">推荐</a><a href="#">关注</a><a href="#">热门</a></nav>   <!-- .tabs.scroll 可横滑；.tabs.underline -->
<div class="chips"><button class="chip is-active">全部</button><button class="chip"><svg class="i"><use href="#i-star"/></svg>收藏</button></div>
```

`.chips.single` 单选、默认多选；`.chips.wrap` 换行；`.chips.bleed` 贴边横滑；Apple 有 `.chip.outlined`，Google 有 `.chip.filled`。

## 11. 表单

```html
<form class="form">
  <label class="field">
    <span class="field-label">邮箱</span>
    <input class="field-input" type="email" placeholder="name@example.com">
    <span class="field-help">用于登录和找回密码</span>
  </label>
  <label class="field is-error">…</label>
  <div class="field-row">两个 .field 并排</div>
  <label class="field"><span class="field-label">备注</span><textarea placeholder=" "></textarea></label>
  <div class="field-affix"><svg class="i"><use href="#i-search"/></svg><input class="field-input" placeholder="搜索"><button class="icon-btn sm affix-end">…</button></div>
  <select class="select"><option>中国大陆</option></select>
</form>
```

- Google 下 `.field` 是 outlined 文本框 + 浮动标签（`.field-label` 必须写在 `.field-input` 前面，结构如上）；`.field.filled` 是 filled 文本框。Apple 下是灰底圆角输入框，标签在上方。
- 其他：`.searchbar`（`<label class="searchbar"><svg class="i">…</svg><input placeholder="搜索"></label>`，Apple 可加 `.glass`）、`.otp`（多个 `<input maxlength="1">`）、`.switch`（`<input type="checkbox" class="switch">`）、`.check`（`.round`）、`.radio`、`.range`（`<input type="range" class="range" value="40">`）、`.range-row`、`.stepper`（`<div class="stepper"><button>−</button><output>2</output><button>+</button></div>`，按钮里放 `#i-minus` `#i-plus` 图标）。

## 12. 标记与反馈

- `.badge`（数字）/ `.badge.dot`；`.tag`（`.accent` `.success` `.warning` `.danger` `.solid` `.new`）
- `.progress`（`style="--value:60%"`，`.thick` `.indeterminate`；Google 下 `.wavy` 是波浪进度）
- `.spinner`（Apple 菊花 / Google 圆环）、`.loader`（Google 是 Expressive 形状加载器）
- `.ring`（`style="--value:72;--size:120px;--stroke:14px;--ring-color:var(--c-red)"`）；`.rings` 叠多个同心环；`.ring-wrap` 中间放文字
- `.callout`（`.success` `.warning` `.danger` `.neutral`），内部可用 `.callout-title`
- `.toast`（底部；`.toast.top` 顶部）、`.skeleton`（`.text` `.title` `.circle`）、`.empty`（空状态：图标 + 标题 + 说明 + 按钮）
- `.divider`、`.divider.label`（“或”分隔）、`.kbd`、`.dots`（分页点，`<span class="is-active">`）、`.steps`（多步进度条）

## 13. 浮层

```html
<div class="scrim" data-for="share-sheet"></div>
<div class="sheet" id="share-sheet">                <!-- .sheet.full 是全高页面式 sheet -->
  <div class="sheet-grabber"></div>
  <div class="sheet-head">
    <button class="bar-btn" data-close><svg class="i"><use href="#i-close"/></svg></button>
    <div class="sheet-title">分享</div>
    <button class="bar-btn prominent">发送</button>
  </div>
  <div class="sheet-body">…</div>
</div>

<div class="dialog" role="dialog">
  <svg class="i lg dialog-icon"><use href="#i-trash"/></svg>   <!-- 可选 -->
  <h2 class="dialog-title">删除这条笔记？</h2>
  <p class="dialog-body">删除后可在“最近删除”中保留 30 天。</p>
  <div class="dialog-actions"><button class="btn" data-close>取消</button><button class="btn filled danger">删除</button></div>
</div>

<div class="menu" style="top:100px;right:16px">
  <button class="menu-item"><span>复制</span><svg class="i"><use href="#i-copy"/></svg></button>
  <div class="menu-sep"></div>
  <button class="menu-item destructive"><span>删除</span><svg class="i"><use href="#i-trash"/></svg></button>
</div>
<div class="action-sheet"><ul class="list"><li><button class="row">拍照</button></li>…</ul><ul class="list"><li><button class="row">取消</button></li></ul></div>
```

浮层默认 `position: fixed`。默认隐藏的加 `hidden`，触发按钮写 `data-open="id"`。在说明页里展示静态效果时加 `.inline`，让它回到文档流。

## 14. 平板与桌面

```html
<body class="app">
<div class="split">                         <!-- 两栏；.split.three 三栏；也可 style="--split-cols:320px 1fr" -->
  <aside class="pane divided"><nav class="sidebar floating">     <!-- Apple：浮动玻璃侧栏；Google：抽屉 -->
    <div class="sidebar-title t-title2">邮件</div>
    <a class="side-item is-active" href="#"><svg class="i"><use href="#i-inbox"/></svg><span>收件箱</span><span class="count">12</span></a>
    <div class="sidebar-section">文件夹</div> …
  </nav></aside>
  <section class="pane">…</section>
</div>
```

`.rail` + `.rail-item`（Google 导航轨，96px；Apple 下是紧凑侧边图标栏）、`.app-frame`（rail + `.app-main`）。

## 15. 数据展示

- `.avatar`（`.xs` `.sm` `.lg` `.xl` `.xxl` `.square`；`style="--c:var(--c-teal)"` 或渐变；内部写姓氏；`<span class="presence"></span>` 在线点）、`.avatar-stack`
- `.stat` > `.stat-value` `.stat-label` `.stat-delta`（`.down`）
- `.bars`（`<span style="--h:62%"></span>`，`.is-active` 高亮）+ `.bars-labels`；`.legend`（`<span style="--c:var(--c-blue)">收入</span>`）
- `.chart`（内联 SVG：`<polyline class="line">`、`<path class="area">`、`<line class="grid">`、`<text>`）
- `.table-wrap` > `table.table`（`.num` 右对齐）；`.kv`（`<dl>` 两列键值）
- `.timeline`（`<ol class="timeline"><li class="is-done">…</li><li class="is-current">…</li></ol>`）
- `.calendar` > `.cal-head` + `.cal-grid` > `.cal-dow` ×7 + `.cal-day`（`.is-muted` `.is-today` `.is-selected` `.in-range` `.has-dot`）；`.event`（`style="--c:var(--c-orange)"`）
- 消息：`.bubble-list` > `.bubble-meta` / `.bubble` / `.bubble.out`；输入栏 `.composer`（内放 `.icon-btn` + `.composer-input` 或 `.searchbar`）

## 16. 媒体占位

- `.art.a1`～`.a12`：12 种渐变“照片”，可放一个居中图标；`.art.round` 圆角；`.art.map` 地图底图，配 `.map-pin`（`style="left:40%;top:30%;--c:var(--c-red)"`，内放小图标）和 `.map-me`
- 比例：`.ratio-1` `.ratio-4x3` `.ratio-3x4` `.ratio-16x9` `.ratio-9x16` `.ratio-21x9` `.ratio-2x1`
- `.media-grid`（`style="--cols:3;--gap:2px"`）、`.carousel`（横滑，`style="--item:78%"`，子元素自动吸附）
- 形状遮罩（`generated.css`）：`.shape-squircle` `.shape-cookie-4/6/9/12` `.shape-clover` `.shape-flower` `.shape-burst` `.shape-soft-burst` `.shape-gem` `.shape-arch` `.shape-pill` `.shape-circle` `.shape-leaf` `.shape-ticket`（M3 Expressive 形状库近似，用在头像、封面、装饰上）

## 17. 网页

```html
<body class="site">
<header class="site-nav"><div class="wrap">
  <a class="brand" href="#"><span class="brand-mark"><svg class="i"><use href="#i-sparkles"/></svg></span>品牌</a>
  <nav class="nav-links"><a href="#">产品</a><a class="is-active" href="#">定价</a></nav>
  <div class="nav-actions"><button class="icon-btn"><svg class="i"><use href="#i-search"/></svg></button><a class="btn filled sm" href="#">免费试用</a>
    <button class="icon-btn nav-menu-btn"><svg class="i"><use href="#i-menu"/></svg></button></div>
</div></header>
<nav class="local-nav"><div class="wrap"><span class="local-nav-title">产品名</span><div class="local-nav-links"><a href="#">概览</a><a class="btn filled xs" href="#">购买</a></div></div></nav>
<section class="hero"><div class="wrap">
  <span class="t-eyebrow">新款</span><h1 class="t-hero">大标题</h1><p class="t-lead hero-sub">导语</p>
  <div class="hero-actions"><a class="btn filled" href="#">购买</a><a class="link-arrow" href="#">进一步了解</a></div>
  <div class="hero-media art a4 ratio-16x9"></div>
</div></section>
<section class="section alt"><div class="wrap">
  <div class="section-head center"><span class="t-eyebrow">眉标</span><h2 class="t-large-title">区块标题</h2><p class="t-lead t-2">说明</p></div>
  <div class="grid c3">…</div>
</div></section>
<footer class="footer"><div class="wrap"><div class="footer-cols">…</div><div class="footer-legal">…</div></div></footer>
```

- 首屏：`.hero`（Apple 居中；Google 默认居左，`.hero.center` 居中）、`.hero.dark`、`.hero.split`（左文右图）
- 区块：`.section`（`.tight` `.alt` `.dark`）、`.section-head`（`.center` `.row`）、`.grid.c2`～`.c6`（自动响应式）、`.span-2` `.span-3` `.span-all` `.row-2`
- 内容块：`.tile`（官网首页大磁贴，`.tile.dark`，内含 `.tile-actions` `.tile-media`）、`.feature` + `.feature-icon`、`.bento`（便当格，`.big-num`）、`.spec`（`<dl class="spec"><dt>芯片</dt><dd>…</dd></dl>`）、`table.compare`、`.price-card`（`.is-featured`）+ `.price` > `.price-amount` `.price-unit` + `ul.check-list`（`li.off` 不包含）、`.faq`（`<details><summary>`）、`.swatches` > `.swatch`（`style="--c:#c9b79c"`）、`.option-list` > `.option`、`.quote`、`.logo-row`、`.cta-band`、`.breadcrumb`
- 文档与长文：`.doc`（三栏：`.doc-nav` / 正文 / `.toc`）、`.prose`（h1–h3、p、ul/ol、blockquote、code、pre、figure、table、hr）、`.code-block`
- 页脚：`.footer` > `.footer-cols`（`style="--cols:4"`）> `h4` + `ul` ；`.footer-legal`
- 响应式：860px 以下导航链接收进 `.nav-menu-btn`，网格降列；`.hide-md` `.hide-sm` `.show-md`

## 18. 工具类

`stack` `hstack`（`.top` `.base` `.wrap`）`between` `center` `end` `grow` `shrink-0` `gap-0/1/2/3/4/5/6/8/12` `mt-0/1/2/3/4/5/6/8/12/16` `mb-0/2/4/6/8` `mx-auto` `p-0/2/3/4/5/6/8` `px-4` `py-2/4/6/8` `w-full` `h-full` `maxw-sm` `maxw-md` `rounded` `rounded-l` `rounded-xl` `rounded-full` `overflow-hidden` `relative` `absolute` `inset-0` `surface` `surface-2` `bg-plain` `hide` `sr-only` `nowrap` `ellipsis` `scroll-x` `on-media` `inline`

## 19. 检查

在 `ui-gallery` 目录下：

```powershell
node tools/lint.mjs templates/app/xxx.html            # 类名、图标、meta、外部资源
node tools/shot.mjs audit templates/app/xxx.html      # 两种语言下的横向溢出、缺失图标（平板/桌面先设 $env:AUDIT_W='1180'）
node tools/shot.mjs shot tools/sheet.html $env:TEMP\uig\shots\x.png 1620 874 t=../templates/app/xxx.html`&safe=62,34
```
