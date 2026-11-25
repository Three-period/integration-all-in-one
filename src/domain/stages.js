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

/** 阶段前置条件：第一个阶段直接满足，其余阶段要求上一阶段已完成。 */
export function isStagePrereqMet(stage, isDone) {
  const index = STAGE_ORDER.indexOf(stage);
  return index === 0 || isDone(STAGE_ORDER[index - 1]);
}
