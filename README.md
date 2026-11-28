# 一体化产品研发系统 · 原型

纯前端 Mock 原型，使用原生 JavaScript（ES Modules）和 Vite，不依赖后端。

## 常用命令

```bash
pnpm install      # 安装依赖
pnpm dev          # 本地开发（热更新）
pnpm build        # 生产构建，输出到 dist/
pnpm lint         # ESLint 检查
pnpm format       # Prettier 格式化
pnpm test         # 业务规则单元测试（Vitest）
pnpm test:regression                    # 行为回归：与上一次提交对比
pnpm test:regression -- --base <ref>    # 与指定提交 / 分支对比
pnpm test:regression -- --no-shots      # 跳过截图对比，速度更快
pnpm test:regression -- --functional    # 功能验收：只跑当前版本的业务场景
pnpm test:regression -- --functional --url http://localhost:3000/   # 直接用已启动的服务
```

回归测试会自动构建对照版本和当前工作区，然后做三类比对：按账号和页面遍历点击、5 条跨角色业务场景、页面截图。功能验收模式逐步执行业务场景，检查每一步可执行、预期提示出现且没有运行时错误。需要本机安装 Chrome 或 Chromium，也可以用 `CHROME_PATH` 指定浏览器路径。这些工具只是开发依赖，不影响 `pnpm dev` 和 `pnpm build`。

跨标签页验收：启动原型后运行 `node tools/regression/cross-tab.mjs http://localhost:5173`。

## 演示账号

所有账号的密码都是 `Demo@2026`，登录页下方可点选填入。同一浏览器配置中，用多个标签页打开同一个原型地址，可分别登录不同账号。项目、阶段审批、设计文档、开发检视、测试报告与发布记录保存在该原型的 localStorage 中，提交、退回及通过会同步到其他标签页，刷新后可继续。登录身份、选中的任务和编辑界面由每个标签页独立管理。

| 账号 | 角色 | 登录后进入 |
| --- | --- | --- |
| pm | 产品经理 | 个人工作台 |
| pjm | 项目经理 | 个人工作台 |
| dev | 开发工程师 | 个人工作台 |
| qa | 测试工程师 | 个人工作台 |
| reviewer | 检视工程师 | 个人工作台 |
| director / rdlead / testlead / qalead | 研发总监 / 研发主管 / 测试主管 / 质量主管 | 个人工作台（审批中心，可查看运营看板） |

鉴权通过 `src/core/auth.js` 的 `login / logout / currentUser` 访问；接入平台统一登录时实现同样三个方法并调用 `setAuthProvider` 即可。

阶段审核：立项、需求、设计文档、测试、发布在交付物页面提交，推送给项目配置的审核角色（基本信息页可调整，默认值见 `src/domain/approvals.js`），任意一位审核人通过或退回即可，退回必须填写意见。

## 目录结构

```
index.html            页面骨架（侧边栏、工作区、抽屉、弹窗容器）
src/
  main.js             入口：引入样式，并按固定顺序执行各模块的 init 步骤
  core/               基础设施：App 扩展点、DOM 工具、视图切换
  data/               Mock 数据：项目、角色与权限、资产
  domain/             业务规则（纯函数，可单元测试）：阶段流转、版本门禁、开发检视、设计、测试、检视门禁
  store/              全局界面状态、工作台布局，以及按项目隔离的生命周期业务数据（lifecycle.js）
  components/         通用 UI：外壳导航、弹窗/抽屉、提示、个人菜单、文档编辑器
  app/                根渲染、全局事件分发、启动
  pages/              页面：工作台、项目集、项目（各生命周期阶段）、项目调整、运营、资产、检视
  features/           跨页面的业务流程：阶段流转与门禁、AI 检视、版本锚点、审批等
  styles/             样式，按 main.js 中的引入顺序层叠
tests/domain/         业务规则单元测试
tools/regression/     行为回归工具
```

## 关键约定

**模块只做声明，副作用集中在 init 步骤。** 模块顶层只放函数、常量和扩展点注册。事件监听、函数包装、首次渲染等副作用都放在导出的 `init*` / `bind*` 函数里，由 `main.js` 的 `bootSequence` 按顺序调用。

**顺序不能随意调整。** 多个全局事件监听器依赖注册顺序（部分在捕获阶段调用 `stopImmediatePropagation`），后面的步骤也会包装前面步骤注册的函数。新增功能时追加到 `bootSequence` 末尾。

**扩展点（`src/core/app.js`）。** 会被其他模块包装或替换的函数登记在 `App` 上，例如 `App.renderTesting`、`App.renderLifecycle`。调用时必须写 `App.xxx()`，才能拿到最新的实现。扩展写法：

```js
const base = App.renderTesting;
App.renderTesting = function () {
  return banner() + base();
};
```

不会被覆盖的函数直接通过 `import` 使用。

**业务规则放在 `domain/`。** 规则函数只接收数据、返回结果，不读写全局状态。`features/` 和 `pages/` 中保留薄适配层，负责读取当前项目的数据，再调用规则。部分数据在首次读取时会创建默认值，提测 Commit 在读取门禁前会先同步，所以适配层用 getter 按需取数，保证取数时机和原来一致。

## 重构说明

本项目由单文件原型（`index.html` + `review-v5.js`）重构而来。重构前后用无头浏览器做了对比验证：6 个角色 × 所有导航入口与页内 Tab，共 3,282 步交互的 DOM 快照完全一致，168 个页面截图像素一致，且没有新增运行时错误。

各 `features/` 模块头部和 `bootSequence` 注释中保留了来源版本号（如 V48、V54），方便追溯。下一阶段建议：

- 阶段 A（已完成）：业务规则抽到 `domain/` 并补单元测试；5 类按项目隔离的数据合并到 `store/lifecycle.js`；带版本号的标识符统一改为语义命名。
- 阶段 B：将 `App` 上的多层包装链逐页合并为单一实现，减少扩展点数量。
- 阶段 C：将分散的事件监听收敛为基于 `data-action` 的统一分发表。
