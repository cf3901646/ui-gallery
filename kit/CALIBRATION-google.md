# Google（Material 3 Expressive）校准记录

逐项对照在 `kit/specs-google.json`（241 项）。本文说明数据来源、结果和没做到的部分。

## 数据来源

Compose Material3 的生成 token，androidx 仓库 `androidx-main` 分支（Apache-2.0）：

- 目录：[compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/tokens](https://github.com/androidx/androidx/tree/androidx-main/compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/tokens)
- 读取方式：`https://raw.githubusercontent.com/androidx/androidx/androidx-main/compose/material3/material3/src/commonMain/kotlin/androidx/compose/material3/tokens/<文件名>.kt`
- 读取时间：2026-10-30。每个文件的 `// VERSION:` 注释写进了 JSON 的 `source` 字段。

主要文件和版本：

| 范围 | 文件（VERSION） |
| :--- | :--- |
| 字体 | TypeScaleTokens（v0_103）、TypographyTokens（31.0.11） |
| 形状 / 高度 | ShapeTokens（14_1_0）、ElevationTokens（v0_103） |
| 动效 | ExpressiveMotionTokens、StandardMotionTokens（均 v0_14_0）、MotionSchemeKeyTokens（无版本注释） |
| 按钮 | ButtonXSmall / Small / Medium / Large / XLargeTokens、BaselineButtonTokens、TonalButtonTokens、OutlinedButtonTokens、TextButtonTokens（均 v0_11_0） |
| 图标按钮 | XSmall / Small / Medium / XLargeIconButtonTokens（14_1_0）、LargeIconButtonTokens（v0_11_0）、IconButtonTokens（14_1_0） |
| FAB / 工具栏 | FabBaseline / Medium / Large、FabPrimaryContainer、ExtendedFabSmall / Medium / Large（v0_14_0）、FloatingToolbarTokens（12_0_0）、DockedToolbarTokens（14_0_0） |
| 导航 | NavigationBarTokens、NavigationBarVerticalItemTokens、NavigationRail*（v0_11_0）、NavigationDrawerTokens（v0_210）、PrimaryNavigationTabTokens（v0_162） |
| 顶栏 | AppBarTokens、AppBarSmall / MediumFlexible / LargeFlexibleTokens（14_0_0） |
| 组合按钮 | ConnectedButtonGroupSmallTokens（14_1_0）、ButtonGroupSmallTokens（v0_11_0）、SplitButtonSmallTokens（18_0_18）、OutlinedSegmentedButtonTokens（v0_162） |
| 内容 | FilterChipTokens（7_0_1）、ChipsTokens（37.2.1）、Filled / ElevatedCardTokens（v0_210）、OutlinedCardTokens（v0_192）、ListTokens / ExpandedListTokens（29.0.0） |
| 控件 | SwitchTokens（v0_210）、SliderTokens（v2_3_5）、RadioButtonTokens（v0_117）、Outlined / FilledTextFieldTokens（v0_103 / v0_210）、SearchBarTokens（v0_210） |
| 反馈 | Linear / CircularProgressIndicatorTokens（v0_7_0）、ProgressIndicatorTokens（v0_4_0）、LoadingIndicatorTokens（v0_7_0）、BadgeTokens、SnackbarTokens（v0_103）、PlainTooltipTokens |
| 浮层 | DialogTokens、SheetBottomTokens、MenuTokens（v0_210）、StandardMenuTokens / SegmentedMenuTokens（24.1.2） |

token 里没有的值，从同目录上一级的组件源码读：`Button.kt`（按尺寸选字体、text 按钮颜色）、`Chip.kt`（元素间距、形状弹簧）、`FloatingToolbar.kt`（阴影）、`LoadingIndicator.kt`（形状序列、时长）。

JSON 的 `confidence`：`official` = 生成 token；`official-source` = 组件源码里的默认值；`official-provisional` = token 文件里手写、标注 TODO 的值（emphasized 字体）；`derived` = 由官方值推出的做法；`inferred` = 没在源码里逐行核对（只有筛选片内边距一项）。

## 结果

| 状态 | 数量 | 含义 |
| :--- | ---: | :--- |
| match | 141 | 原来就一致（±1px） |
| fixed | 75 | 这次改到一致，或补上缺的类 |
| deviation | 25 | 有意不同或做不到，原因见 JSON 的 `note` |

色彩角色的推导公式（`--md-*` 那一大段 `oklch(from …)`）没有动，它们是没有 JS 时的后备，运行时由 ui.js 的 HCT 算法覆盖。这次只核对了“组件用哪个角色”。

### 主要修正

- **字体**：title-medium 字距 0.15 → 0.2，body-medium 0.25 → 0.2（v0_103 新值）；title-large 改用 Brand 字体栈；新增 `.t-emphasized`（只在 Google 下生效）。
- **大标题**：`.page-title` 改为 large flexible 顶栏的 DisplaySmall 36/44（原来 32）；`.page-title.medium` 补齐 HeadlineMedium 行高。顶栏副标题改为 LabelMedium。
- **按钮**：`.xs` 内边距 16、间距 8；`.lg` 图标 24、按下 12；`.xl` 内边距 48、图标 32、按下 16、描边 2；新增 `.btn.xxl`（XLarge 136）；方形按钮按下也会变形；禁用态改为 OnSurface 10% 容器 + 38% 内容。
- **图标按钮**：`.lg` `.xl` 默认改回圆形（原来固定是方形），新增 `.icon-btn.square` 和 `.icon-btn.xxl`；按下、选中形状按尺寸分档；`.sm` 图标 20。
- **按钮组 / 分割按钮**：按下只收内角（4 / 12），不再把外侧全圆角压掉；分割按钮内边距 16/12、13/13，尾图标 22。
- **形状变形的时长**：base.css 用 effects 时长（272ms）配 FastSpatial 曲线，弹簧被压快约 1.5 倍；Google 层改为用 FastSpatial 自己的 404ms。
- **色彩角色**：导航栏和导航轨选中标签 → Secondary；vibrant 浮动工具栏选中按钮 → SurfaceContainer / OnSurface；筛选片未选中前置图标 → Primary；搜索栏前置图标 → OnSurface；菜单容器 → SurfaceContainerLow；列表头像 → PrimaryContainer；深色卡片 → SurfaceContainerHighest；标签页分隔线 → OutlineVariant；拖动条去掉 40% 透明度。
- **尺寸 / 形状**：卡片圆角 16 → 12；分段列表外圆角 20 → 16，元素间距 16 → 12，新增悬停形状 12；菜单项 XS4（首尾 12）、BodyLarge 16、左右 16；FAB 不再按下变形，`.fab.lg` 图标 32，扩展 FAB 内边距 16/16；浮动工具栏阴影 Level3 → Level1；单选框 20；滑块把手间隙 6；徽标字重 500；提示条与对话框正文字距 0.2。
- **波浪进度**：振幅 3、波长 40、线宽 4，停止点不再被裁成椭圆。
- **加载指示器**：形状占容器 38/48。

### 主要偏差

- **按钮尺寸映射**：没有按“默认 = Medium”映射。Compose 的 `Button()` 默认是 Baseline 40dp，而且 45 处 `.btn.lg` 是 56 高的整行主按钮，若 `.lg` 变 96、默认变 56，大量模板会变形。现在每个 kit 类都与一档官方尺寸完全一致：`.xs` = XSmall、`.sm` = Small、默认 = Baseline、`.lg` = Medium、`.xl` = Large、`.xxl` = XLarge。
- **页面底色**：浅色 `--ui-bg` 是 surface-container（分段列表才浮得出来）。因此顶栏容器、滚动后顶栏、连接按钮组未选中、浮动工具栏阴影、深色列表项这几处比官方高一级容器。
- **`.row-value`**：官方右侧辅助文字是 LabelSmall 11，试过后中文设置值太小，保留 14。
- **`.row-icon`**：彩色圆底图标是 Android 16 设置页的样式，不是 M3 列表 token（`.row-icon.plain` 与官方一致）。
- **`.segmented`**：采用连接按钮组的样式（M3 Expressive 推荐用它替代分段按钮），选中色仍按 SegmentedButton。
- **`.icon-btn.is-active`**：一个类服务多种变体，统一按 filled 切换按钮实底处理。
- **筛选片**：跟随 `FilterChipDefaults.shape` 的 8dp，没有采用新的 `shapes()` 形状变形（ChipsTokens 37.2.1）。
- **网页 `.site .btn`**：48 高是 Google Store 网页的做法，不在 Compose 尺寸体系里。
- 其余：display-large / display-small 没有 `.t-*` 角色；Level4/5 阴影、三行列表行高、可折叠顶栏高度、滑块停止点没有对应实现。

## 动效参数（与 kit 一致，SPRINGS 未改数值）

| 弹簧 | Standard（damping / stiffness） | Expressive（damping / stiffness） | kit 变量 → 时长 |
| :--- | :--- | :--- | :--- |
| FastSpatial | 0.9 / 1400 | 0.6 / 800 | `md-std-fast-spatial` 261ms · `md-exp-fast-spatial` 404ms |
| DefaultSpatial | 0.9 / 700 | 0.8 / 380 | `md-std-spatial` 350ms · `md-exp-spatial` 484ms |
| SlowSpatial | 0.9 / 300 | 0.8 / 200 | `md-std-slow-spatial` 475ms · `md-exp-slow-spatial` 651ms |
| FastEffects | 1.0 / 3800 | 1.0 / 3800 | `md-fast-effects` 187ms |
| DefaultEffects | 1.0 / 1600 | 1.0 / 1600 | `md-effects` 272ms |
| SlowEffects | 1.0 / 800 | 1.0 / 800 | `md-slow-effects` 368ms |

`tools/build-generated.mjs` 里原有的 md-* 参数和官方完全相同，只补了来源注释；重新生成的 `generated.css` 与原文件逐字节相同。

## 做不到的部分

- **LoadingIndicator 形状序列**：官方不确定态依次变形 SoftBurst → Cookie9Sided → Pentagon → Pill → Sunny → Cookie4Sided → Oval，每 650ms 一次，整体 4666ms 转一圈；确定态从 Circle（旋转 18°）变到 SoftBurst。CSS mask 不能在两条不同路径之间插值，kit 仍是单一 cookie 形状加旋转。
- **环形进度**：用 border 画的圆环做不出轨道与指示器之间 4dp 的间隙；默认 24px（官方 40）。
- **不确定线性进度**的波浪动画、**导航轨**项目间距 4 / 顶部 44：相关规则在 base.css。

## 需要别人配合

- **base.css**：增加 `--ui-dur-spatial`（或让 border-radius 过渡直接用 `--spring-*-ms`），否则 Apple 侧同样存在曲线与时长不配套的问题；`.rail` 间距、`.spinner` 尺寸、不确定进度动画如需对齐，也在 base.css。
- **apple.css**：新增类 `.btn.xxl`、`.icon-btn.xxl`、`.icon-btn.square`、`.t-emphasized` 目前只在 Google 下定义，Apple 下 `.xxl` 会回退为默认尺寸，需要补一条（例如等同 `.xl`）。
- **ui.js**：如果要做 LoadingIndicator 的形状变形，需要用 SVG path morph（或由 build-generated.mjs 预生成序列帧）。HCT 接入后，请确认 `--md-surface-bright` 在浅色下仍与 `--md-surface` 同值，分段列表依赖它。

## 验证

- 截图（Google 浅色 / 深色）：settings、shop-home、overlays、tablet-mail、desktop-admin、web/pricing，以及 `_catalog.html` 的按钮区，无重叠、裁切、看不清。
- `node tools/lint.mjs`：85 个模板，0 个有问题。
- `node tools/shot.mjs audit`：settings、shop-home、overlays（402）、tablet-mail（1180）、desktop-admin（1440）、pricing（390 / 1280）、_catalog（402），两种语言 overflowX 都是 0，missingIcons 为空。
