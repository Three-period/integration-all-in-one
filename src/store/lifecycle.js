/** 生命周期业务数据：按项目 id 隔离的开发检视、阶段流转、文档与版本锚点记录。 */
import { projects } from '../data/projects.js';
import { state } from './state.js';

/** 开发与 AI 检视：冒烟、自测、Commit、AI 检视批次、问题、人工检视与提测。 */
export const devReviewStore = Object.create(null);

/** 当前项目的开发检视记录，首次访问时创建默认数据。 */
export function getDevReview(id = state.projectId || 'thermal') {
  if (!devReviewStore[id])
    devReviewStore[id] = {
      task: 'TASK-142',
      developer: '孙宁',
      role: 'developer',
      tab: 'dev',
      repo: projects[id]?.repo,
      branch: 'release/v2.6',
      commit: '',
      commits: [],
      smokes: [],
      selfTests: [],
      inspections: [],
      prep: null,
      formalRequest: null,
      runs: [],
      issues: [],
      manual: [],
      disputes: [],
      approval: null,
      handoff: false,
      section: 'overview',
      reviewMode: 'todos',
      reviewIssue: '',
      log: [],
      seq: 0,
      smokeResult: '通过',
      smokeText: '关键链路启动与基本功能检查完成。',
      selfText: '已覆盖主要功能及异常分支，测试结果符合预期。',
      selfComments: [],
      selfFrozen: false,
      aiMode: 'issues',
    };
  return devReviewStore[id];
}

/** 当前开发人员的提交准备（冒烟、自测）记录，开发人员变化时重置。 */
export function getDevPrep() {
  var d = getDevReview();
  if (!d.prep || d.prep.owner !== d.developer)
    d.prep = { owner: d.developer, smoke: null, self: null };
  return d.prep;
}

/** 阶段流转：立项、需求、设计的审核步骤、文档快照与流转历史。 */
export const flowStore = Object.create(null);

/** 内置演示项目（智能温控平台）默认已完成的阶段。 */
export const DEFAULT_DEMO_STEPS = { planning: true, requirements: true, design: true };

/** 当前项目的阶段流转记录，首次访问时创建默认数据。 */
export function getFlow() {
  var k = state.projectId;
  if (!flowStore[k])
    flowStore[k] = {
      steps: k === 'thermal' ? Object.assign({}, DEFAULT_DEMO_STEPS) : {},
      docs: {},
      history: [],
      created: false,
      version: 'V1.0',
      designType: 'II',
    };
  return flowStore[k];
}

/** 阶段文档正文，key 为「项目 id:文档类型」。 */
export const stageDocs = Object.create(null);

/** 版本锚点：提测 Commit、测试审核、发布评审、发布与结项记录。 */
export const versionAnchorStore = Object.create(null);

/** 指定项目（默认当前项目）的版本锚点记录，首次访问时创建默认数据。 */
export function getVersionAnchor(pid) {
  pid = pid || state.projectId;
  if (!versionAnchorStore[pid])
    versionAnchorStore[pid] = {
      handoffCommit: '',
      handoffVersion: '',
      handoffAt: '',
      history: [],
      testReview: null,
      releaseReview: null,
      published: null,
      closingCommit: '',
    };
  return versionAnchorStore[pid];
}

/** 生命周期表单中在线文档的正文与评论。 */
export const onlineDocs = Object.create(null);

/** 阶段审批记录（所有项目共用一个列表，按 projectId 区分），规则见 domain/approvals.js。 */
export const approvalRequests = [];

export function documentId(prefix) {
  const random = crypto.getRandomValues(new Uint32Array(2));
  return prefix + '-' + Array.from(random, (n) => n.toString(16).padStart(8, '0')).join('');
}

export function createReviewModel() {
  return {
    process: null,
    tasks: [],
    meetings: [],
    feedback: [],
    verdicts: [],
    selected: [],
    selectedTaskId: '',
    view: 'todos',
    filter: '全部',
    query: '',
    batchDraft: {},
    manualDraft: {},
    candidateDraft: null,
    meetingDraft: {},
    counter: 0,
  };
}
