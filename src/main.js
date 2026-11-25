/**
 * Application entry.
 *
 * Feature modules only declare code; their init steps run here in a fixed
 * order because later steps wrap functions and register event listeners that
 * depend on earlier ones.
 */
import './styles/base.css';
import './styles/approval-dashboard.css';
import './styles/layout-refinements.css';
import './styles/operations-analytics.css';
import './styles/reviewer-tasks.css';
import './styles/asset-gallery.css';
import './styles/review-evidence.css';
import './styles/report-stage-gate.css';
import './styles/lifecycle-flow.css';
import './styles/design-testing-scope.css';
import './styles/document-approval.css';
import './styles/professional-review.css';
import './styles/role-mapping.css';
import './styles/review-process.css';

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
import { bindNavGroupEvents } from './components/shell.js';
import { initAdjustmentCleanup } from './pages/adjustment/adjustment.js';
import { bindProfileMenu } from './components/profile-menu.js';
import { bindFlowViewEvents, bindFlowchartKeyboard } from './pages/project/planning.js';
import { bindDesignEvents } from './pages/project/design.js';
import { bindDevelopmentEvents } from './pages/project/development.js';
import { bindTestingEvents } from './pages/project/testing.js';
import { bindClosingEvents } from './pages/project/closing.js';
import { bindReleaseEvents } from './pages/project/release.js';
import { initReportVersioning } from './pages/project/reports.js';
import { initChangeManagement } from './pages/adjustment/changes.js';
import { initRiskManagement } from './pages/adjustment/risks.js';
import { initBugManagement } from './pages/adjustment/bugs.js';
import { initOperations } from './pages/operations.js';
import { initDocEditor } from './components/doc-editor.js';
import { initDevReview } from './features/dev-review.js';
import { initStageProgress } from './features/stage-progress.js';
import { initDemoScenarios } from './features/demo-scenarios.js';
import { initReviewerTasks } from './pages/review/reviewer-tasks.js';
import { initAssetGallery } from './pages/assets.js';
import { initReviewEvidence } from './pages/review/evidence.js';
import { initReportStageGate } from './features/report-stage-gate.js';
import { initVersionAnchor } from './features/version-anchor.js';
import { initTestReleaseReview } from './features/test-release-review.js';
import { initLifecycleFlow } from './features/lifecycle-flow.js';
import { initInlineDocuments } from './features/inline-documents.js';
import { initStageGate } from './features/stage-gate.js';
import { initLayoutRefinements } from './features/layout-refinements.js';
import { initDesignTestingScope } from './features/design-testing-scope.js';
import { initDocumentApproval } from './features/document-approval.js';
import { initReadonlyReportDrawers } from './features/readonly-report-drawers.js';
import { initProfessionalReview } from './features/professional-review.js';
import { initRoleMapping } from './features/role-mapping.js';
import { initReviewProcess } from './pages/review/review-process.js';

const bootSequence = [
  bindActionEvents, // V1.3 全局 data-action 事件分发
  startApp, // 加载布局、绑定全局事件并首次渲染
  bindRequirementDrawerEvents, // 需求抽屉事件
  bindNavGroupEvents, // 侧边栏分组展开/收起
  initAdjustmentCleanup, // 项目调整页移除评审管理入口
  bindProfileMenu, // 个人菜单（个人信息 / 修改密码 / 退出）
  bindFlowViewEvents, // 流程视图节点与侧栏交互
  bindRequirementPageEvents, // 需求列表页交互
  bindRequirementListEvents, // 需求列表打开抽屉
  bindDesignEvents, // 设计阶段交互
  bindDevelopmentEvents, // 开发阶段交互
  bindTestingEvents, // 测试阶段交互
  bindClosingEvents, // 结项阶段交互
  bindReleaseEvents, // 发布阶段交互
  initReportVersioning, // V37 测试报告 / 紧急下发评审 / 发布版本
  initChangeManagement, // V1.4 变更管理
  initRiskManagement, // V1.5 风险管理
  initBugManagement, // V1.6 缺陷管理
  initOperations, // 运营看板
  bindFlowchartKeyboard, // 流程图键盘可达性
  initDocEditor, // V33 在线文档编辑器
  initDevReview, // V35/V45/V46 开发与 AI 检视
  initStageProgress, // V38 跨阶段共享状态
  initDemoScenarios, // V39 Mock 演示场景
  initReviewerTasks, // V41 检视任务入口与 AI 检视运营
  initAssetGallery, // V42 业务资产管理
  initReviewEvidence, // V43 检视证据抽屉
  initReportStageGate, // V49.1 测试报告 / 复盘只读门禁
  initVersionAnchor, // V52 跨阶段 Commit 锚点与测试/发布/结项门禁
  initTestReleaseReview, // V52.1 测试审核与发布门禁
  initLifecycleFlow, // V47 统一 Mock 生命周期与角色门禁
  initInlineDocuments, // V47 需求/设计抽屉内联文档
  initStageGate, // V48 阶段门禁与集中审批
  initLayoutRefinements, // V49 布局整理与阶段目录
  initDesignTestingScope, // V53 设计导航 / 可选测试报告 / 冒烟报告
  initDocumentApproval, // V54 文档驱动的阶段审批
  initReadonlyReportDrawers, // V54.1 报告抽屉只读
  initProfessionalReview, // V55 专业检视
  initRoleMapping, // V55.5 角色映射与测试阶段渲染
  initReviewProcess, // V56 检视流程 V5
];

bootSequence.forEach((step) => step());
