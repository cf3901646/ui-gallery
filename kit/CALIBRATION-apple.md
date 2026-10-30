# Apple 模式校准记录：iOS 27

核对日期 2026-10-26。逐项数据在 `kit/specs-apple.json`（106 项），这里是摘要。

## 来源与可信度

| 来源 | 用来核对什么 | 可信度 |
| :--- | :--- | :--- |
| [HIG](https://developer.apple.com/design/human-interface-guidelines)（JSON 接口逐页读取，看 2026 年 change log） | 字号表、系统色、44pt 点按区、侧栏图标颜色、搜索标签、iPhone Duo | official |
| [Apple 新闻 2026-06-23](https://developer.apple.com/news/?id=e2lxw9l1) | iOS 27 设计套件发布：Liquid Glass 更新、组件和状态扩充、命名对齐代码 | official |
| [MacRumors 2026-06-10](https://www.macrumors.com/2026/06/10/how-liquid-glass-is-changing-in-ios-27) | 材质变化、透明度滑杆、统一工具栏背景 | 媒体报道，按 official 处理定性描述，不含数值 |
| [seunghan91/ios27-design-system](https://github.com/seunghan91/ios27-design-system) | 组件尺寸（`spacing.json`、`materials.json`，自称用 Figma REST API 量 kit 27.0.2） | third-party-measured |
| [App Store Connect 截图规格](https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications) | iPhone Duo 像素尺寸 | official（点尺寸是推算） |

第三方仓库要分开看：`spacing.json`、`materials.json`、`tab-bar.md`、`toolbar.md`、`sidebars.md` 带 `_measured` 或“实测”标注，采用；`toggle.md`、`sliders.md`、`segmented-control.md`、`menus.md`、`button.md`、`list-row.md` 引用的是 iOS 26 kit 节点，数值还是 iOS 18 以前的样式（例如开关 51×31、菜单圆角 13），而且和同仓库实测值互相矛盾，只记为 estimate，没有据此改 kit。

HIG 页面 2026 年的相关更新：Tab bars、Sidebars、Menus、Search fields（06-08）、Sheets（03-24，按钮位置）、Layout 与新页 Designing for iPhone Duo（09-09）。Buttons、Toolbars、Materials、Color、Typography、Toggles、Sliders、Segmented controls、Text fields、Lists、Alerts 在 2026 年没有改动。HIG 几乎不给 iOS 组件的点尺寸，所以尺寸主要来自第三方实测。

## iOS 27 改了什么，kit 怎么做

| 变化 | 来源 | kit 实现 |
| :--- | :--- | :--- |
| 材质对复杂背景扩散更强 | MacRumors | 模糊默认 14px → 18px，底色不透明度 62% → 70%（第三方 kit 实测 70%，原生截图解算 72.9%） |
| 玻璃周围新增加暗边缘 | MacRumors；第三方实测为 0.5pt 描边 | `--ui-glass-edge` 加外圈 `0 0 0 .5px`（浅 14% 黑 ≈ 白底上的 #dbdbdb；深 65% 黑）和 1.5px 暗晕 |
| 高光更亮 | MacRumors | 顶部内高光 85% → 100%，新增底部 45% 内高光，内圈亮边 55% → 75% |
| 设置里的透明度滑杆（ultra clear ↔ fully tinted） | MacRumors | 新变量 `--glass-t`（0–1，默认 .5）。底色 `96% − 26%t − 52%t²`，模糊 `28 − 20t px`，饱和 `210% − 60%t`，厚材质、统一工具栏背景、通栏侧栏同样随它变 |
| “降低透明度”“增强对比度”仍然生效 | MacRumors | `data-glass="opaque"` 与新加的 `prefers-reduced-transparency` 媒体查询给实色、零模糊，优先于 `--glass-t`；高对比模式补上系统灰的高对比值 |
| 内容滚到浮动栏下方时出现统一工具栏背景 | MacRumors；第三方按 hard scroll edge 建模 | `.topbar::before` 从“上实下虚渐隐”改为整条栏均匀铺页面底色（浅 85% / 深 72%，随 `--glass-t`）+ 模糊 + 底部发丝线 |
| “Separate Search” 改名 “Prominent Tab”，独立胶囊位可放任意标签 | 第三方 kit 实测；HIG Search fields 同期把搜索标签分为“标准标签 / 按钮外观” | 新增 `.tab.prominent`，与 `.tab.search` 同样式；主标签组与胶囊的玻璃间距 10 → 8 |
| 侧栏通栏、恢复彩色图标 | 第三方 kit 变更记录；HIG Sidebars 只确认了图标颜色指引的更新，仍写侧栏“可浮在 Liquid Glass 层上” | 新增 `.sidebar.edge`（`.sidebar.floating` 不变）；所有 Apple 侧栏的 `.side-item` 图标读 `--tint` |
| 组件尺寸调整 | 第三方 kit 实测 | 见下表 |

改动的尺寸（均为 third-party-measured）：导航栏 52 → 54，按钮行贴顶、下留 10，大标题上内边距 2 → 0；底部浮动工具栏 52 → 48、离底 50 → 32；按钮 Small / Medium / Large 内边距 12/16/24 → 10/14/20，圆角矩形按钮 14 → 12；列表行 48 → 52；搜索框 40 → 44；sheet 圆角 36 → 上 34 下 58、四周留边 8 → 6，全高 sheet 上圆角 38、顶到安全区，grabber 36×5 → 58×4，顶部工具栏 16/16/10；警告框内边距 22 → 14、按钮 44 → 48、标题正文块按 kit 排布；菜单圆角 26 → 34、最小宽 238；标签栏标签字距 +0.1 → 0（选中 −0.1）。

## 校准结果

106 项：**match 41，fixed 38，deviation 27**。来源可信度：official 22，third-party-measured 67，estimate 17。

主要偏差和原因：

- **字号表字重**（4 项）：HIG 的 Large Title / Title 1–3 默认字重是 Regular，kit 用的是 emphasized 字重（Bold / Semibold）。字号和行高 11 项全部一致。kit 把 `.t-title*` 当标题用，导航栏大标题本来也是 Bold，改成 Regular 会改变 83 个模板的层级，所以保留。
- **结构差异**：iOS 27 底部工具栏是多个 48pt 独立胶囊，kit 的 `.toolbar.floating` 是一条胶囊；列表没有 68pt Tall 变体；kit 保留 44（默认）和 56（XL）两档按钮，iOS 27 kit 只有 28 / 34 / 50。改这些要新类名或改 HTML 约定。
- **没有可靠来源**：开关、滑块、分段控件圆角、文本框、分组列表圆角、带图标行的分隔线缩进。kit 保持 iOS 26 版目测值，记为 estimate。
- **模糊半径**：第三方从 iOS 26.5 原生截图解算 regular σ ≈ 5.4pt，kit 用 18px，大得多。CSS 没有折射和随色度变化的 vibrancy，只能靠更大的模糊把复杂背景压平；这也符合“扩散更强”的方向，但数值是估计。
- **图标**：标签栏 SF Symbol 18pt（框高 28）对 Lucide 26px，按视觉字形大小对齐，无法按字号一一对应。
- **侧栏材质**：官方是亮度 / 饱和度混合的三层材质，CSS 用中性灰半透明近似；侧栏宽 320 由模板的 `--split-cols` 决定，未改。
- **iPhone Duo**：HIG layout 页（2026-09-09 版）已删去设备尺寸表，Duo 页只说“边距和安全区见 Apple Design Resources”。App Store 截图规格给出外屏 1398×2034 px、内屏 2007×2853 px，四个值都能被 3 整除，按 @3x 推算为 **外屏 466×678 pt、内屏 669×951 pt**（推算，未经官方确认）。外屏和内屏横屏时工具栏、标签栏在侧边竖排，kit 没有实现。

## 做不到的部分

- 真实折射和透镜：`backdrop-filter` 只能模糊、调色，不能按形状弯折背景。
- 随背景色度变化的饱和度：原生材质对灰、红、青、品红的增强各不相同，CSS 只有一个 `saturate()`。
- 官方用 `LINEAR_BURN` / `LINEAR_DODGE` 混合模式画选中态和未选中图标；kit 用半透明叠色近似，复杂背景上的对比度会有差别。
- 透明度滑杆的真实曲线：没有任何来源公开，`--glass-t` 的映射是估计。默认点（t = .5 → 70%）与第三方实测值对齐。
- 标签栏滚动最小化与菱形符号：由 `kit/motion.css` 负责，不在本文件。
- iPhone Duo 竖向栏、折叠区（reserved regions）。

## 验证

截图（Apple 浅 / 深，部分加 `glass=clear` 和 `glass=opaque`）：settings、feed（含滚动后的统一工具栏背景、`--glass-t` = 0 / 1 / clear 三种）、music-player、overlays（警告框、sheet、全高 sheet、菜单）、media-library（`.tab.search` 与 `.tab.prominent`）、tablet-mail（`.sidebar.floating` 与 `.sidebar.edge`）、note-editor、article、web/product-landing。`node tools/lint.mjs`：85 个模板 0 问题。手机 402、平板 1180、网页 390 的 audit：overflowX 全部为 0，没有缺失图标。
