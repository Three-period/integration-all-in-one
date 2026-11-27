/** 角色、工作台组件元数据、角色可见组件与默认布局。 */
import { ROLE_LABELS } from '../domain/permissions.js';

/** 角色名称，统一取自 domain/permissions.js。 */
export const roles = ROLE_LABELS;

export const widgetMeta = {
  summary: ['数据摘要', '本人参与项目与关键指标'],
  todo: ['我的待办', '待审批、任务、缺陷与需求'],
  activity: ['最近动态', '@我的评论与对象变更'],
  projects: ['我的项目', '本人负责或参与的项目'],
  requirements: ['需求进展', '负责或参与项目的需求状态'],
  development: ['开发任务', '本人任务与提测状态'],
  testing: ['测试执行', '用例、报告与缺陷数据'],
  approvals: ['审批中心', '本人待审批流程'],
  risks: ['风险与预警', '项目范围内风险与逾期项'],
  team: ['团队负载', '本部门人员资源概览'],
};

export const rolePolicy = {
  product: ['summary', 'todo', 'activity', 'projects', 'requirements', 'approvals', 'risks'],
  project: [
    'summary',
    'todo',
    'activity',
    'projects',
    'requirements',
    'development',
    'testing',
    'approvals',
    'risks',
    'team',
  ],
  developer: ['summary', 'todo', 'activity', 'projects', 'development', 'testing'],
  tester: ['summary', 'todo', 'activity', 'projects', 'testing', 'risks'],
};

rolePolicy.reviewer = ['summary', 'todo', 'activity', 'projects'];

/** 审核角色（研发总监、研发主管、测试主管、质量主管）的工作台卡片。 */
const APPROVER_WIDGETS = ['summary', 'approvals', 'todo', 'activity', 'projects', 'risks'];
['rdDirector', 'rdManager', 'testManager', 'qualityManager'].forEach((role) => {
  rolePolicy[role] = APPROVER_WIDGETS.slice();
});

export const defaultLayouts = {
  product: ['summary', 'todo', 'activity', 'projects', 'requirements', 'approvals', 'risks'],
  project: ['summary', 'todo', 'activity', 'projects', 'development', 'testing', 'risks', 'team'],
  developer: ['summary', 'todo', 'activity', 'development', 'testing', 'projects'],
  tester: ['summary', 'todo', 'activity', 'testing', 'projects', 'risks'],
};

defaultLayouts.reviewer = ['summary', 'todo', 'activity', 'projects'];
['rdDirector', 'rdManager', 'testManager', 'qualityManager'].forEach((role) => {
  defaultLayouts[role] = APPROVER_WIDGETS.slice();
});
