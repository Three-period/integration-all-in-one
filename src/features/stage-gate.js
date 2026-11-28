/** 阶段门禁、检视到测试的自动流转与集中审批面板（V48）。 */
import { getDevReview } from '../store/lifecycle.js';
import { App } from '../core/app.js';
import { showToast } from '../components/toast.js';
import { isFormalReviewReady, logDevEvent, pendingIssues, nowStamp } from './dev-review.js';
import { logFlowNote } from './lifecycle-flow.js';
import { syncHandoff } from './version-anchor.js';
import { project, state } from '../store/state.js';

/** V48 阶段门禁与集中审批 */
export function initStageGate() {
  /* V48: stage gate, automatic review-to-testing transfer, central mock approval, dashboard */

  // Keep approved Commit consistent, and move into testing without extra developer handoff click.
  document.addEventListener(
    'click',
    function (e) {
      var el = e.target.closest('[data-v35="approve"]');
      if (!el) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      var d = getDevReview();
      if (
        state.role !== 'reviewer' ||
        !isFormalReviewReady() ||
        !['高风险必查', 'AI 未有效覆盖', '独立抽检'].every(function (k) {
          return d.manual.some(function (x) {
            return x.kind === k && x.commit === d.commit && x.result === '无新增问题';
          });
        }) ||
        pendingIssues().length
      ) {
        showToast('请先完成三项必检、问题闭环和正式检视准入', 'warn');
        return;
      }
      if (!d.commit) {
        showToast('待移交 Commit 为空', 'warn');
        return;
      }
      d.approval = { commit: d.commit, at: nowStamp(), reviewer: '检视工程师' };
      d.handoff = true;
      syncHandoff();
      logDevEvent('人工检视准出通过；已自动移交 Commit ' + d.commit + ' 至测试');
      var p = project();
      p.flowStatus = '测试阶段';
      p.status = '进行中';
      p.progress = Math.max(Number(p.progress) || 0, 60);
      logFlowNote('R3 人工检视通过，系统自动移交 Commit ' + d.commit + '，测试阶段解锁');
      state.lifecycleStage = 'testing';
      App.render();
      showToast('人工检视通过！已自动移交 ' + d.commit + '，测试阶段已解锁');
    },
    true,
  );
}
