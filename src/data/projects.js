/** 项目 Mock 数据。 */
export const projects = {
  thermal: {
    name: '智能温控平台 V2.6',
    code: 'PRJ20260418',
    type: '产品开发',
    department: '软件一科',
    owner: '王凯',
    ownerDetail: '王凯 / 100284',
    start: '2026-04-18',
    end: '2026-09-18',
    period: '04/18 — 09/18',
    status: '进行中',
    progress: 72,
    repo: 'gitlab.invt.com/thermal/v2.6',
    goal: '完成智能温控平台 V2.6 版本研发，提升设备接入稳定性并补齐能耗分析能力，按计划完成测试、发布与文档归档。',
    health: '健康',
  },
  gateway: {
    name: '边缘计算网关适配',
    code: 'PRJ20260309',
    type: '紧急定制',
    department: '软件二科',
    owner: '陈思',
    ownerDetail: '陈思 / 100392',
    start: '2026-03-09',
    end: '2026-07-28',
    period: '03/09 — 07/28',
    status: '已延期',
    progress: 54,
    repo: 'gitlab.invt.com/edge/gateway',
    goal: '完成边缘计算网关协议适配与交付验证，解决现场设备兼容问题并闭环延期风险。',
    health: '风险',
  },
  algorithm: {
    name: '液冷控制算法预研',
    code: 'PRJ20260721',
    type: '预研项目',
    department: '产品与解决方案部',
    owner: '赵敏',
    ownerDetail: '赵敏 / 100506',
    start: '2026-07-21',
    end: '2026-11-30',
    period: '07/21 — 11/30',
    status: '审批中',
    progress: 18,
    repo: 'gitlab.invt.com/research/liquid-cooling',
    goal: '验证液冷控制算法的技术可行性，形成原型、评估报告与后续产品化建议。',
    health: '观察',
  },
  cloud: {
    name: '设备云平台 3.0',
    code: 'PRJ20260105',
    type: '产品开发',
    department: '软件一科',
    owner: '周航',
    ownerDetail: '周航 / 100321',
    start: '2026-01-05',
    end: '2026-10-15',
    period: '01/05 — 10/15',
    status: '进行中',
    progress: 61,
    repo: 'gitlab.invt.com/cloud/device-3.0',
    goal: '完成设备云平台 3.0 架构升级与核心能力迭代，提升设备管理效率和平台稳定性。',
    health: '健康',
  },
};

// Some dashboards contain fixed demo rows rather than live workflow records.
export function removeDeletedProjectSamples(container) {
  for (const row of container.querySelectorAll('[data-sample-projects]')) {
    if (row.dataset.sampleProjects.split(' ').some((id) => !projects[id])) row.remove();
  }
}

// Older adjustment records stored the project name without its ID.
export function adjustmentProjectId(record) {
  if (record.projectId) return record.projectId;
  if (record.project === '液冷控制算法预研（示例项目）') return 'algorithm';
  const matches = Object.keys(projects).filter((id) => projects[id].name === record.project);
  return matches.length === 1 ? matches[0] : null;
}
