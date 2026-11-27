/** 角色与操作权限，集中定义各角色能看到的模块和能执行的操作。 */
import { APPROVER_ROLES } from './approvals.js';

export const ROLE_LABELS = {
  product: '产品经理',
  project: '项目经理',
  developer: '开发工程师',
  tester: '测试工程师',
  reviewer: '检视工程师',
  ...APPROVER_ROLES,
};

/** 操作 → 允许的角色。 */
const PERMISSIONS = {
  /** 运营看板 */
  'operations.view': Object.keys(APPROVER_ROLES),
  /** 开发阶段工作台（开发与检视两种视图） */
  'dev.workspace': Object.keys(ROLE_LABELS),
  /** 冒烟、自测、提交 Commit、申请检视、提测 */
  'dev.submit': ['developer'],
  /** 专业检视、问题裁定、检视准出 */
  'review.perform': ['reviewer'],
  /** 删除项目及其关联的模拟记录 */
  'project.delete': ['project'],
  /** 配置项目各阶段的审核角色 */
  'project.configure': ['product', 'project'],
  /** 阶段审核（具体阶段的审核角色由项目配置决定，见 approvals.js） */
  'approval.decide': Object.keys(APPROVER_ROLES),
};

/** 该角色能否执行某项操作。 */
export function can(role, permission) {
  const roles = PERMISSIONS[permission];
  if (!roles) throw new Error(`未定义的权限：${permission}`);
  return roles.includes(role);
}

/** 各角色登录后进入的界面；未列出的角色进入个人工作台。 */
const LANDING = {
  developer: { view: 'project-lifecycle', stage: 'development' },
  reviewer: { view: 'project-lifecycle', stage: 'development' },
  tester: { view: 'project-lifecycle', stage: 'testing' },
};

export function landingFor(role) {
  return LANDING[role] || { view: 'dashboard' };
}
