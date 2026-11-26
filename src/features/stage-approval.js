/**
 * 阶段审核：在交付物所在页面提交审核，推送给项目配置的审核角色；
 * 审核人在阶段页面或个人工作台通过 / 退回，审核通过后推进阶段。
 *
 * 规则（或签、退回需填写意见、默认审核角色）见 domain/approvals.js。
 */
import {
  APPROVAL_STATUS,
  APPROVER_ROLES,
  canDecide,
  createApprovalRequest,
  decideApproval,
  latestApproval,
  pendingApprovalsFor,
  stageApprovers,
} from '../domain/approvals.js';
import { missingDesignReviews } from '../domain/design.js';
import { approvalRequests, getFlow, getVersionAnchor } from '../store/lifecycle.js';
import { App } from '../core/app.js';
import { esc } from '../core/dom.js';
import { closeModal, openModal } from '../components/overlays.js';
import { showToast } from '../components/toast.js';
import { projects } from '../data/projects.js';
import {
  isStageDone,
  isStagePrereqMet,
  logFlowNote,
  projectDesignDocTypes,
} from './lifecycle-flow.js';
import { nowStamp } from './dev-review.js';
import { getReleaseGate } from './version-anchor.js';
import { project, state } from '../store/state.js';

export const APPROVAL_TITLES = {
  planning: '立项审核',
  requirements: '需求审核',
  design: '设计文档审核',
  testing: '测试审核',
  release: '发布评审',
};

/** 需求、设计在详情抽屉中逐份提交；立项、测试、发布在阶段页面整体提交。 */
const SUBMIT_IN_DRAWER = {
  requirements: '在需求详情中点击「提交」即可发起审核。',
  design: '在设计文档详情中点击「提交」即可发起审核，每份文档单独审核。',
};

function approverNames(roles) {
  return roles.map((r) => APPROVER_ROLES[r]).join(' / ');
}

function requestsOf(projectId, stage) {
  return approvalRequests.filter((r) => r.projectId === projectId && r.stage === stage);
}

function pendingOf(projectId, stage) {
  return requestsOf(projectId, stage).filter((r) => r.status === APPROVAL_STATUS.PENDING);
}

/** 当前项目某阶段的审核状态，供流程图节点使用：有待审核记录时为「待审核」。 */
export function stageApprovalStatus(stage, projectId = state.projectId) {
  if (pendingOf(projectId, stage).length) return APPROVAL_STATUS.PENDING;
  const latest = latestApproval(approvalRequests, projectId, stage);
  return latest ? latest.status : '';
}

/** 当前账号待处理的审核。 */
export function myPendingApprovals() {
  return pendingApprovalsFor(state.role, approvalRequests);
}

/** 当前账号提交的审核。 */
export function mySubmittedApprovals() {
  const name = state.user && state.user.name;
  return approvalRequests.filter((r) => r.submitter === name);
}

function findRequirement(id) {
  return (state.reqRecords || []).find((r) => r.id === id);
}

function findDesign(id) {
  App.designInit();
  return (state.designRecords || []).find((r) => r.id === id);
}

function missingDesigns() {
  App.designInit();
  return missingDesignReviews(projectDesignDocTypes(), state.designRecords);
}

/** 提交前检查：返回不能提交的原因，可以提交时返回空字符串。 */
function submitBlocker(stage, deliverable) {
  if (!isStagePrereqMet(stage)) return '上一阶段尚未完成，暂不能提交审核';
  if (isStageDone(stage) && stage !== 'design') return '本阶段已审核通过';
  const pending = pendingOf(state.projectId, stage);
  if (stage === 'design' || stage === 'requirements') {
    if (pending.some((r) => r.deliverable.recordId === deliverable.recordId))
      return '该文档已在审核中，请等待审核结果';
    return '';
  }
  if (pending.length) return '已提交审核，请等待审核结果';
  if (stage === 'testing') {
    const z = getReleaseGate();
    if (!z.commit) return '尚无正式移交的开发版本，无法提交测试审核';
    const check = App.testReportRequirements();
    if (check.missing.length) return '请先提交 ' + check.missing.join('、');
  }
  if (stage === 'release' && !getReleaseGate().testPass)
    return '测试审核尚未通过，无法提交发布评审';
  return '';
}

function describeDeliverable(stage) {
  const p = project();
  if (stage === 'planning') return { title: '立项申请 · ' + p.name };
  if (stage === 'testing') {
    const z = getReleaseGate();
    const check = App.testReportRequirements();
    return {
      title: '测试报告 · ' + z.commit,
      commit: z.commit,
      reportIds: check.items.filter((i) => i.row).map((i) => i.row.id),
    };
  }
  if (stage === 'release') {
    const z = getReleaseGate();
    return {
      title: '发布评审 · ' + (z.version || p.version || 'V1.0') + ' · ' + z.commit,
      commit: z.commit,
      version: z.version || p.version || 'V1.0',
    };
  }
  return { title: '' };
}

/**
 * 提交审核。需求、设计由详情抽屉传入 deliverable（recordId、title、docType）；
 * 其余阶段按当前项目数据生成。成功返回 true。
 */
export function submitStageApproval(stage, deliverable) {
  const item = deliverable || describeDeliverable(stage);
  const blocker = submitBlocker(stage, item);
  if (blocker) {
    showToast(blocker, 'warn');
    return false;
  }
  const request = createApprovalRequest({
    id: 'APV-' + String(approvalRequests.length + 1).padStart(4, '0'),
    project: project(),
    projectId: state.projectId,
    stage,
    deliverable: item,
    submitter: state.user ? state.user.name : '',
    at: nowStamp(),
  });
  approvalRequests.push(request);
  logFlowNote(
    APPROVAL_TITLES[stage] +
      '已提交：' +
      item.title +
      '，审核角色 ' +
      approverNames(request.approvers),
  );
  if (stage === 'testing') {
    getVersionAnchor().testReview = {
      status: '待审核',
      commit: item.commit,
      reviewer: approverNames(request.approvers),
      at: request.submittedAt,
    };
  }
  showToast(
    '已提交' + APPROVAL_TITLES[stage] + '，等待' + approverNames(request.approvers) + '审核',
  );
  return true;
}

/** 审核通过 / 退回后更新阶段数据。在请求所属项目的上下文中执行。 */
const EFFECTS = {
  planning(req, approved, p, f) {
    if (!approved) return;
    f.steps.planning = true;
    p.status = '进行中';
    p.flowStatus = '需求阶段';
    p.progress = Math.max(Number(p.progress) || 0, 10);
  },
  requirements(req, approved, p, f) {
    const rec = findRequirement(req.deliverable.recordId);
    if (rec) rec.status = approved ? '已完成' : '进行中';
    if (!approved) return;
    f.steps.requirements = true;
    p.flowStatus = '设计阶段';
    p.progress = Math.max(Number(p.progress) || 0, 25);
  },
  design(req, approved, p, f) {
    const rec = findDesign(req.deliverable.recordId);
    if (rec) {
      rec.status = approved ? '评审通过' : '已拒绝';
      const last = req.decisions[req.decisions.length - 1];
      rec.review = (approved ? '评审通过' : '评审退回') + (last.comment ? '：' + last.comment : '');
    }
    if (!approved || missingDesigns().length) return;
    f.steps.design = true;
    p.flowStatus = '开发阶段';
    p.progress = Math.max(Number(p.progress) || 0, 40);
  },
  testing(req, approved, p, f, by) {
    const x = getVersionAnchor();
    x.testReview = {
      status: approved ? '审核通过' : '已退回',
      commit: req.deliverable.commit,
      reviewer: by.user,
      at: by.at,
      reportIds: req.deliverable.reportIds,
    };
    f.steps.testing = approved;
    if (!approved) return;
    p.progress = Math.max(Number(p.progress) || 0, 82);
    p.flowStatus = '发布阶段';
  },
  release(req, approved, p, f, by) {
    const x = getVersionAnchor();
    x.releaseReview = {
      status: approved ? '已通过' : '已退回',
      commit: req.deliverable.commit,
      version: req.deliverable.version,
      reviewer: by.user,
      at: by.at,
    };
    if (!state.v37PublishReview) state.v37PublishReview = {};
    state.v37PublishReview[req.projectId] = x.releaseReview;
  },
};

/** 测试、发布审核绑定提交时的 Commit；提交后版本变化需重新提交。 */
function decisionBlocker(req) {
  if (
    (req.stage === 'testing' || req.stage === 'release') &&
    req.deliverable.commit !== getReleaseGate().commit
  )
    return '提交审核后开发移交版本已变化，请退回后重新提交';
  return '';
}

function decide(id, decision, comment) {
  const index = approvalRequests.findIndex((r) => r.id === id);
  if (index < 0) return;
  const req = approvalRequests[index];
  const at = nowStamp();
  const result = decideApproval(req, {
    role: state.role,
    user: state.user ? state.user.name : '',
    decision,
    comment,
    at,
  });
  if (!result.ok) {
    showToast(result.reason, 'warn');
    return;
  }
  const previousProject = state.projectId;
  state.projectId = req.projectId;
  const blocker = decision === 'approve' ? decisionBlocker(req) : '';
  if (blocker) {
    state.projectId = previousProject;
    showToast(blocker, 'warn');
    return;
  }
  approvalRequests[index] = result.request;
  const approved = decision === 'approve';
  EFFECTS[req.stage](result.request, approved, project(), getFlow(), { user: state.user.name, at });
  logFlowNote(
    APPROVAL_TITLES[req.stage] +
      (approved ? '通过' : '退回') +
      '：' +
      req.deliverable.title +
      (comment ? '，意见：' + comment : ''),
  );
  state.projectId = previousProject;
  closeModal();
  App.render();
  showToast(APPROVAL_TITLES[req.stage] + (approved ? '已通过' : '已退回'));
}

function openDecision(id, decision) {
  const req = approvalRequests.find((r) => r.id === id);
  if (!req) return;
  const approve = decision === 'approve';
  const projectName = projects[req.projectId] ? projects[req.projectId].name : req.projectId;
  openModal(
    'approval-decision',
    (approve ? '审核通过 · ' : '审核退回 · ') + APPROVAL_TITLES[req.stage],
    '<div class="approval-decision"><dl><dt>项目</dt><dd>' +
      esc(projectName) +
      '</dd><dt>交付物</dt><dd>' +
      esc(req.deliverable.title) +
      '</dd><dt>提交人</dt><dd>' +
      esc(req.submitter) +
      ' · ' +
      esc(req.submittedAt) +
      '</dd></dl><label class="field"><span>审核意见' +
      (approve ? '（选填）' : '（必填）') +
      '</span><textarea class="input" rows="4" data-approval-comment placeholder="' +
      (approve ? '可填写审核意见' : '请说明退回原因与修改要求') +
      '"></textarea></label></div>',
    '<button class="btn" data-action="close-modal">取消</button><button class="btn ' +
      (approve ? 'primary' : 'danger') +
      '" data-approval-action="confirm" data-id="' +
      esc(id) +
      '" data-decision="' +
      decision +
      '">' +
      (approve ? '确认通过' : '确认退回') +
      '</button>',
  );
  const area = document.querySelector('[data-approval-comment]');
  if (area) area.focus();
}

function statusTag(stage) {
  if (isStageDone(stage)) return '<span class="tag green">已通过</span>';
  const status = stageApprovalStatus(stage);
  if (status === APPROVAL_STATUS.PENDING) return '<span class="tag orange">待审核</span>';
  if (status === APPROVAL_STATUS.REJECTED) return '<span class="tag red">已退回</span>';
  if (status === APPROVAL_STATUS.APPROVED) return '<span class="tag blue">部分通过</span>';
  return '<span class="tag gray">未提交</span>';
}

function pendingRow(req) {
  const actions = canDecide(req, state.role)
    ? '<button class="btn" data-approval-action="decide" data-decision="reject" data-id="' +
      esc(req.id) +
      '">退回</button><button class="btn primary" data-approval-action="decide" data-decision="approve" data-id="' +
      esc(req.id) +
      '">通过</button>'
    : '<span class="mini-note">等待 ' + esc(approverNames(req.approvers)) + ' 审核</span>';
  return (
    '<li class="approval-row"><div><strong>' +
    esc(req.deliverable.title) +
    '</strong><small>' +
    esc(req.submitter) +
    ' 提交 · ' +
    esc(req.submittedAt) +
    '</small></div><div class="approval-row-actions">' +
    actions +
    '</div></li>'
  );
}

function lastDecisionNote(stage) {
  const decided = requestsOf(state.projectId, stage).filter(
    (r) => r.status !== APPROVAL_STATUS.PENDING,
  );
  const last = decided[decided.length - 1];
  if (!last) return '';
  const d = last.decisions[last.decisions.length - 1];
  return (
    '<p class="approval-last ' +
    (last.status === APPROVAL_STATUS.REJECTED ? 'is-rejected' : '') +
    '">最近' +
    (last.status === APPROVAL_STATUS.REJECTED ? '退回' : '通过') +
    '：' +
    esc(last.deliverable.title) +
    ' · ' +
    esc(APPROVER_ROLES[d.role]) +
    ' ' +
    esc(d.user) +
    ' · ' +
    esc(d.at) +
    (d.comment ? '<br>意见：' + esc(d.comment) : '') +
    '</p>'
  );
}

function stageChecklist(stage) {
  if (stage === 'design') {
    const f = getFlow();
    const locked = isStageDone('design');
    App.designInit();
    return (
      '<div class="approval-checks"><label class="approval-inline-field">设计类别<select id="v47DesignType" class="input" ' +
      (locked ? 'disabled' : '') +
      '>' +
      ['I', 'II', 'III', 'IV']
        .map(
          (v) =>
            '<option value="' +
            v +
            '"' +
            (f.designType === v ? ' selected' : '') +
            '>' +
            v +
            ' 类</option>',
        )
        .join('') +
      '</select></label>' +
      projectDesignDocTypes()
        .map((t) => {
          const good = !missingDesignReviews([t], state.designRecords).length;
          const reviewing = pendingOf(state.projectId, 'design').some(
            (r) => r.deliverable.docType === t,
          );
          return (
            '<span class="' +
            (good ? 'is-ok' : 'is-pending') +
            '">' +
            esc(t) +
            (good ? ' · 已通过' : reviewing ? ' · 审核中' : ' · 待提交') +
            '</span>'
          );
        })
        .join('') +
      '</div>'
    );
  }
  if (stage === 'testing') {
    const check = App.testReportRequirements();
    return (
      '<div class="approval-checks">' +
      check.items
        .map(
          (r) =>
            '<span class="' +
            (r.skipped ? 'is-skipped' : r.ready ? 'is-ok' : 'is-pending') +
            '">' +
            esc(r.name) +
            ' · ' +
            esc(r.status) +
            '</span>',
        )
        .join('') +
      '</div>'
    );
  }
  return '';
}

function submitButton(stage) {
  if (SUBMIT_IN_DRAWER[stage])
    return '<span class="mini-note">' + SUBMIT_IN_DRAWER[stage] + '</span>';
  if (isStageDone(stage) || pendingOf(state.projectId, stage).length) return '';
  const blocker = submitBlocker(stage, {});
  return (
    '<button class="btn primary" data-approval-action="submit" data-stage="' +
    stage +
    '"' +
    (blocker ? ' disabled title="' + esc(blocker) + '"' : '') +
    '>提交' +
    APPROVAL_TITLES[stage] +
    '</button>' +
    (blocker ? '<span class="mini-note">' + esc(blocker) + '</span>' : '')
  );
}

/** 阶段审核栏：审核角色、审核状态、待审核记录与提交 / 审核操作。 */
export function renderApprovalBar(stage) {
  if (!APPROVAL_TITLES[stage]) return '';
  const pending = pendingOf(state.projectId, stage);
  return (
    '<section class="approval-bar" data-approval-stage="' +
    stage +
    '"><div class="approval-bar-head"><div><h3>' +
    APPROVAL_TITLES[stage] +
    ' ' +
    statusTag(stage) +
    '</h3><p>审核角色：' +
    esc(approverNames(stageApprovers(project(), stage))) +
    '（任意一位审核即可，可在「基本信息」中调整）</p></div><div class="approval-bar-actions">' +
    submitButton(stage) +
    '</div></div>' +
    stageChecklist(stage) +
    (pending.length
      ? '<ul class="approval-list">' + pending.map(pendingRow).join('') + '</ul>'
      : '') +
    lastDecisionNote(stage) +
    '</section>'
  );
}

/** 个人工作台「审批中心」卡片内容。 */
export function renderApprovalWidget() {
  const mine = myPendingApprovals();
  if (mine.length)
    return (
      '<ul class="approval-list approval-widget">' +
      mine
        .map((req) => {
          const name = projects[req.projectId] ? projects[req.projectId].name : req.projectId;
          return (
            '<li class="approval-row"><div><strong>' +
            esc(APPROVAL_TITLES[req.stage]) +
            ' · ' +
            esc(req.deliverable.title) +
            '</strong><small>' +
            esc(name) +
            ' · ' +
            esc(req.submitter) +
            ' 提交 · ' +
            esc(req.submittedAt) +
            '</small></div><div class="approval-row-actions"><button class="btn" data-approval-action="goto" data-id="' +
            esc(req.id) +
            '">查看</button><button class="btn" data-approval-action="decide" data-decision="reject" data-id="' +
            esc(req.id) +
            '">退回</button><button class="btn primary" data-approval-action="decide" data-decision="approve" data-id="' +
            esc(req.id) +
            '">通过</button></div></li>'
          );
        })
        .join('') +
      '</ul>'
    );
  const sent = mySubmittedApprovals().slice(-4).reverse();
  if (sent.length)
    return (
      '<ul class="approval-list approval-widget">' +
      sent
        .map(
          (req) =>
            '<li class="approval-row"><div><strong>' +
            esc(APPROVAL_TITLES[req.stage]) +
            ' · ' +
            esc(req.deliverable.title) +
            '</strong><small>我提交 · ' +
            esc(req.submittedAt) +
            '</small></div><span class="tag ' +
            (req.status === APPROVAL_STATUS.APPROVED
              ? 'green'
              : req.status === APPROVAL_STATUS.REJECTED
                ? 'red'
                : 'orange') +
            '">' +
            esc(req.status) +
            '</span></li>',
        )
        .join('') +
      '</ul>'
    );
  return '<div class="empty-note">暂无待处理的审核</div>';
}

/** 基本信息页：各阶段审核角色配置。 */
export function renderApproverConfig() {
  const p = project();
  const editable = ['product', 'project'].includes(state.role);
  const roles = Object.keys(APPROVER_ROLES);
  return (
    '<section class="card card-pad approver-config"><h3 class="section-title">审核人配置 <small>各阶段提交审核后推送给勾选的角色，任意一位审核即可</small></h3><div class="table-scroll"><table class="approver-table"><thead><tr><th>阶段</th>' +
    roles.map((r) => '<th>' + esc(APPROVER_ROLES[r]) + '</th>').join('') +
    '</tr></thead><tbody>' +
    Object.keys(APPROVAL_TITLES)
      .map((stage) => {
        const selected = stageApprovers(p, stage);
        return (
          '<tr><th scope="row">' +
          APPROVAL_TITLES[stage] +
          '</th>' +
          roles
            .map(
              (r) =>
                '<td><input type="checkbox" aria-label="' +
                APPROVAL_TITLES[stage] +
                ' · ' +
                esc(APPROVER_ROLES[r]) +
                '" data-approver-stage="' +
                stage +
                '" data-approver-role="' +
                r +
                '"' +
                (selected.includes(r) ? ' checked' : '') +
                (editable ? '' : ' disabled') +
                '></td>',
            )
            .join('') +
          '</tr>'
        );
      })
      .join('') +
    '</tbody></table></div>' +
    (editable ? '' : '<p class="mini-note">仅产品经理、项目经理可以调整审核人。</p>') +
    '</section>'
  );
}

function gotoRequest(req) {
  state.projectId = req.projectId;
  state.projectSection = 'lifecycle';
  state.lifecycleStage = req.stage;
  state.view = 'project-lifecycle';
  App.render();
}

export function initStageApproval() {
  document.addEventListener('click', function (e) {
    const el = e.target.closest('[data-approval-action]');
    if (!el || el.disabled) return;
    e.preventDefault();
    const action = el.dataset.approvalAction;
    if (action === 'submit') {
      if (submitStageApproval(el.dataset.stage)) App.render();
      return;
    }
    if (action === 'decide') return openDecision(el.dataset.id, el.dataset.decision);
    if (action === 'confirm') {
      const area = document.querySelector('[data-approval-comment]');
      return decide(el.dataset.id, el.dataset.decision, area ? area.value : '');
    }
    if (action === 'goto') {
      const req = approvalRequests.find((r) => r.id === el.dataset.id);
      if (req) gotoRequest(req);
    }
  });
  document.addEventListener('change', function (e) {
    const box = e.target.closest('[data-approver-stage]');
    if (!box) return;
    const p = project();
    const stage = box.dataset.approverStage;
    const selected = stageApprovers(p, stage).filter((r) => r !== box.dataset.approverRole);
    if (box.checked) selected.push(box.dataset.approverRole);
    if (!selected.length) {
      box.checked = true;
      showToast('每个阶段至少保留一个审核角色', 'warn');
      return;
    }
    if (!p.approvers) p.approvers = {};
    p.approvers[stage] = Object.keys(APPROVER_ROLES).filter((r) => selected.includes(r));
    showToast(APPROVAL_TITLES[stage] + '审核角色已更新');
  });
}
