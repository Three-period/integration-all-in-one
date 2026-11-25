/** 开发与 AI 检视规则：准入、AI 检视结果、正式检视与复检判断。 */

/** AI 检视中视为已闭环的问题状态。 */
export const AI_CLOSED_STATUSES = ['已关闭', '授权例外'];

/** 当前 Commit 由当前开发人员提交的最新一条记录（冒烟 / 自测）。 */
export function findCurrentRecord(dev, list) {
  return list
    .slice()
    .reverse()
    .find((r) => r.commit === dev.commit && r.owner === dev.developer);
}

/**
 * 提交 AI 检视的准入状态。
 *
 * 当前 Commit 必须由当前开发人员提交，并绑定冒烟与自测记录；
 * 认可整改后（needsNewCommit）必须重新冒烟、自测并提交新 Commit。
 */
export function devReadiness(dev, prep) {
  const owner = dev.commits.find((c) => c.commit === dev.commit && c.owner === dev.developer);
  const result = {
    smoke: !!(owner && findCurrentRecord(dev, dev.smokes)),
    self: !!(owner && findCurrentRecord(dev, dev.selfTests)),
    commit: !!dev.commit && !!owner,
    stageSmoke: !!prep.smoke,
    stageSelf: !!prep.self,
  };
  if (dev.v47NeedsNewCommit) {
    result.smoke = false;
    result.self = false;
    result.commit = false;
  }
  return result;
}

/** 当前 Commit 的最新 AI 检视批次。 */
export function latestRun(dev) {
  return dev.runs
    .slice()
    .reverse()
    .find((r) => r.commit === dev.commit);
}

/** 尚未闭环的 AI 检视问题。 */
export function pendingIssues(dev) {
  return dev.issues.filter((i) => !AI_CLOSED_STATUSES.includes(i.status));
}

/** 最新 AI 检视已完成、四类检查全部通过，且没有未闭环问题。 */
export function isAiReviewClear(dev) {
  const run = latestRun(dev);
  return !!(
    run &&
    run.result === '完成' &&
    run.checks.every((c) => c.result === '通过') &&
    pendingIssues(dev).length === 0
  );
}

/** 可以开展正式人工检视：AI 检视已清空，且开发已就当前 Commit 提交正式检视申请。 */
export function isFormalReviewReady(dev) {
  return !!(isAiReviewClear(dev) && dev.formalRequest && dev.formalRequest.commit === dev.commit);
}
