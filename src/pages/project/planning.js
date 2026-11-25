/**
 * 流程视图：按四个环节展示全生命周期节点。
 *
 * 节点状态（已完成 / 进行中 / 未开始 / 不涉及）由 domain/stages.js 的 flowNodeState 计算；
 * 当前阶段内再按交付物细化：已提交的交付物、已通过的审核显示为已完成。
 * 点击节点进入对应阶段页面。
 */
import { App } from '../../core/app.js';
import { esc } from '../../core/dom.js';
import { setView } from '../../core/navigation.js';
import { FINAL_DESIGN_STATUSES } from '../../domain/design.js';
import { flowNodeState, stageState } from '../../domain/stages.js';
import { isTestKindEnabled } from '../../domain/testing.js';
import { getDevReview, getFlow } from '../../store/lifecycle.js';
import { isStageDone } from '../../features/lifecycle-flow.js';
import { stageApprovalStatus } from '../../features/stage-approval.js';
import { project, state } from '../../store/state.js';

const SUBMITTED = ['待评审', '评审中', '执行变更', ...FINAL_DESIGN_STATUSES];

function designStatus(docType) {
  App.designInit();
  const rows = (state.designRecords || []).filter((r) => r.docType === docType);
  return {
    submitted: rows.some((r) => SUBMITTED.includes(r.status)),
    approved: rows.some((r) => FINAL_DESIGN_STATUSES.includes(r.status)),
  };
}

function reportReady(kind) {
  const item = App.testReportRequirements().items.find((i) => i.kind === kind);
  return !!(item && item.ready && !item.skipped);
}

/** 一份设计文档对应「编写」与「审核」两个节点。 */
function designNodes(label, reviewLabel, docType, designTypes) {
  return [
    {
      label,
      stage: 'design',
      kind: 'content',
      designTypes,
      done: () => designStatus(docType).submitted,
    },
    {
      label: reviewLabel,
      stage: 'design',
      kind: 'approval',
      designTypes,
      done: () => designStatus(docType).approved,
    },
  ];
}

const FLOW_ROWS = [
  {
    title: '立项与需求',
    back: '立项审核不通过则取消立项；需求审核不通过返回修改。',
    nodes: [
      {
        label: '项目立项',
        stage: 'planning',
        kind: 'content',
        target: 'basic',
        done: () => !!stageApprovalStatus('planning'),
      },
      { label: '立项审核', stage: 'planning', kind: 'approval' },
      {
        label: '需求整理',
        stage: 'requirements',
        kind: 'content',
        done: () => (state.reqRecords || []).some((r) => ['待评审', '已完成'].includes(r.status)),
      },
      { label: '需求审核', stage: 'requirements', kind: 'approval' },
    ],
  },
  {
    title: '分类设计',
    note: () => getFlow().designType + ' 类项目',
    back: '设计审核不通过返回修改；IV 类项目只评审软件规格书。',
    nodes: [
      ...designNodes('软件规格书', '规格书审核', '软件规格书'),
      ...designNodes('架构设计', '架构审核', '软件架构设计', ['I']),
      ...designNodes('概要设计', '概要审核', '概要设计', ['I', 'II']),
      ...designNodes('详细设计', '详细审核', '详细设计', ['I', 'II', 'III']),
    ],
  },
  {
    title: '开发与测试',
    back: '测试审核不通过返回开发或相关测试环节。',
    nodes: [
      {
        label: '编码与自测',
        stage: 'development',
        kind: 'content',
        done: () => !!getDevReview().formalRequest,
      },
      {
        label: '代码检视',
        stage: 'development',
        kind: 'content',
        done: () => !!getDevReview().approval,
      },
      { label: '冒烟测试', stage: 'testing', kind: 'content', done: () => reportReady('smoke') },
      {
        label: '单板测试',
        stage: 'testing',
        kind: 'content',
        testKind: 'single',
        done: () => reportReady('single'),
      },
      {
        label: '长运测试',
        stage: 'testing',
        kind: 'content',
        testKind: 'long',
        done: () => reportReady('long'),
      },
      { label: '整机测试', stage: 'testing', kind: 'content', done: () => reportReady('system') },
      { label: '测试审核', stage: 'testing', kind: 'approval' },
    ],
  },
  {
    title: '发布与结项',
    back: '发布评审不通过返回整机测试；ECN / PCN、紧急临时下发在发布阶段办理。',
    nodes: [
      {
        label: '发布评审',
        stage: 'release',
        kind: 'approval',
        done: () => stageApprovalStatus('release') === '已通过',
      },
      {
        label: '文档归档',
        stage: 'release',
        kind: 'content',
        done: () => stageApprovalStatus('release') === '已通过',
      },
      { label: '版本发布', stage: 'release', kind: 'content' },
      { label: '结项', stage: 'closing', kind: 'content' },
      { label: '完成', stage: 'closing', kind: 'end' },
    ],
  },
];

const STATE_LABELS = { done: '已完成', current: '进行中', pending: '未开始', skipped: '不涉及' };

function nodeState(node, ctx) {
  const value = flowNodeState(node, ctx);
  if (value === 'current' && node.done && node.done()) return 'done';
  return value;
}

function renderNode(node, value, index, prevDone) {
  const mark =
    value === 'done'
      ? '✓'
      : value === 'skipped'
        ? '–'
        : node.kind === 'approval'
          ? '审'
          : String(index + 1);
  const target = node.target === 'basic' ? 'basic' : node.stage;
  return (
    '<li class="lc-node is-' +
    value +
    ' kind-' +
    node.kind +
    (prevDone ? ' link-done' : '') +
    '"><button type="button" data-flow-view-action="node" data-flow-stage="' +
    target +
    '" aria-label="' +
    esc(node.label + ' · ' + STATE_LABELS[value]) +
    '"><span class="lc-node-dot" aria-hidden="true">' +
    mark +
    '</span><span class="lc-node-label">' +
    esc(node.label) +
    '</span><small>' +
    STATE_LABELS[value] +
    '</small></button></li>'
  );
}

function renderPlanning() {
  const p = project();
  const ctx = {
    stageStateOf: (stage) => stageState(stage, isStageDone),
    designType: getFlow().designType,
    isTestEnabled: (kind) => isTestKindEnabled(p, kind),
    approvalStatus: (stage) => stageApprovalStatus(stage),
  };
  const rows = FLOW_ROWS.map((row, r) => {
    let prevDone = false;
    const items = row.nodes
      .map((node, i) => {
        const value = nodeState(node, ctx);
        const html = renderNode(node, value, i, i > 0 && prevDone);
        if (value !== 'skipped') prevDone = value === 'done';
        return html;
      })
      .join('');
    return (
      '<section class="lc-row"><header class="lc-row-head"><span class="lc-row-index">0' +
      (r + 1) +
      '</span><h3>' +
      row.title +
      '</h3>' +
      (row.note ? '<span class="tag blue">' + esc(row.note()) + '</span>' : '') +
      '</header><ol class="lc-track">' +
      items +
      '</ol><p class="lc-row-back">' +
      row.back +
      '</p></section>'
    );
  }).join('');
  return (
    '<div class="lc-flow"><div class="lc-flow-head"><div><h2>流程流转图</h2><p>' +
    esc(p.name) +
    ' · 点击节点进入对应阶段</p></div><ul class="lc-legend"><li class="is-done">已完成</li><li class="is-current">进行中</li><li class="is-pending">未开始</li><li class="is-skipped">不涉及</li></ul></div>' +
    rows +
    '</div>'
  );
}
App.renderPlanning = renderPlanning;

/** 流程视图节点导航 */
export function bindFlowViewEvents() {
  document.addEventListener('click', function (e) {
    const el = e.target.closest('[data-flow-view-action="node"]');
    if (!el) return;
    e.preventDefault();
    const stage = el.dataset.flowStage;
    if (stage === 'basic') {
      state.projectSection = 'basic';
      setView('project-basic');
      return;
    }
    state.lifecycleStage = stage;
    state.projectSection = 'lifecycle';
    setView('project-lifecycle');
  });
}
