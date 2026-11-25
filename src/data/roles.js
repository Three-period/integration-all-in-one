/** 角色、工作台组件元数据、角色可见组件与默认布局。 */
export const roles = {
  product: '产品经理',
  project: '项目经理',
  developer: '研发人员',
  tester: '测试人员',
  supervisor: '部门主管',
  reviewer: '检视工程师',
};

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
  supervisor: [
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
};

rolePolicy.reviewer = ['summary', 'todo', 'activity', 'projects'];

export const defaultLayouts = {
  product: ['summary', 'todo', 'activity', 'projects', 'requirements', 'approvals', 'risks'],
  project: ['summary', 'todo', 'activity', 'projects', 'development', 'testing', 'risks', 'team'],
  developer: ['summary', 'todo', 'activity', 'development', 'testing', 'projects'],
  tester: ['summary', 'todo', 'activity', 'testing', 'projects', 'risks'],
  supervisor: [
    'summary',
    'todo',
    'activity',
    'projects',
    'requirements',
    'testing',
    'risks',
    'team',
  ],
};

defaultLayouts.reviewer = ['summary', 'todo', 'activity', 'projects'];
