/** 跨阶段共享状态与按项目隔离的业务底稿（V38）。 */
import { App } from '../core/app.js';
import { showToast } from '../components/toast.js';
import { esc } from '../core/dom.js';
import { v35Store } from './dev-review.js';
import { project, state } from '../store/state.js';

let v38OldClosingInit;
let v38OldTestInit;
export let v38OldReportSave;
export let v38OldRenderTesting;
let v38OldRenderClosing;
let v38OldRenderRelease;
let v38OldReport;
let v38OldPublishVersions;
let v38OldDefects;

/* V38 跨阶段 Mock 共享状态：不增加角色权限、不对接真实服务 */
export function v38Dev() {
  return (typeof v35Store === 'object' && v35Store[state.projectId]) || null;
}

function v38Status() {
  var dev = v38Dev(),
    report = App.v37Record('system');
  return {
    dev: dev,
    commit: dev && dev.handoff ? dev.commit : null,
    report: report,
    testPass: !!(
      dev &&
      dev.handoff &&
      report.status === '审核通过' &&
      report.commit === dev.commit
    ),
    published: state.v37Published && state.v37Published[state.projectId],
    review: state.v37PublishReview && state.v37PublishReview[state.projectId],
  };
}
App.v38Status = v38Status;

function v38StepBanner() {
  return '';
}
App.v38StepBanner = v38StepBanner;

/** V38 跨阶段共享状态 */
export function initStageProgress() {
  /* V38: 每个项目独立的业务底稿，防止项目间交叉显示 */
  v38OldClosingInit = App.closingInit;
  App.closingInit = function () {
    if (state.v38ClosingProject !== state.projectId) {
      state.v38ClosingProject = state.projectId;
      state.closingForms = null;
      state.closingArchiveRecords = null;
      state.closingEmergencyStatus = '待审批';
      state.closingSection = 'emergency';
    }
    v38OldClosingInit();
  };
  v38OldTestInit = App.testingInit;
  App.testingInit = function () {
    if (state.v38TestProject !== state.projectId) {
      state.v38TestProject = state.projectId;
      state.testingCases = null;
      state.testingDefects = null;
      state.testingQuery = '';
      state.testingDefectQuery = '';
      state.testingSection = 'cases';
    }
    v38OldTestInit();
    state.testingDefects.forEach(function (d) {
      d.project = project().name;
    });
  };
  v38OldReportSave = App.v37SaveReport;
  App.v37SaveReport = function (submit) {
    if (submit) {
      var dev = v38Dev();
      if (!dev || !dev.handoff) {
        showToast('请先由开发工程师完成检视准出并移交当前 Commit', 'warn');
        return;
      }
      var r = App.v37Record(state.testingSection);
      r.commit = dev.commit;
    }
    return v38OldReportSave(submit);
  };
  v38OldRenderTesting = App.renderTesting;
  App.renderTesting = function () {
    return App.v38StepBanner() + v38OldRenderTesting();
  };
  v38OldRenderClosing = App.renderClosing;
  App.renderClosing = function () {
    return App.v38StepBanner() + v38OldRenderClosing();
  };
  v38OldRenderRelease = App.renderRelease;
  App.renderRelease = function () {
    return App.v38StepBanner() + v38OldRenderRelease();
  };
  v38OldReport = App.renderTestingReport;
  App.renderTestingReport = function (section) {
    var html = v38OldReport(section),
      r = App.v37Record(section);
    if (r.status === '待评审')
      html = html.replace(
        'data-v37-report-action="submit">提交评审</button>',
        'data-v37-report-action="submit">提交评审</button><button class="btn primary" data-v38-report="approve" data-section="' +
          section +
          '">模拟审核通过</button><button class="btn danger" data-v38-report="reject" data-section="' +
          section +
          '">模拟退回</button>',
      );
    return html;
  };
  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-v38-report]');
    if (!b) return;
    e.preventDefault();
    e.stopPropagation();
    var r = App.v37Record(b.dataset.section),
      next = b.dataset.v38Report === 'approve' ? '审核通过' : '已退回';
    if (r.status !== '待评审') {
      showToast('请先提交测试报告评审', 'warn');
      return;
    }
    var dev = v38Dev();
    if (!dev || !dev.handoff || r.commit !== dev.commit) {
      showToast('测试报告对应 Commit 与已移交的开发版本不一致', 'warn');
      return;
    }
    r.status = next;
    r.history.push({
      name: r.name,
      version: r.version,
      owner: r.owner,
      conclusion: r.conclusion,
      status: next,
      at: new Date().toLocaleString('zh-CN', { hour12: false }),
    });
    App.render();
    showToast('测试报告模拟审核：' + next);
  });
  v38OldPublishVersions = App.v37ReleaseVersions;
  App.v37ReleaseVersions = function () {
    var html = v38OldPublishVersions(),
      z = App.v38Status();
    var prerequisite =
      '<div class="notice ' +
      (z.commit && z.testPass ? 'success' : 'warn') +
      '"><i>◎</i><span><b>版本发布前置校验</b><br>开发移交：' +
      (z.commit ? '✓ ' + esc(z.commit) : '✕ 未移交') +
      '；整机测试报告：' +
      (z.testPass ? '✓ 审核通过，Commit一致' : '✕ ' + esc(z.report.status) + ' 或版本不匹配') +
      '。<br>前置条件未满足时，正式发布不可操作。</span></div>';
    return html
      .replace('<div class="form-foot">', prerequisite + '<div class="form-foot">')
      .replace(
        'data-v37-publish="publish" ' + (z.review === '已通过' ? '' : 'disabled'),
        'data-v37-publish="publish" ' +
          (z.review === '已通过' && z.commit && z.testPass ? '' : 'disabled'),
      );
  };
  document.addEventListener(
    'click',
    function (e) {
      var b = e.target.closest('[data-v37-publish="publish"]');
      if (!b) return;
      var z = App.v38Status();
      if (!z.commit || !z.testPass) {
        e.preventDefault();
        e.stopImmediatePropagation();
        showToast('发布受阻：须先开发提测移交并完成整机测试报告审核', 'warn');
      }
    },
    true,
  );
  document.addEventListener(
    'click',
    function (e) {
      var b = e.target.closest('[data-release-drawer-action="submit"]');
      if (!b || state.lifecycleStage !== 'closing') return;
      var z = App.v38Status();
      if (!z.published) {
        e.preventDefault();
        e.stopImmediatePropagation();
        showToast('结项申请受阻：本项目版本尚未发布', 'warn');
      }
    },
    true,
  );
  v38OldDefects = App.testingDefectRows;
  App.testingDefectRows = function () {
    return v38OldDefects().filter(function (x) {
      return x.project === project().name;
    });
  };
}
