# 写模板的任务说明（给子代理）

项目：`c:\网站\ui-gallery`，一个自用的 UI 模板库。同一份 HTML 通过 `<html data-lang="apple|google">` 在 Apple（iOS 26 / Liquid Glass）和 Google（Material 3 Expressive）两种设计语言之间切换，并支持明暗模式。

## 开始前必读

1. 完整读一遍 `kit/COMPONENTS.md`（类名、标记结构、token、图标 id、规则）。
2. 看 3 个参考模板，照它们的写法：`templates/app/settings.html`、`templates/app/music-player.html`、`templates/web/product-landing.html`。
3. 对某个类不确定时，在 `kit/base.css`、`kit/apple.css`、`kit/google.css` 里搜索它的定义。

## 硬性要求

- 只新建分配给你的文件，用 fs_write 写（UTF-8）。**不要修改** `kit/`、`tools/`、`gallery/` 下的任何文件，也不要改别人的模板。
- 模板骨架、meta、引用路径严格照 COMPONENTS.md 第 1 节。`<html lang="zh-CN" data-lang="apple">` 原样保留。
- 只用 kit 类名；页面专用样式写在页面 `<style>` 里，类名加页面前缀，颜色只用 token（`--ui-*`、`--c-*`）。照片、封面等内容可以写死颜色或用 `.art.aN`。
- 平台差异用 `.only-apple` / `.only-google`（例如 Android 的 FAB、iOS 的“通过 Apple 登录”）。
- 不加载外部资源。文案简体中文，数据真实具体（人名、价格、时间、地名），不写占位文字。
- 质量标准：像 Apple / Google 第一方应用或官网那样精致、信息密度合适；每个页面综合使用多种组件；**两种语言 × 明暗四种组合都要好看**。手机按 402×874 设计；平板 1180×820；桌面 1440×900；网页要在 390 和 1280 宽都正常（kit 已有 860px / 560px 断点）。
- 单个模板控制在 4～14 KB。

## 写完后的自检（必须做）

命令都在 PowerShell 5.1 里运行，`cwd` 设为 `c:\网站\ui-gallery`。规则：命令用 `;` 分隔，不能用 `&&`；命令里不要写中文；截图命令的查询串里 `&` 要写成 `` `& ``；`timeout` 设 300000。

1. 静态检查，修到全部 ✓：
   `node tools/lint.mjs templates/app/a.html templates/app/b.html`
2. 渲染审查（两种语言），`overflowX` 必须为 0，`missingIcons` 必须为空：
   `node tools/shot.mjs audit templates/app/a.html templates/app/b.html`
   平板/桌面/网页先设宽度：`$env:AUDIT_W='1180'; node tools/shot.mjs audit …`（桌面 1440，网页先 390 再 1280）
3. 截图目检：至少挑 4 个模板，每个截一张四联图（Apple 浅 / Google 浅 / Apple 深 / Google 深），用 read_file 看图，修掉重叠、文字被裁、深色下看不清、Google 模式布局错乱等问题：
   - 手机：`node tools/shot.mjs shot tools/sheet.html $env:TEMP\uig\shots\NAME.png 1620 874 t=../templates/app/NAME.html`&safe=62,34`
   - 平板：`node tools/shot.mjs shot tools/sheet.html $env:TEMP\uig\shots\NAME.png 2364 820 t=../templates/app/NAME.html`&w=1180`&h=820`&combos=apple-light,google-dark`
   - 网页：`node tools/shot.mjs shot tools/sheet.html $env:TEMP\uig\shots\NAME.png 2564 900 t=../templates/web/NAME.html`&w=1280`&h=900`&combos=apple-light,google-light`
   - 想看页面下半部分：把 h 调大（例如 2400），或者临时截更长的图。
4. 不要启动后台进程或开发服务器。

## 最后的汇报（简短）

- 新建的文件列表
- lint 与 audit 结果
- 发现的 kit 缺口（缺什么组件/样式，你在页面里怎么补的）
- 没做完或有疑问的地方
