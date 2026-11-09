# 52code 设计系统 · Signal Paper

> 品牌：**52code**（52 = 「我爱」，52code = 我爱 code）· 域名 **52code.ai**
> 定位：面向开发者的 AI API 网关（Claude Code / Codex / Gemini CLI 一个地址接入）
> 本文是前端改版的唯一视觉契约，所有页面改动以此为准。

## 1. 设计来源与取舍

| 来源 | 继承 | 不照搬 |
| --- | --- | --- |
| `dev-uiux` 分支（aihubx-nuxt） | 靛蓝主色 + 暖橙点缀的双色关系；Geist 字体；`eyebrow` 胶囊小标题；浅色纸面 + 柔光；primary-soft 激活态；1200px 内容宽度 | 主色从蓝靛 `#4b57f5` 偏移到 **Signal Indigo `#5b47e6`**；珊瑚橙 `#f06a3c` 改为 **Ember `#f2711c`**；冷白纸面改为暖白纸面 |
| aa8.ai | 等高线地形背景 + 沿线流动光点；等宽字体做标签与数字；超大标题 + 紧字距；Base URL 接入条（协议切换 + 复制）；路由拓扑图 + 请求流水；深色终端代码块；1px 内分隔线的拼贴数据网格；墨黑 CTA | 不用纯黑白 + 琥珀；等高线染靛蓝；数据示意必须标明「示意」，不伪造实时数据 |
| 52code 自有 | **「52▮」终端光标**品牌符号（ember 闪烁块）；Indigo × Ember 双信号；「我爱 code」语气 | — |

## 2. 色彩令牌（tailwind.config.js）

- `gray`（覆盖默认）：暖调纸面中性色。`gray-50 #f7f7f5` 为页面底色，`gray-200 #e4e4e0` 为默认描边，`gray-950 #0c0d10` 为墨色。
- `primary`：Signal Indigo。`600 #5b47e6` 为主按钮/激活态，`500 #7262f1` 为焦点环/深色模式主按钮，`50` 为浅底。
- `ember`（别名 `accent`）：信号橙。**只做点缀**：信号点、URL 路径高亮、光点、徽标、图表第二系列。单屏面积不超过 5%。
- `dark`：深色模式表面。`dark-950 #0a0a0d` 页面底，`dark-900` 卡片，`dark-800` 描边/悬停，`dark-700` 强描边。
- 语义色沿用 Tailwind：`emerald` 成功、`amber` 警告、`red` 危险、`sky` 信息。
- **禁止**：新增 teal / cyan 作为品牌色（平台语义色除外，如某平台固定配色）；渐变按钮；大面积紫色渐变背景。
- 图表颜色统一从 `src/utils/chartTheme.ts` 取（`CHART_SERIES` / `CHART_SEMANTIC` / `getChartChrome`）。
  - 分类色固定 8 个，顺序为：靛蓝、ember、青绿、黄、洋红、绿、蓝、红。浅色和深色各一套，都用 dataviz 校验脚本验证过：相邻对在色盲视觉下 ΔE ≥ 8，在正常视觉下 ΔE ≥ 15。改动色值或顺序后必须重新校验。
  - 系列超过 8 个时不新增色相。折线图从第 9 个系列起复用颜色并改成虚线（`seriesDash`），图例改用线段；环形图从第 8 项起并入「其他」（中性色），明细表照常列出全部条目。

## 3. 字体

- 正文/标题：`Geist Variable`（`font-sans`），中文回退 PingFang SC / 微软雅黑。
- 等宽：`Geist Mono Variable`（`font-mono`），用于：kicker 小标题、表头、金额/Token/时间、代码、URL、快捷键。
- 标题字距：大标题 `tracking-tightest (-0.045em)`，区块标题 `tracking-tight`；字重以 `font-semibold` 为主，避免 `font-bold/extrabold` 堆叠。
- 数字：`.num`（等宽 + tabular-nums）。

## 4. 形状、层级与动效

- 圆角：按钮/输入 `rounded-lg`(8px)，卡片 `rounded-xl`(12px)，弹窗 `rounded-2xl`(16px)，徽章 `rounded-md`。
- 层级靠**描边**而不是阴影：卡片 `border-gray-200/80 + shadow-card`（几乎无阴影）；浮层 `shadow-pop`。
- 焦点：输入框 `ring-4 ring-primary-500/10` 柔光环；键盘焦点 `focus-visible` 靛蓝外环。
- 动效：150–220ms，`ease-out`；必须尊重 `prefers-reduced-motion`。

## 5. 组件类（src/style.css，类名向后兼容）

`btn btn-primary|btn-ink|btn-secondary|btn-ghost|btn-danger|btn-success|btn-warning`、`btn-sm|md|lg|icon`、`input input-label input-hint input-error`、`card card-hover card-header card-body card-footer`、`stat-*`、`table-container table`、`badge badge-primary|success|warning|danger|gray|purple|ember`、`dropdown dropdown-item`、`modal-*`、`dialog-*`、`toast-*`、`tabs tab tab-active`、`progress progress-bar`、`switch*`、`code code-block`、`empty-state*`、`skeleton`。

新增品牌原语：

- `.kicker`：等宽大写小标题；与 `.signal-dot` 组合：`<p class="kicker"><span class="signal-dot"></span>CODING AI GATEWAY</p>`
- `.signal-dot`：ember 信号点 + 呼吸外环
- `.num`：等宽数字
- `.kbd`：键位提示
- `.chip`：协议/端点等轻标签（等宽）
- `.link`：正文链接
- `.section-title`：区块标题
- `.panel-grid`：1px 内分隔线拼贴网格（子元素自动白底），用于统计/特性网格
- `.btn-ink`：墨色主 CTA（深色模式反相为白）

布局外壳类（`.sidebar*`、`.page-*`）在 `src/styles/shell.css`。

## 6. 品牌组件与工具

- `@/components/brand/BrandMark.vue`：`<BrandMark size="sm|md|lg" :show-name :show-domain :animated />`，自动处理管理员自定义 Logo/站点名。
- `@/components/brand/SignalField.vue`：`<SignalField variant="hero|ambient" :particles :seed :intensity class="absolute inset-0" />`，父元素需 `relative`。hero 用于落地页首屏；ambient 用于控制台/认证页极淡背景。
- `@/composables/useBrand`：`const { siteName, siteLogo, hasCustomLogo, siteSubtitle, apiBaseUrl } = useBrand()`。**新代码一律用它取品牌值**，不要再写 `|| 'Sub2API'`。
- `@/utils/chartTheme`：图表配色。

## 7. 文案与语气

- 简洁、工程师口吻，不喊口号；中文为主，英文同步。
- 「52」=「我爱」，可在品牌位轻量使用「我爱 code」，不要滥用。
- 落地页的路由图、请求流水等**示意数据必须标注「示意 / Demo」**，不得冒充实时数据；不得虚构用户数、可用率等运营数字。
- 新文案放 `src/i18n/locales/{zh,en}/ui52/<模块>.ts`，以 `t('ui52.<模块>.xxx')` 引用，中英文 key 必须完全一致。

## 8. 工程约束（所有改版任务必须遵守）

1. **不改后端**（`backend/`），不改 API 调用、store 逻辑、路由守卫、props/emits 契约。
2. 只改样式与模板结构；保留所有 `id`、`data-testid`、`data-tour`、`aria-*`、引导（driver.js）选择器、表单 name。
3. 深色模式必须同步适配（每个浅色类都要有 `dark:` 对应）。
4. 移动端（≥360px）可用；表格保持横向滚动。
5. 不新增依赖（例外：L0 地基引入了自托管字体 `@fontsource-variable/geist` 与 `@fontsource-variable/geist-mono`，按 unicode-range 子集按需加载）；不使用 teal/cyan 作为品牌色；不引入渐变主按钮。
6. 自检：`pnpm exec vue-tsc --noEmit`；相关 vitest：`pnpm exec vitest run <路径>`；不要运行 `pnpm build`（会写入 backend/internal/web/dist）。
