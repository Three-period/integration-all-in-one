/** 版本门禁：测试审核、发布评审、发布与结项都必须绑定同一个提测 Commit。 */

/**
 * 根据版本锚点记录和当前提测 Commit 计算门禁状态。
 *
 * @param {object} anchor 版本锚点记录（测试审核、发布评审、发布、结项 Commit）
 * @param {string} commit 当前提测 Commit，未提测时为空字符串
 */
export function computeReleaseGate(anchor, commit) {
  const testReview = anchor.testReview;
  const releaseReview = anchor.releaseReview;
  const published = anchor.published;
  const testPass = !!(
    commit &&
    testReview &&
    testReview.status === '审核通过' &&
    testReview.commit === commit
  );
  const releasePass = !!(
    testPass &&
    releaseReview &&
    releaseReview.status === '已通过' &&
    releaseReview.commit === commit
  );
  return {
    commit,
    version: anchor.handoffVersion,
    testReview,
    testPass,
    releaseReview,
    releasePass,
    published:
      releasePass && published && published.status === '已发布' && published.commit === commit
        ? published
        : null,
    closingCommit: anchor.closingCommit,
  };
}
