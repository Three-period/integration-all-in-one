/** 跨阶段 Commit 锚点（V52）：测试、发布、结项绑定同一提测版本。 */
import { getDevReview, getFlow, getVersionAnchor } from '../store/lifecycle.js';
import { App } from '../core/app.js';
import { showToast } from '../components/toast.js';
import { esc } from '../core/dom.js';
import { nowStamp } from './dev-review.js';
import { logFlowNote } from './lifecycle-flow.js';
import { getDevRecord } from './stage-progress.js';
import { closingCurrent } from '../pages/project/closing.js';
import { computeReleaseGate } from '../domain/release-gate.js';
import { isHandoffReady } from '../domain/stages.js';
import { project, state } from '../store/state.js';

/* V52: unified cross-stage commit anchor and test/release/closing gates */

/**
 * 提测 Commit 变化时更新版本锚点：旧版本记入历史，并作废其测试审核、发布评审、发布与结项记录。
 * 在检视通过、开发提测等改变提测状态的操作之后调用。
 */
export function syncHandoff() {
  var d = getDevReview(),
    x = getVersionAnchor();
  if (isHandoffReady(d)) {
    if (x.handoffCommit !== d.approval.commit) {
      if (x.handoffCommit)
        x.history.unshift({
          commit: x.handoffCommit,
          version: x.handoffVersion,
          at: x.handoffAt,
          status: '已被新版本替代',
        });
      x.handoffCommit = d.approval.commit;
      x.handoffVersion = project().version || 'V1.0';
      x.handoffAt = d.approval.at || nowStamp();
      x.testReview = null;
      x.releaseReview = null;
      x.published = null;
      x.closingCommit = '';
      getFlow().steps.testing = false;
      getFlow().steps.release = false;
      getFlow().steps.closing = false;
      if (state.v37PublishReview) delete state.v37PublishReview[state.projectId];
      if (state.v37Published) delete state.v37Published[state.projectId];
    }
    return x.handoffCommit;
  }
  return '';
}

/**
 * 当前提测 Commit：开发已提测且与检视通过的 Commit 一致、版本锚点也已同步时返回，否则为空。
 * 只读取，不修改数据；锚点在检视通过 / 提测时由 syncHandoff() 显式更新。
 */
export function getHandoffCommit() {
  var d = getDevReview(),
    x = getVersionAnchor();
  return isHandoffReady(d) && x.handoffCommit === d.approval.commit ? x.handoffCommit : '';
}

/** 当前项目的版本门禁（规则见 domain/release-gate.js）。 */
export function getReleaseGate() {
  var anchor = getVersionAnchor();
  return computeReleaseGate(anchor, getHandoffCommit());
}

/** 跨阶段汇总：提测 Commit、开发记录、系统测试报告与测试 / 发布状态。 */
export function getStageStatus() {
  var z = getReleaseGate(),
    dev = getDevRecord(),
    report = App.getTestReport('system');
  return {
    dev: dev,
    commit: z.commit || null,
    report: report,
    testPass: z.testPass,
    published: z.published,
    review: z.releaseReview,
  };
}

export function renderVersionBanner() {
  return '';
}

export function renderAnchoredReleaseVersions() {
  App.releaseInit();
  var z = getReleaseGate(),
    rr = z.releaseReview,
    pub = z.published;
  var reviewButton =
    '<span class="tag ' +
    (z.releasePass ? 'green' : 'gray') +
    '">' +
    (z.releasePass ? '发布评审已通过' : '发布评审通过后可发布') +
    '</span>';
  var publishButton = z.releasePass
    ? pub
      ? '<span class="tag green">版本已发布</span>'
      : '<button class="btn primary" data-v52-release="publish">执行版本发布</button>'
    : '<button class="btn primary" disabled>执行版本发布</button>';
  return (
    '<section class="closing-panel"><div class="closing-panel-head"><div><h3>版本发布</h3><p>发布评审 / 文档归档 / 版本发布 · Mock 演示</p></div></div><div class="closing-form">' +
    renderVersionBanner() +
    '<div class="kv-grid"><div class="kv"><label>发布版本</label><div>' +
    esc(z.version || '—') +
    '</div></div><div class="kv"><label>开发移交 Commit</label><div>' +
    esc(z.commit || '—') +
    '</div></div><div class="kv"><label>测试审核</label><div>' +
    esc(z.testReview ? z.testReview.status : '待审核') +
    '</div></div><div class="kv"><label>发布审批</label><div>' +
    esc(rr ? rr.status : '待提交') +
    '</div></div><div class="kv"><label>正式发布</label><div>' +
    esc(pub ? pub.status : '待发布') +
    '</div></div><div class="kv"><label>发布 Commit</label><div>' +
    esc(pub ? pub.commit : '—') +
    '</div></div></div><div class="form-foot">' +
    reviewButton +
    publishButton +
    '</div><div class="mini-note">发布评审与正式发布分别记录，二者均绑定测试审核通过的同一 Commit。</div></div></section>'
  );
}

/** V52 跨阶段 Commit 锚点与测试/发布/结项门禁 */
export function initVersionAnchor() {
  /* 正式发布：发布评审通过后执行，绑定同一提测 Commit。 */
  document.addEventListener(
    'click',
    function (e) {
      var b = e.target.closest('[data-v52-release]');
      if (!b) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      var action = b.dataset.v52Release,
        z = getReleaseGate(),
        x = getVersionAnchor(),
        now = nowStamp();
      if (action === 'publish') {
        if (
          !z.testPass ||
          !z.releasePass ||
          !x.releaseReview ||
          x.releaseReview.commit !== z.commit
        ) {
          showToast('发布受阻：测试审核与发布审批必须关联同一 Commit', 'warn');
          return;
        }
        x.published = {
          status: '已发布',
          commit: z.commit,
          version: z.version || project().version || 'V1.0',
          at: now,
        };
        if (!state.v37Published) state.v37Published = {};
        state.v37Published[state.projectId] = x.published;
        getFlow().steps.release = true;
        logFlowNote('正式版本已发布，关联 Commit ' + z.commit);
        project().status = '已发布';
        project().flowStatus = '已发布';
        project().progress = 100;
        showToast('版本已发布，版本链路校验通过');
        App.render();
        return;
      }
    },
    true,
  );
  /* A submitted closing application snapshots the already-published version. */
  document.addEventListener(
    'click',
    function (e) {
      var b = e.target.closest('[data-release-drawer-action="submit"]');
      if (!b) return;
      var z = getReleaseGate();
      if (!z.published || z.published.commit !== z.commit) {
        e.preventDefault();
        e.stopImmediatePropagation();
        showToast('结项申请受阻：必须先完成同一 Commit 的测试审核与正式发布', 'warn');
        return;
      }
      var item = closingCurrent();
      item.version = z.published.version;
      item.commit = z.published.commit;
      item.publishedAt = z.published.at;
      getVersionAnchor().closingCommit = z.commit;
      getFlow().steps.closing = true;
      logFlowNote('项目结项申请已提交，关联发布 Commit ' + z.commit);
    },
    true,
  );
}
