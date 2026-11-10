# AGENTS.md

> 供 AI 编码 Agent 阅读的仓库事实与约定。通用的测试执行/Review 规范见 [docs/agent-testing.md](docs/agent-testing.md)，GitHub Pages 发布核验见 [docs/agent-release.md](docs/agent-release.md)。
> 修改本文件需同步更新相关代码描述。

## 项目概述

沸点火锅点单与门店履约概念演示应用（`hdl-order-demo`）。React SPA，业务逻辑全部在浏览器内存中运行，不依赖后端 API。`server/` 仅为可选的健康检查 Express 应用（`server/src/index.ts` 提供 `GET /ping`，监听端口 3001），不参与核心链路。

主流程视图状态机：`home → welcome → menu → order → checkout`。视图经 hash 路由与 URL 一一对应（`#/home`、`#/welcome`、`#/menu`、`#/order`、`#/checkout`），支持深链接与浏览器前进/后退；选用 hash 模式（非 History 模式）以兼容 Vite `base './'` 与 GitHub Pages 子路径部署。

运行时入口补充：

- 预览态：在应用根地址后追加 `?preview=menu`（如 `http://localhost:<port>/?preview=menu`，端口以 Vite 启动日志为准）会预置 A08 桌台、`products[2]`（`p3`「琥珀嫩牛肉」）1 件购物车商品，规格由 `menu.option.full` · `menu.option.original` 组成（显示为「整份 · 原味」），下单人 `姚乾`，并进入 `menu` 视图；`createInitialState` 先判断 preview，因此预览态优先于 hash（如 `?preview=menu#/order` 会进入 `#/menu`）。
- 深链接：首次直接打开 `#/welcome`、`#/menu`、`#/order`、`#/checkout` 时，`createInitialState` 依据 `initialViewFromHash` 自动绑定 A08；`#/home` 无需桌台。挂载后 `useViewRoute` 校验运行中的 hash 变化（浏览器前进/后退或手动改 hash）：`App.tsx` 的 `canView` 仅允许 `home` 或已绑定桌台的视图可达，未绑定桌台时其余视图不可达；非法/不可达 hash 由 `history.replaceState` 纠正并回落到 `home`。首次加载遇到无效 hash 也用 `history.replaceState` 规范化地址，不新增历史记录。

## 技术栈

React 18 · TypeScript ~5.6 · Vite 6 · Tailwind CSS 3.4 · Radix UI（Dialog）· lucide-react · class-variance-authority · i18next（中/英）· Playwright（E2E）。状态用 `useReducer` 内存态管理；ESM；路径别名 `@` → `src/`。

## 目录结构

```
src/
├── main.tsx               # 入口，挂载 React
├── App.tsx                # 根组件：useReducer + 视图路由 + 全局布局
├── types.ts               # AppState / AppAction / Product / CartItem / OrderItem / ServiceRequest
├── i18n.ts                # i18next 初始化 + zh/en 资源
├── index.css              # 基础样式、老人模式、过渡、自定义 utilities
├── state/orderReducer.ts  # 订单/购物车/服务/售罄/支付 reducer
├── data/menu.ts           # 菜品/分类/桌台静态数据
├── hooks/useElderlyMode.ts# 老人模式：localStorage + html.elderly
├── hooks/useViewRoute.ts  # 视图 ↔ URL hash 双向同步（含深链接/非法地址纠正）
├── lib/utils.ts           # cn（类名合并）、money（¥ 格式化）
├── components/
│   ├── HomeView.tsx       # 首页：选择/绑定桌台
│   ├── WelcomeView.tsx    # 入座欢迎页，进入点餐
│   ├── MenuView.tsx       # 菜单浏览、搜索、筛选与加购
│   ├── OrderView.tsx      # 已下订单、履约进度与加菜/退菜
│   ├── CheckoutView.tsx   # 结账与支付成功态
│   ├── TopBar.tsx         # 顶部栏：桌台、导航、服务、会员、语言与老人模式入口
│   ├── CartPanel.tsx      # 购物车面板：桌面侧栏与移动弹窗共用 compact 形态，数量调整、金额汇总与提交订单
│   ├── ServiceSheet.tsx   # 服务呼叫面板：加汤、饮料、餐具、结账及服务记录
│   ├── DemoConsole.tsx    # 演示控制台：履约阶段、服务响应、售罄与重置
│   └── ui/                # 通用件：button（CVA Button）、dialog（Radix Dialog 封装）
└── assets/                # hotpot/broth/beef/vegetables 图片
e2e/super-spicy.spec.ts    # 超级辣风险提示 E2E 验收
e2e/view-routing.spec.ts   # 视图 URL hash 路由 E2E 验收
e2e/welcome-view.spec.ts   # 欢迎页入口/返回选桌/偏好保持 E2E 验收
e2e/readme-bilingual.spec.ts # 中英文 README 链接与内容一致性 E2E 验收
e2e/agents-md.spec.ts      # 本文件仓库事实校准 E2E 验收
index.html                 # 入口，含初始化语言的内联脚本
tailwind.config.js         # 自定义色板；vite.config.ts 配 base './' 与 @ 别名
playwright.config.ts       # E2E 配置
README.md                  # 中文默认 README
README.en.md               # 英文 README
docs/agent-testing.md      # E2E 执行与 Review 规范
docs/agent-release.md      # GitHub Pages 发布核验 runbook
.github/workflows/deploy-pages.yml # push main 构建并发布 dist
```

> 页面级视图组件统一以 `*View.tsx` 命名，文件名与视图状态一一对应（`home`→`HomeView`、`welcome`→`WelcomeView`…）。新增视图时同步：`ViewName` 类型、`useViewRoute` 的 `VIEWS`、对应 `*View.tsx` 组件。

文档地图：`README.md`（中文默认版）与 `README.en.md`（英文版）面向使用者；`docs/agent-testing.md` 承载 E2E 执行/用例规范，`docs/agent-release.md` 承载 GitHub Pages 发布核验；`.github/workflows/deploy-pages.yml` 是发布工作流入口。

## 样式约定

颜色类名直接硬编码在 JSX（如 `bg-rice-100`、`text-charcoal-900`、`border-charcoal-900/5`），不用 CSS 变量或语义 token 层，新组件沿用此模式。

`tailwind.config.js` 的自定义色板：

| 色系 | 色阶 | 用途 |
| --- | --- | --- |
| rice | 50 `#fffdf8` / 100 `#fbf5ea` / 200 `#f3e6d0` | 背景、卡片、次级面板 |
| charcoal | 500 `#5f5b55` / 700 `#34312d` / 900 `#211f1c` | 文字、深色背景 |
| chili | 50 `#fff1ef` / 100 `#ffddd8` / 500 `#e13b2b` / 600 `#c92f21` / 700 `#a9231a` | 按钮、强调、徽章 |
| amber | 100 `#fff2c7` / 400 `#f5b83f` / 500 `#e69b18` | 徽章、进度色 |

当前为单一浅色主题，Tailwind 未配置 `darkMode`，组件中没有 `dark:` 变体。全局颜色/字号变化有 250ms 过渡（`src/index.css`），老人模式切换无需额外动画。

## 编码约定

- 页面组件放 `src/components/`，通用件放 `src/components/ui/`；弹窗用封装的 `Dialog`，按钮用 CVA `Button`（default/secondary/outline/ghost），图标用 lucide-react 并靠 `currentColor` 继承。
- 样式只用 Tailwind 类名，不用 CSS Modules / styled-components。
- 新增 i18n 文案在 `src/i18n.ts` 的 zh/en 两处同步添加，按功能分组（`common.`、`menu.`、`cart.`、`order.` 等）。
- 新增 `localStorage` 持久化一律 `try/catch` 包裹，不可用时降级内存态；现有 key：`i18nextLng`、`elderly-mode`（`true`/`false`）。
- 需要在 React 挂载前设置 html 属性/class 时，扩展 `index.html` 的内联脚本。
- npm 源默认走 `https://registry.npmmirror.com`（见根目录与 `server/.npmrc`）。

### 同步维护规则

1. 新增或重命名视图时，同步修改 `src/types.ts` 的 `ViewName`、`src/hooks/useViewRoute.ts` 的 `VIEWS`、对应 `src/components/*View.tsx`、`src/App.tsx` 的渲染分支与布局，以及本文件「目录结构」。
2. 新增或修改 i18n 文案时，同步更新 `src/i18n.ts` 的 zh/en 两套资源；新增 `localStorage` key 时，读写必须 `try/catch` 降级，并把 key 与取值加入本文件「编码约定」的现有 key 列表。
3. 新增或修改 npm script、环境变量、E2E 配置或发布工作流时，同步更新本文件「验证命令」，并同步调整 `docs/agent-testing.md`、`docs/agent-release.md` 的对应说明。
4. 新增或修改用户可见行为、路由或预览态时，同步更新 `e2e/` 下对应行为用例；凡是改变本文件所述事实的代码变更，都必须在同一个 PR 内同步更新 `AGENTS.md`。

## 验证命令

| 命令 | 作用 |
| --- | --- |
| `npm ci` / `npm install` | 安装依赖（缺 `node_modules` 时先装） |
| `npm run build` | `tsc -b && vite build`，产物到 `dist/` |
| `npm run lint` | ESLint，零警告通过 |
| `npx tsc -b --noEmit` | 仅类型检查 |
| `npx playwright test` | E2E，webServer 自动拉起 `npm run dev` |

包管理器以 npm 为准：CI 使用 `npm ci`，仓库脚本通过 `npm run *` 执行。仓库内虽同时存在 `pnpm-lock.yaml`、`pnpm-workspace.yaml`，但它们不是本仓的安装或验证入口，不要用 pnpm 替代。

E2E 浏览器由环境预装，`playwright.config.ts` 通过 `PLAYWRIGHT_CHROMIUM_PATH` 指定可执行文件（未设置时回退 `/opt/chromium.org/chromium/chrome`）；**禁止执行 `npx playwright install`**，浏览器缺失时改用环境变量指向已有的 Chrome。端口默认 `5173`，可用 `PLAYWRIGHT_PORT` 覆盖。E2E 的执行约束（报告路径、批量修复、不重跑等）与用例编写/自审规范见 [docs/agent-testing.md](docs/agent-testing.md)。

GitHub Pages 发布由 `.github/workflows/deploy-pages.yml` 负责：push 到 `main`（或手动 `workflow_dispatch`）触发，只执行 `npm ci` + `npm run build` 并发布 `dist`，CI 不跑 E2E；线上核验步骤见 [docs/agent-release.md](docs/agent-release.md)。

## 不要做

- 不引入额外的 UI 库或设计系统框架。
- 不使用 CSS Modules 或 styled-components。
- 不修改 `server/`（仅健康检查，无业务逻辑）。
- 不引入后端 API 调用，所有数据为前端内存态。
- 不执行 `playwright install` / `npx playwright install`；使用环境预装的浏览器并通过 `PLAYWRIGHT_CHROMIUM_PATH` 指定路径。
- 不使用 pnpm 安装依赖或执行验证命令；以 npm 与 `package-lock.json` 为准。
