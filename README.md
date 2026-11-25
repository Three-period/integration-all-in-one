# 一体化产品研发系统 · 原型

纯前端 Mock 原型，使用原生 JavaScript（ES Modules）和 Vite，不依赖后端。

## 常用命令

```bash
pnpm install      # 安装依赖
pnpm dev          # 本地开发（热更新）
pnpm build        # 生产构建，输出到 dist/
pnpm lint         # ESLint 检查
pnpm format       # Prettier 格式化
```

## 目录结构

```
index.html            页面骨架（侧边栏、工作区、抽屉、弹窗容器）
src/
  main.js             入口：引入样式，并按固定顺序执行各模块的 init 步骤
  core/               基础设施：App 扩展点、DOM 工具、视图切换
  data/               Mock 数据：项目、角色与权限、资产
  store/              全局状态与工作台布局持久化
  components/         通用 UI：外壳导航、弹窗/抽屉、提示、个人菜单、文档编辑器
  app/                根渲染、全局事件分发、启动
  pages/              页面：工作台、项目集、项目（各生命周期阶段）、项目调整、运营、资产、检视
  features/           跨页面的业务流程：阶段流转与门禁、AI 检视、版本锚点、审批等
  styles/             样式，按 main.js 中的引入顺序层叠
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

## 重构说明

本项目由单文件原型（`index.html` + `review-v5.js`）重构而来。重构前后用无头浏览器做了对比验证：6 个角色 × 所有导航入口与页内 Tab，共 3,282 步交互的 DOM 快照完全一致，168 个页面截图像素一致，且没有新增运行时错误。

各 `features/` 模块头部和 `bootSequence` 注释中保留了来源版本号（如 V48、V54），方便追溯。下一阶段建议：

1. 将 `App` 上的多层包装链逐页合并为单一实现，减少扩展点数量。
2. 把分散在 `features/` 中的业务规则（阶段门禁、审批、检视闭环）抽成不依赖 DOM 的纯函数，补充单元测试。
3. 将分散的事件监听收敛为基于 `data-action` 的统一分发表。
