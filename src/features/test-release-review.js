/** 测试阶段审核与统一发布门禁（V52.1）。 */
import { App } from '../core/app.js';
import { showToast } from '../components/toast.js';
import { esc } from '../core/dom.js';
import { v35Stamp } from './dev-review.js';
import {
  v52BaseTestingRender,
  v52CurrentCommit,
  v52Status,
  v52VersionBanner,
} from './version-anchor.js';

/** V52.1 测试审核与发布门禁 */
export function initTestReleaseReview() {
  /* V52.1: explicit test-stage review and unified release gate */

  // The three reports are deliverables. Their review actions never silently
  // substitute for the separate test-stage approval.
  document.addEventListener(
    'click',
    function (e) {
      var b = e.target.closest('[data-v38-report]');
      if (!b) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      var section = b.dataset.section,
        report = App.v37Record(section);
      if (report.status !== '待评审') {
        showToast('请先提交该测试报告评审', 'warn');
        return;
      }
      var commit = v52CurrentCommit();
      if (!commit) {
        showToast('开发检视尚未准出，无法审核测试报告', 'warn');
        return;
      }
      if (report.commit !== commit) {
        showToast(
          '报告关联 Commit 与开发正式移交版本不一致；请重新提交报告以关联 ' + commit,
          'warn',
        );
        return;
      }
      var result = b.dataset.v38Report === 'approve' ? '审核通过' : '已退回';
      report.status = result;
      report.history.push({
        name: report.name,
        version: report.version,
        owner: report.owner,
        conclusion: report.conclusion,
        richHtml: report.richHtml,
        status: result,
        commit: commit,
        at: v35Stamp(),
      });
      App.render();
      showToast(
        result === '审核通过'
          ? '报告审核已通过。下一步请完成「测试阶段统一审核」，通过后发布阶段才会解锁。'
          : '报告已退回，请修改并重新提交',
      );
    },
    true,
  );

  // Place the phase-level review in a prominent location within testing.
  // This uses the exact same v52 testReview record as the process-view panel.
  App.renderTesting = function () {
    return v52VersionBanner() + App.v52TestingReviewPanel() + v52BaseTestingRender();
  };

  function phaseReviewButtons() {
    var z = v52Status(),
      tr = z.testReview;
    if (!z.commit)
      return '<span class="mini-note">请先完成 R3 人工检视并移交 Commit，才可发起测试审核。</span>';
    if (z.testPass)
      return '<span class="tag green">测试阶段审核通过 · ' + esc(z.commit) + '</span>';
    if (!tr || tr.status === '已退回')
      return '<button class="v47-cta" data-v52-action="test-submit">提交测试阶段审核</button>';
    if (tr.status === '待审核')
      return (
        '<button class="v47-cta" data-v52-action="test-approve">模拟测试审核通过</button>' +
        '<button class="v47-btn" data-v52-action="test-reject">模拟退回</button>'
      );
    return '<button class="v47-cta" data-v52-action="test-submit">重新提交测试审核</button>';
  }

  var v521BasePlanning = App.renderPlanning;
  App.renderPlanning = function () {
    var html = v521BasePlanning();
    // Only replace the testing action in the existing right-side approval card.
    // Requirements, design, release and diagram nodes are intentionally unchanged.
    html = html.replace(
      '<button class="v47-cta" data-v47="demo-testing">模拟整机测试报告审核通过</button>',
      phaseReviewButtons(),
    );
    return html;
  };

  // Keep an existing approved phase review visible in the same panel; both
  // the green tab and the release page derive from v52Status().testPass.
}
