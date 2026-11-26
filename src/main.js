/**
 * Application entry.
 *
 * Feature modules only declare code; their init steps run here in a fixed
 * order because later steps wrap functions and register event listeners that
 * depend on earlier ones.
 */
import './styles/base.css';
import './styles/approval-dashboard.css';
import './styles/operations-analytics.css';
import './styles/reviewer-tasks.css';
import './styles/asset-gallery.css';
import './styles/review-evidence.css';
import './styles/report-stage-gate.css';
import './styles/lifecycle-flow.css';
import './styles/design-testing-scope.css';
import './styles/document-approval.css';
import './styles/review-process.css';
import './styles/lifecycle.css';
import './styles/login.css';
import './styles/responsive.css';

import { currentUser } from './core/auth.js';
import { enterApp, setBoot, showLogin } from './app/session.js';
import { App } from './core/app.js';

// Modules that only register extension points on App.
import './app/render.js';
import './pages/project/basic.js';
import './pages/project/lifecycle.js';
import './pages/project/overview.js';

import { bindActionEvents } from './app/events.js';
import { startApp } from './app/start.js';
import {
  bindRequirementDrawerEvents,
  bindRequirementPageEvents,
  bindRequirementListEvents,
} from './pages/project/requirements.js';
import { bindNavGroupEvents, bindResponsiveNav } from './components/shell.js';
import { initAdjustmentCleanup } from './pages/adjustment/adjustment.js';
import { bindProfileMenu } from './components/profile-menu.js';
import { bindFlowViewEvents } from './pages/project/planning.js';
import { bindReadonlyGuard } from './pages/project/lifecycle.js';
import { bindDesignEvents } from './pages/project/design.js';
import { bindDevelopmentEvents } from './pages/project/development.js';
import { bindTestingEvents } from './pages/project/testing.js';
import { bindReleaseEvents } from './pages/project/release.js';
import { bindClosingEvents } from './pages/project/closing.js';
import { initReportVersioning } from './pages/project/reports.js';
import { initChangeManagement } from './pages/adjustment/changes.js';
import { initRiskManagement } from './pages/adjustment/risks.js';
import { initBugManagement } from './pages/adjustment/bugs.js';
import { initOperations } from './pages/operations.js';
import { initDocEditor } from './components/doc-editor.js';
import { initDevReview } from './features/dev-review.js';
import { initStageProgress } from './features/stage-progress.js';
import { initReviewerTasks } from './pages/review/reviewer-tasks.js';
import { initAssetGallery } from './pages/assets.js';
import { initReviewEvidence } from './pages/review/evidence.js';
import { initReportStageGate } from './features/report-stage-gate.js';
import { initVersionAnchor } from './features/version-anchor.js';
import { initStageApproval } from './features/stage-approval.js';
import { initLifecycleFlow } from './features/lifecycle-flow.js';
import { initInlineDocuments } from './features/inline-documents.js';
import { initStageGate } from './features/stage-gate.js';
import { initDesignTestingScope } from './features/design-testing-scope.js';
import { initDocumentApproval } from './features/document-approval.js';
import { initReadonlyReportDrawers } from './features/readonly-report-drawers.js';
import { initReviewProcess } from './pages/review/review-process.js';

const bootSequence = [
  bindReadonlyGuard, // 未开始阶段只读保护（需最先注册，先于其他捕获阶段监听）
  bindActionEvents, // V1.3 全局 data-action 事件分发
  startApp, // 加载布局、绑定全局事件
  bindRequirementDrawerEvents, // 需求抽屉事件
  bindNavGroupEvents, // 侧边栏分组展开/收起
  bindResponsiveNav, // 平板 / 手机：侧栏抽屉开关
  initAdjustmentCleanup, // 项目调整页移除评审管理入口
  bindProfileMenu, // 个人菜单（个人信息 / 修改密码 / 退出）
  bindFlowViewEvents, // 流程视图节点导航
  bindRequirementPageEvents, // 需求列表页交互
  bindRequirementListEvents, // 需求列表打开抽屉
  bindDesignEvents, // 设计阶段交互
  bindDevelopmentEvents, // 开发阶段交互
  bindTestingEvents, // 测试阶段交互
  bindReleaseEvents, // 发布阶段交互
  bindClosingEvents, // 结项阶段交互
  initReportVersioning, // V37 测试报告 / 紧急下发评审 / 发布版本
  initChangeManagement, // V1.4 变更管理
  initRiskManagement, // V1.5 风险管理
  initBugManagement, // V1.6 缺陷管理
  initOperations, // 运营看板
  initDocEditor, // V33 在线文档编辑器
  initDevReview, // V35/V45/V46 开发与 AI 检视
  initStageProgress, // V38 跨阶段共享状态
  initReviewerTasks, // V41 检视任务入口与 AI 检视运营
  initAssetGallery, // V42 业务资产管理
  initReviewEvidence, // V43 检视证据抽屉
  initReportStageGate, // V49.1 测试报告 / 复盘只读门禁
  initVersionAnchor, // V52 跨阶段 Commit 锚点与测试/发布/结项门禁
  initStageApproval, // 阶段审核：提交、审核通过 / 退回
  initLifecycleFlow, // V47 统一 Mock 生命周期与角色门禁
  initInlineDocuments, // V47 需求/设计抽屉内联文档
  initStageGate, // V48 阶段门禁与集中审批
  initDesignTestingScope, // V53 设计导航 / 可选测试报告 / 冒烟报告
  initDocumentApproval, // V54 文档驱动的阶段审批
  initReadonlyReportDrawers, // V54.1 报告抽屉只读
  initReviewProcess, // V56 检视流程 V5
  () => App.render(), // 所有模块注册完成后首次渲染
];

setBoot(() => bootSequence.forEach((step) => step()));
const user = currentUser();
if (user) enterApp(user);
else showLogin();
