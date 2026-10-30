# UI 模板库：Apple 与 Google 设计语言

把 Apple（iOS 27 / Liquid Glass）和 Google（Material 3 Expressive）两套设计语言整理成一套共用类名的 UI Kit，加上 84 个 App 和网页模板，以及一个用来浏览、对比、调整和导出的展示站。纯 HTML + CSS + 少量 JS，不需要构建，也不需要服务器。

两套 kit 都做过逐项校准：Google 一侧 241 项对照 Compose Material3 的官方生成 token，Apple 一侧 106 项对照 HIG 和第三方从 iOS 27 官方设计套件量出的数值，结果见 `kit/CALIBRATION-*.md`，展示站“设计语言 → 规格校准”里可以筛选查看。

**打开方式**：双击 `index.html`，用 Chrome、Edge 或 Safari 打开即可（`file://` 下也能用）。

## 有什么

| 部分 | 内容 |
| :--- | :--- |
| `kit/` | 设计 token 和组件。`ui.css` 是入口；`base.css` 是共用结构，`apple.css`、`google.css` 是两种语言的外观，`motion.css` 是动效；`fonts/` 是随附的开源字体；`icons.js` 有 189 个图标（每个 id 在两种语言下各一套）；`ui.js` 由 `kit/src/` 拼成，包含官方配色算法、URL 参数与实时切换、动效交互 |
| `kit/specs-*.json`、`kit/CALIBRATION-*.md` | 两种语言的规格校准数据和说明 |
| `templates/app/` | 63 个 App 模板：手机 53 个（含可操作的“动效与交互演示”），平板 5 个，桌面 5 个 |
| `templates/web/` | 21 个网页模板：官网首页、产品页、规格、机型对比、购买配置、定价、落地页、博客、长文、文档、帮助中心、招聘、联系、登录、作品集、状态页、更新日志、404 等 |
| `templates/_catalog.html` | 组件目录：每个组件的全部变体与状态 |
| `templates/_tokens.html` | 规范样张：颜色（带实际色值）、字号、形状、阴影、材质、动效曲线、间距、图标 |
| `index.html` + `gallery/` | 展示站 |
| `tools/` | 生成、检查、截图脚本 |

每个模板都是同一份 HTML，切换 `<html data-lang="apple|google">` 就换成另一种设计语言，`data-scheme="light|dark"` 切换明暗。

## 展示站

- **首页**：两台设备实时对照同一个模板（可切换 8 个精选），下面是 8 组流程合集（注册登录、电商下单、出行订票等，可整组查看），再往下是按分类分组的全部模板。
- **模板**：按平台、分类、用到的组件筛选，可搜索；卡片默认两种语言并排，也可只看一种，悬停看另一种明暗。手机上筛选栏收进抽屉，导航移到底部。
- **模板详情**：套在 iPhone 17 Pro、Pixel 10、iPad、Android 平板、桌面窗口或浏览器外框里实时预览，可切换设备和缩放；
  - **并排对比**：Apple 和 Google 各用自己的设备并排显示，两边滚动同步；
  - **分割对照**（仅手机和平板）：两种语言叠在同一台设备上，拖动中间的分割线对照；
  - 显示选项：文字大小（对应 Dynamic Type / 字体缩放）、增强对比度、Apple 玻璃透明度滑杆（对应 iOS 27 设置里的滑杆）与“降低透明度”、Google 紧凑密度；
  - 属于某个流程的模板，侧栏可以跳到流程里的上一屏、下一屏；
  - 侧栏有说明、标签、用到的组件、同类模板，以及带高亮的源码、复制、下载 zip；
  - `←` `→` 切换上一个、下一个模板，`Esc` 返回列表。
- **组件**：组件目录，可单独看一种语言或两种并排，并能跳到“使用这个组件的模板”。
- **设计语言**：两种语言的要点、在 kit 里怎么体现、来源链接、实时样张、逐项对比表，以及可按状态（一致 / 已修正 / 偏差）筛选的规格校准表。
- **主题**：选强调色（Apple 的 tint / Material 的种子色）后所有预览实时变化；导出解析后的 token（CSS 变量、JSON、Tailwind v4），浅色深色各一套。
- **套件**：收藏要用的模板，一次导出 zip。导出时可以设定默认语言、只保留一种语言的 CSS、写入当前强调色、附带组件目录。

顶栏的语言、明暗、强调色对所有页面生效，设置保存在浏览器本地。

## 在项目里用

1. 在展示站下载 zip（或者直接复制 `kit/` 和需要的模板），保持 `templates/<目录>/x.html` 和 `kit/` 的相对位置，或者改模板 `<head>` 里的三个引用路径。
2. 固定设计语言和主题：`<html lang="zh-CN" data-lang="google" data-scheme="dark" style="--accent:#006a6a">`。也可以用 URL 参数临时切换：`?lang=google&scheme=dark&accent=%23006a6a&scale=1.2&contrast=more&glass=0.3&density=compact`（`glass` 可以是 0～1 的透明度，也可以是 `clear` / `opaque`）。
   动效按需开启：标签栏加 `data-minimize`（向下滚动时最小化），sheet 加 `data-detents="medium large"`（可拖动分档）。
3. 只要一种语言时，删掉 `kit/ui.css` 里另一种语言的 `@import`。
4. 写新页面：照 `kit/COMPONENTS.md` 的骨架和类名写，页面专用样式只用 `--ui-*` / `--c-*` token，两种语言和明暗就都对。

## 工具

都在 `ui-gallery` 目录下运行（需要 Node 18+；截图用 Playwright 自带的 chrome-headless-shell）。

| 命令 | 作用 |
| :--- | :--- |
| `node tools/lint.mjs [文件…]` | 静态检查：必需的 meta、kit 引用、未定义的类名、不存在的图标、外部资源 |
| `node tools/audit-all.mjs [并发] [过滤]` | 渲染审查全部模板（按平台选宽度、两种语言）：横向溢出、缺失图标、JS 报错 |
| `node tools/build-registry.mjs` | 生成 `gallery/registry.js`（模板清单）和 `gallery/sources.js`（源码，用于代码页和 zip） |
| `node tools/build-thumbs.mjs [--force] [并发] [过滤]` | 生成缩略图到 `gallery/thumbs/`，增量更新 |
| `node tools/shot.mjs shot tools/sheet.html <png> <宽> <高> "t=../templates/app/x.html&safe=62,34"` | 截一张 Apple/Google × 浅/深 的四联图（`combos=`、`w=`、`h=`、`y=` 可调） |
| `node tools/shot-gallery.mjs "#/t/app/settings" <png>` | 截展示站本身，并打印页面 JS 报错 |
| `node tools/build-icons.mjs <lucide-static 解压目录>` | 重新生成 `kit/icons.js`（Material Symbols 从 npmmirror 下载并缓存） |
| `node tools/build-generated.mjs` | 重新生成 `kit/generated.css`（弹簧动效曲线、形状遮罩、M3 加载指示器的形状变形关键帧） |
| `node tools/build-kit-js.mjs` | 把 `kit/src/*.js` 拼成 `kit/ui.js`（改运行时后必须运行） |
| `node tools/build-m3color.mjs <包目录> <esbuild 包目录>` | 把官方 material-color-utilities 打包成 `kit/src/m3color.js` |
| `node tools/build-fonts.mjs <fontsource 解压目录>` | 重新生成 `kit/fonts/` 和 `kit/fonts.css` |
| `node tools/check-runtime.mjs` | 检查运行时配色和玻璃参数是否生效 |

新增或修改模板后：`lint` → `audit-all` → `build-thumbs` → `build-registry`，再刷新展示站。

## 来源与取舍

- **Apple**：系统色（含增强对比度）取自 [HIG Color](https://developer.apple.com/design/human-interface-guidelines/color)；材质规则取自 [HIG Materials](https://developer.apple.com/design/human-interface-guidelines/materials)；iOS 27 的变化（透明度滑杆、加暗边缘、统一顶栏背景、Prominent Tab）参考 [Apple Developer 新闻](https://developer.apple.com/news/?id=e2lxw9l1) 和 [MacRumors](https://www.macrumors.com/2026/06/10/how-liquid-glass-is-changing-in-ios-27)；组件尺寸多数来自第三方对官方设计套件的测量（[seunghan91/ios27-design-system](https://github.com/seunghan91/ios27-design-system)），可信度在校准表里逐项标注。
- **Google**：尺寸、字号、形状、色彩角色和弹簧参数对照 [Compose Material3 生成 token](https://github.com/androidx/androidx/tree/androidx-main/compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/tokens)；配色在运行时用官方 [material-color-utilities](https://github.com/material-foundation/material-color-utilities)（Apache 2.0，HCT、Tonal Spot、2025 色彩规范）计算，没有 JS 时退回 OKLCH 近似。
- **Liquid Glass 只做了模糊、饱和度、高光和边缘**：没有真实的折射透镜效果。透明度滑杆的映射曲线 Apple 没有公开，是估计值。
- **弹簧动效**：SwiftUI 弹簧和 M3 motion scheme 的参数按物理公式积分成 CSS `linear()` 曲线，是近似值。M3 加载指示器按官方形状顺序变形，形状本身是近似。
- **字体**：随附 Inter、Google Sans Flex、Noto Sans SC（`kit/fonts/`，均为 SIL OFL 1.1）。Apple 设备上 `-apple-system`（SF Pro + 苹方）排在前面；其他系统上 Apple 模式用 Inter + Noto Sans SC，Google 模式用 Google Sans Flex + Noto Sans SC。SF Pro 和 SF Symbols 按 Apple 许可只能用于 Apple 平台应用的设计，所以没有用。
- **图标**：Apple 模式用 [Lucide](https://lucide.dev)（ISC），Google 模式用 [Material Symbols](https://fonts.google.com/icons)（Apache 2.0）。
- **进行中**：`kit/scenes/` 是程序生成的矢量插画（用来替换模板里的渐变占位图），还没有接入模板；`tools/build-thumbs.mjs` 已改为 2 倍分辨率，但多数缩略图还是旧分辨率，需要重新运行 `node tools/build-thumbs.mjs --force`。
- 这是参照两家规范写的风格实现，不是官方组件，不含任何商标；模板里的品牌名（Aurora、拾光、Flowline 等）和数据都是虚构的。
