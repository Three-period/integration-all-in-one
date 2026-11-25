/**
 * 阶段审批：负责人在交付物页面提交审核，推送给项目指定的审核角色，审核人通过或退回。
 *
 * 一个阶段配置了多个审核角色时，任意一位通过即通过、任意一位退回即退回（或签）。
 */

/** 具有审核权的角色。 */
export const APPROVER_ROLES = {
  rdDirector: '研发总监',
  rdManager: '研发主管',
  testManager: '测试主管',
  qualityManager: '质量主管',
};

/** 需要审批的阶段。 */
export const APPROVAL_STAGES = ['planning', 'requirements', 'design', 'testing', 'release'];

/** 项目未单独指定时的默认审核角色（依据原流程图上的审批人）。 */
export const DEFAULT_STAGE_APPROVERS = {
  planning: ['rdDirector'],
  requirements: ['rdManager'],
  design: ['rdDirector'],
  testing: ['testManager', 'qualityManager'],
  release: ['rdDirector', 'qualityManager'],
};

export const APPROVAL_STATUS = { PENDING: '待审核', APPROVED: '已通过', REJECTED: '已退回' };

/** 项目某阶段的审核角色：优先使用项目详情页的配置，否则使用默认配置。 */
export function stageApprovers(project, stage) {
  const custom = project && project.approvers && project.approvers[stage];
  return (custom && custom.length ? custom : DEFAULT_STAGE_APPROVERS[stage] || []).slice();
}

/** 提交审核：生成待审核记录，审核角色在提交时按项目配置确定。 */
export function createApprovalRequest({
  id,
  project,
  projectId,
  stage,
  deliverable,
  submitter,
  at,
}) {
  return {
    id,
    projectId,
    stage,
    deliverable,
    submitter,
    submittedAt: at,
    approvers: stageApprovers(project, stage),
    status: APPROVAL_STATUS.PENDING,
    decisions: [],
  };
}

/** 该角色能否审核这条记录。 */
export function canDecide(request, role) {
  return request.status === APPROVAL_STATUS.PENDING && request.approvers.includes(role);
}

/**
 * 审核：decision 为 approve 或 reject，退回必须填写意见。
 * 返回 { ok, request }（新对象，原记录不变）或 { ok: false, reason }。
 */
export function decideApproval(request, { role, user, decision, comment = '', at }) {
  if (!canDecide(request, role)) return { ok: false, reason: '当前账号无权审核该记录' };
  if (decision === 'reject' && !comment.trim())
    return { ok: false, reason: '退回时请填写审核意见' };
  const status = decision === 'approve' ? APPROVAL_STATUS.APPROVED : APPROVAL_STATUS.REJECTED;
  return {
    ok: true,
    request: {
      ...request,
      status,
      decisions: [...request.decisions, { role, user, decision, comment: comment.trim(), at }],
    },
  };
}

/** 该角色的待审核记录。 */
export function pendingApprovalsFor(role, requests) {
  return requests.filter((r) => canDecide(r, role));
}

/** 项目某阶段最近一次提交的审核记录。 */
export function latestApproval(requests, projectId, stage) {
  const list = requests.filter((r) => r.projectId === projectId && r.stage === stage);
  return list.length ? list[list.length - 1] : null;
}

/** 项目某阶段最近一次审核是否已通过。 */
export function isStageApproved(requests, projectId, stage) {
  const latest = latestApproval(requests, projectId, stage);
  return !!latest && latest.status === APPROVAL_STATUS.APPROVED;
}
