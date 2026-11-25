/** 测试阶段规则：测试项是否启用与测试报告是否就绪。 */

/** 单板、长运测试可按项目配置关闭；其余测试项始终启用。 */
export function isTestKindEnabled(project, kind) {
  if (kind === 'single') return project.needsSingleTest !== '否';
  if (kind === 'long') return project.needsLongTest !== '否';
  return true;
}

/** 已提交的报告状态。 */
const SUBMITTED_REPORT_STATUSES = ['待评审', '审核通过', '已提交'];

/**
 * 某类测试报告是否就绪：未启用视为跳过；
 * 否则需要一份绑定当前提测 Commit、已提交且填写了结论的报告。
 */
export function reportReadiness(enabled, rows, commit) {
  if (!enabled) return { ready: true, skipped: true };
  const matching = rows.find(
    (r) =>
      SUBMITTED_REPORT_STATUSES.includes(r.status) &&
      r.commit === commit &&
      !!String(r.conclusion || '').trim(),
  );
  return { ready: !!matching, row: matching || null };
}
