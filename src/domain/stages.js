/**
 * 生命周期阶段规则：阶段顺序、完成判断与前置条件。
 *
 * 纯函数，不读取全局状态；所需数据由调用方传入。
 */

/** 需要审核流转的阶段，按先后顺序排列。 */
export const STAGE_ORDER = [
  'planning',
  'requirements',
  'design',
  'development',
  'testing',
  'release',
];

export const STAGE_LABELS = {
  planning: '项目立项',
  requirements: '需求阶段',
  design: '设计阶段',
  development: '开发阶段',
  testing: '测试阶段',
  release: '发布阶段',
};

/** 各项目设计类型需要编写的设计文档。 */
const DESIGN_KEYS_BY_TYPE = {
  I: ['architecture', 'summarydesign', 'detaildesign'],
  II: ['summarydesign', 'detaildesign'],
  III: ['detaildesign'],
  IV: [],
};

const DESIGN_DOC_NAMES = {
  architecture: '软件架构设计',
  summarydesign: '概要设计',
  detaildesign: '详细设计',
};

/** 设计类型对应的设计文档 key；未知类型按 II 类处理。 */
export function designKeysFor(designType) {
  return (DESIGN_KEYS_BY_TYPE[designType] || DESIGN_KEYS_BY_TYPE.II).slice();
}

/** 设计阶段需要评审的文档类型（含软件规格书），按评审先后排列。 */
export function designDocTypes(designType) {
  return ['软件规格书'].concat(
    designKeysFor(designType)
      .map((key) => DESIGN_DOC_NAMES[key])
      .filter(Boolean),
  );
}

/** 开发阶段准出：检视已通过、已提测，且提测 Commit 与检视通过的 Commit 一致。 */
export function isHandoffReady(dev) {
  return !!(dev.approval && dev.handoff && dev.commit && dev.approval.commit === dev.commit);
}

/**
 * 阶段是否已完成。
 *
 * facts 只在需要时读取：
 * - flowSteps：立项 / 需求 / 设计的审核结果
 * - dev：开发检视记录（开发阶段）
 * - gate：版本门禁（测试 / 发布 / 结项）
 */
export function isStageDone(stage, facts) {
  if (stage === 'development') return isHandoffReady(facts.dev);
  if (stage === 'testing') return !!facts.gate.testPass;
  if (stage === 'release') return !!facts.gate.published;
  if (stage === 'closing') {
    const gate = facts.gate;
    return !!(gate.published && gate.closingCommit && gate.closingCommit === gate.commit);
  }
  return !!facts.flowSteps[stage];
}

/** 全生命周期页面的阶段顺序（含结项）。 */
export const LIFECYCLE_STAGES = [...STAGE_ORDER, 'closing'];

/** 阶段前置条件：第一个阶段直接满足，其余阶段要求上一阶段已完成。 */
export function isStagePrereqMet(stage, isDone) {
  const index = STAGE_ORDER.indexOf(stage);
  return index === 0 || isDone(STAGE_ORDER[index - 1]);
}

/** 是否已流转到该阶段：第一个阶段始终到达，其余阶段要求上一阶段已完成（结项要求发布已完成）。 */
export function isStageReached(stage, isDone) {
  const index = LIFECYCLE_STAGES.indexOf(stage);
  if (index < 0) return false;
  return index === 0 || isDone(LIFECYCLE_STAGES[index - 1]);
}

/**
 * 阶段状态：done 已完成，current 已到达但未完成，pending 未到达。
 * 流程图节点、阶段 Tab 和页面是否可操作都使用这一结果。
 */
export function stageState(stage, isDone) {
  if (isDone(stage)) return 'done';
  return isStageReached(stage, isDone) ? 'current' : 'pending';
}

/** 未到达的阶段可以查看，但不能操作。 */
export function isStageEditable(stage, isDone) {
  return stageState(stage, isDone) !== 'pending';
}

/**
 * 流程图节点状态：done / current / pending，项目不涉及的分支或测试项为 skipped。
 *
 * @param {object} node 节点：stage 所属阶段；kind 为 content（交付物）/ approval（审核）/ end（完成）；
 *   可选 designTypes（所属设计分支，如 ['I', 'II']）、testKind（single / long）
 * @param {object} ctx stageStateOf(stage)、designType、isTestEnabled(kind)、approvalStatus(stage)
 */
export function flowNodeState(node, ctx) {
  if (node.designTypes && !node.designTypes.includes(ctx.designType || 'II')) return 'skipped';
  if (node.testKind && !ctx.isTestEnabled(node.testKind)) return 'skipped';
  if (node.kind === 'end') return ctx.stageStateOf('closing') === 'done' ? 'done' : 'pending';
  const state = ctx.stageStateOf(node.stage);
  if (node.kind === 'approval') {
    if (state === 'done') return 'done';
    const status = ctx.approvalStatus ? ctx.approvalStatus(node.stage) : '';
    return state === 'current' && status === '待审核' ? 'current' : 'pending';
  }
  return state;
}
