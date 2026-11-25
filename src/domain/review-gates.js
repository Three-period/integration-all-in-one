/** 正式人工检视门禁：提交检视申请的条件、准出门禁与可裁定问题。 */

/** 专业检视必须完成的三项检查。 */
export const MANUAL_CHECKS = ['高风险必查', 'AI 未有效覆盖', '独立抽检'];

/** 人工检视中视为已闭环的问题状态。 */
export const REVIEW_CLOSED_STATUSES = ['已关闭', '已闭环', '授权例外', '已裁定无问题'];

/** 需要检视工程师介入的问题状态。 */
const HUMAN_STATUSES = ['异议待裁定', '待人工处置', '待线下评审'];

/** 检视工程师角色名，用于识别人工裁定。 */
export const REVIEWER_ACTOR = '检视工程师';

/** 当前 Commit 的最新 AI 检视批次，没有时返回 null。 */
export function currentRun(dev) {
  return (
    (dev.runs || [])
      .slice()
      .reverse()
      .find((r) => r.commit === dev.commit) || null
  );
}

export function openItems(dev) {
  return (dev.issues || []).filter((i) => !REVIEW_CLOSED_STATUSES.includes(i.status));
}

/** 需要检视工程师处理的未闭环问题。 */
export function humanItems(dev) {
  return openItems(dev).filter((i) => HUMAN_STATUSES.includes(i.status));
}

/** 开发或 AI 可以自主处理的未闭环问题。 */
export function selfItems(dev) {
  return openItems(dev).filter((i) => !HUMAN_STATUSES.includes(i.status));
}

/**
 * 是否为复检：AI 问题待复检，或人工检视 / 裁定 / 线下评审要求整改的问题
 * 在新 Commit 上待复检。
 */
export function isRecheckRun(dev) {
  const aiRecheck = !!(
    dev.commit &&
    dev.issues.some(
      (i) => i.source === 'AI 检视' && i.status === '待复检' && i.commit !== dev.commit,
    )
  );
  return (
    aiRecheck ||
    openItems(dev).some(
      (i) =>
        ['待整改', '待复检'].includes(i.status) &&
        i.commit !== dev.commit &&
        (i.source === '人工检视' || i.humanVerdictBy === REVIEWER_ACTOR || i.meetingGroupId),
    )
  );
}

/**
 * 开发能否提交正式人工检视申请，以及本次检视的类型和关联问题。
 *
 * @param {object} dev 开发检视记录
 * @param {object} model 检视流程模型
 * @param {object} readiness 提交准入状态（冒烟、自测、Commit）
 */
export function formalSubmitCheck(dev, model, readiness) {
  const run = currentRun(dev);
  const own = selfItems(dev);
  const human = humanItems(dev);
  const process = model.process;
  if (!readiness.commit || !readiness.smoke || !readiness.self)
    return { ok: false, reason: '请先完成冒烟、自测并提交当前 Commit' };
  if (!run) return { ok: false, reason: '当前 Commit 尚未生成 AI 检视批次' };
  if (own.length)
    return {
      ok: false,
      reason: `仍有 ${own.length} 条开发/AI可自主处理问题：${own.map((x) => x.id).join('、')}`,
    };
  if (run.result !== '完成' && !human.some((x) => x.status === '待人工处置'))
    return { ok: false, reason: 'AI 执行异常，请先重试或登记人工处置异常' };
  if (!process) return { ok: true, type: '首次正式检视', issues: human };
  const unsettled = human.filter((i) => !i.humanTaskId);
  if (!unsettled.length)
    return { ok: false, reason: '没有新增待人工介入问题，保留原检视过程，直接查看准出门禁' };
  return {
    ok: true,
    type: unsettled.some((i) => i.source === 'AI 执行异常') ? 'AI异常定向处置' : '追加异议裁定',
    issues: unsettled,
  };
}

/**
 * 正式检视准出门禁。
 *
 * G1：必须处理的问题全部闭环，且 AI 检视有效（或执行失败的批次已逐条人工裁定无问题）；
 * G2：三项专业检视全部完成。检视工程师在 G1、G2 都通过后才能确认准出。
 */
export function reviewApprovalState(dev, model, role) {
  const process = model.process;
  const run = currentRun(dev);
  const blockers = openItems(dev);
  const missing = MANUAL_CHECKS.filter(
    (k) => !(process && process.manualChecks[k] && process.manualChecks[k].completed),
  );
  const aiValid = !!(
    run &&
    run.result === '完成' &&
    Array.isArray(run.checks) &&
    run.checks.length > 0 &&
    run.checks.every((c) => c.result === '通过')
  );
  // A failed AI run can only be cleared through explicit, recorded per-issue human
  // "no issue" verdicts. It must never silently pass on missing checks or a new Commit.
  const failedRunIssues = run
    ? (dev.issues || []).filter(
        (i) => (i.run === run.id && i.source === 'AI 执行异常') || i.aiFailedRunId === run.id,
      )
    : [];
  const manualResolution = !!(
    process &&
    run &&
    run.result === '执行失败' &&
    failedRunIssues.length > 0 &&
    failedRunIssues.every(
      (i) =>
        REVIEW_CLOSED_STATUSES.includes(i.status) &&
        (model.verdicts || []).some((v) => v.issueId === i.id && v.result === '无问题'),
    )
  );
  const hasTask = !!(process && process.firstFormalTaskId);
  const gate1 = blockers.length === 0 && (aiValid || manualResolution);
  const gate2 = missing.length === 0;
  return {
    process,
    gate1,
    gate2,
    passed: gate1 && gate2 && hasTask && role === 'reviewer' && !process.approval,
    missing,
    blockers,
    aiValid: aiValid || manualResolution,
    aiManuallyResolved: manualResolution,
    hasTask,
  };
}

/** 问题能否在当前检视任务中批量处理：属于任务、待裁定或待人工处置，且未进入线下评审。 */
export function isIssueEligible(task, issue) {
  return !!(
    task &&
    task.issueIds.indexOf(issue.id) >= 0 &&
    ['异议待裁定', '待人工处置'].includes(issue.status) &&
    !issue.meetingGroupId
  );
}
