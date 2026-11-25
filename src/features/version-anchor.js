/** 跨阶段 Commit 锚点（V52）：测试、发布、结项绑定同一提测版本。 */
import { App } from '../core/app.js';
import { showToast } from '../components/toast.js';
import { esc } from '../core/dom.js';
import { v35Data, v35Stamp, v35Store } from './dev-review.js';
import { v47Flow, v47Note } from './lifecycle-flow.js';
import { v38Dev, v38OldRenderTesting, v38OldReportSave } from './stage-progress.js';
import { releaseCurrent } from '../pages/project/release.js';
import { project, state } from '../store/state.js';

let v52OldStageDone;
let v52BaseReportSave;
export let v52BaseTestingRender;
let v52BaseReleaseDetailBody;
let v52BaseSeed;
let v52BaseReset;

/* V52: unified cross-stage commit anchor and test/release/closing gates */
const v52Store = Object.create(null);

export function v52Data(pid) {
  pid = pid || state.projectId;
  if (!v52Store[pid])
    v52Store[pid] = {
      handoffCommit: '',
      handoffVersion: '',
      handoffAt: '',
      history: [],
      testReview: null,
      releaseReview: null,
      published: null,
      closingCommit: '',
    };
  return v52Store[pid];
}

export function v52SyncHandoff() {
  var d = v35Data(),
    x = v52Data();
  if (d.handoff && d.approval && d.commit && d.approval.commit === d.commit) {
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
      x.handoffAt = d.approval.at || v35Stamp();
      x.testReview = null;
      x.releaseReview = null;
      x.published = null;
      x.closingCommit = '';
      v47Flow().steps.testing = false;
      v47Flow().steps.release = false;
      v47Flow().steps.closing = false;
      if (state.v37PublishReview) delete state.v37PublishReview[state.projectId];
      if (state.v37Published) delete state.v37Published[state.projectId];
    }
    return x.handoffCommit;
  }
  return '';
}

export function v52CurrentCommit() {
  return v52SyncHandoff();
}

export function v52Status() {
  var x = v52Data(),
    commit = v52CurrentCommit(),
    tr = x.testReview,
    rr = x.releaseReview,
    pub = x.published;
  var testPass = !!(commit && tr && tr.status === '审核通过' && tr.commit === commit);
  var releasePass = !!(testPass && rr && rr.status === '已通过' && rr.commit === commit);
  var published =
    releasePass && pub && pub.status === '已发布' && pub.commit === commit ? pub : null;
  return {
    commit: commit,
    version: x.handoffVersion,
    testReview: tr,
    testPass: testPass,
    releaseReview: rr,
    releasePass: releasePass,
    published: published,
    closingCommit: x.closingCommit,
  };
}

export function v52VersionBanner() {
  return '';
}

function v52TestingReviewPanel() {
  var z = v52Status(),
    tr = z.testReview,
    sections = ['single', 'long', 'system'],
    names = { single: '单板测试报告', long: '长运测试报告', system: '整机测试报告' };
  var rows = sections
    .map(function (k) {
      var r = App.v37Record(k);
      return (
        '<div class="kv"><label>' +
        names[k] +
        '</label><div>' +
        esc(r.status || '草稿') +
        '</div><small class="mini-note">' +
        esc(r.commit || '尚未关联版本') +
        '</small></div>'
      );
    })
    .join('');
  var action = !z.commit
    ? '<button class="btn" disabled>等待开发版本移交</button>'
    : !tr || tr.status === '已退回'
      ? '<button class="btn primary" data-v52-action="test-submit">提交测试审核</button>'
      : tr.status === '待审核'
        ? '<button class="btn primary" data-v52-action="test-approve">模拟审核通过</button><button class="btn danger" data-v52-action="test-reject">模拟审核退回</button>'
        : '<span class="tag green">测试阶段已准出</span>';
  return (
    '<section class="card card-pad" style="margin-top:14px"><div class="page-head" style="margin-bottom:10px"><div><h3 class="section-title" style="margin:0">测试阶段统一审核</h3><p class="mini-note">测试报告作为阶段交付物；统一测试审核作为阶段准出条件。</p></div><span class="tag ' +
    (z.testPass ? 'green' : tr && tr.status === '待审核' ? 'orange' : 'gray') +
    '">' +
    (tr ? esc(tr.status) : '待提交') +
    '</span></div><div class="kv-grid">' +
    rows +
    '</div><div class="notice" style="margin-top:12px"><i>◎</i><span>本次测试审核绑定版本：<b>' +
    esc(z.commit || '尚未移交') +
    '</b>。三类报告按业务需要形成，不再要求整机报告单独承担阶段准出。</span></div><div class="form-foot">' +
    action +
    '</div>' +
    (tr
      ? '<p class="mini-note">审核人：' +
        esc(tr.reviewer || '待分配') +
        ' · 时间：' +
        esc(tr.at || '—') +
        ' · 审核版本：' +
        esc(tr.commit || '—') +
        '</p>'
      : '') +
    '</section>'
  );
}
App.v52TestingReviewPanel = v52TestingReviewPanel;

function v52ReleaseVersions() {
  App.closingInit();
  var z = v52Status(),
    rr = z.releaseReview,
    pub = z.published;
  var reviewButton = z.testPass
    ? rr && rr.status === '已通过'
      ? '<span class="tag green">发布评审已通过</span>'
      : '<button class="btn" data-v52-release="review">提交发布评审</button>'
    : '<button class="btn" disabled>等待测试审核通过</button>';
  var publishButton = z.releasePass
    ? pub
      ? '<span class="tag green">版本已发布</span>'
      : '<button class="btn primary" data-v52-release="publish">执行版本发布</button>'
    : '<button class="btn primary" disabled>执行版本发布</button>';
  return (
    '<section class="closing-panel"><div class="closing-panel-head"><div><h3>版本发布</h3><p>发布评审 / 文档归档 / 版本发布 · Mock 演示</p></div></div><div class="closing-form">' +
    v52VersionBanner() +
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
  App.v38Status = function () {
    var z = v52Status(),
      dev = v38Dev(),
      report = App.v37Record('system');
    return {
      dev: dev,
      commit: z.commit || null,
      report: report,
      testPass: z.testPass,
      published: z.published,
      review: z.releaseReview,
    };
  };
  v52OldStageDone = App.v47StageDone;
  App.v47StageDone = function (k) {
    if (k === 'development') return !!v52CurrentCommit();
    if (k === 'testing') return !!v52Status().testPass;
    if (k === 'release') return !!v52Status().published;
    if (k === 'closing') {
      var z = v52Status();
      return !!(z.published && z.closingCommit && z.closingCommit === z.commit);
    }
    return v52OldStageDone(k);
  };
  /* Reports are outputs. Bind every saved/submitted report to the immutable handoff Commit. */
  v52BaseReportSave = v38OldReportSave;
  App.v37SaveReport = function (submit) {
    var commit = v52CurrentCommit();
    if (!commit) {
      showToast('请先完成开发检视准出并移交正式 Commit', 'warn');
      return;
    }
    var r = App.v37CollectReport();
    r.commit = commit;
    r.version = project().version || v52Data().handoffVersion || r.version;
    return v52BaseReportSave(submit);
  };
  v52BaseTestingRender = v38OldRenderTesting;
  App.renderTesting = function () {
    return v52VersionBanner() + v52BaseTestingRender() + App.v52TestingReviewPanel();
  };
  App.v38StepBanner = function () {
    return v52VersionBanner();
  };
  App.v37ReleaseVersions = v52ReleaseVersions;
  /* Expose the exact published version on the closing application. */
  v52BaseReleaseDetailBody = App.releaseDetailBody;
  App.releaseDetailBody = function (item) {
    var z = v52Status();
    return (
      v52BaseReleaseDetailBody(item) +
      '<div class="detail-section"><h4>结项版本校验</h4><div class="kv-grid"><div class="kv"><label>正式发布版本</label><div>' +
      esc(z.published ? z.published.version : '—') +
      '</div></div><div class="kv"><label>正式发布 Commit</label><div>' +
      esc(z.published ? z.published.commit : '—') +
      '</div></div></div><p class="mini-note">提交结项时自动固化本次正式发布的版本与 Commit，不允许引用其他版本。</p></div>'
    );
  };
  /* Central test review and release actions. */
  document.addEventListener(
    'click',
    function (e) {
      var b = e.target.closest('[data-v52-action], [data-v52-release]');
      if (!b) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      var action = b.dataset.v52Action || b.dataset.v52Release,
        z = v52Status(),
        x = v52Data(),
        now = v35Stamp();
      if (action === 'test-submit') {
        if (!z.commit) {
          showToast('尚无有效开发移交版本，无法提交测试审核', 'warn');
          return;
        }
        x.testReview = { status: '待审核', commit: z.commit, reviewer: '赵敏', at: now };
        showToast('测试审核已提交，等待模拟审核');
        App.render();
        return;
      }
      if (action === 'test-approve' || action === 'test-reject') {
        if (
          !z.commit ||
          !x.testReview ||
          x.testReview.status !== '待审核' ||
          x.testReview.commit !== z.commit
        ) {
          showToast('测试审核记录与当前移交 Commit 不一致，请重新提交审核', 'warn');
          return;
        }
        x.testReview.status = action === 'test-approve' ? '审核通过' : '已退回';
        x.testReview.reviewer = '赵敏';
        x.testReview.at = now;
        if (action === 'test-approve') {
          v47Flow().steps.testing = true;
          project().progress = Math.max(Number(project().progress) || 0, 82);
          project().flowStatus = '发布阶段';
          v47Note('测试审核通过，关联 Commit ' + z.commit);
          state.lifecycleStage = 'release';
          state.projectSection = 'lifecycle';
          showToast('测试审核通过，已解锁发布阶段');
        } else {
          v47Flow().steps.testing = false;
          v47Note('测试审核退回，关联 Commit ' + z.commit);
          showToast('测试审核已退回，请补充测试结果后重新提交');
        }
        App.render();
        return;
      }
      if (action === 'review') {
        if (!z.testPass) {
          showToast('测试审核尚未通过，无法发起发布评审', 'warn');
          return;
        }
        x.releaseReview = {
          status: '已通过',
          commit: z.commit,
          version: z.version || project().version || 'V1.0',
          reviewer: '张主管',
          at: now,
        };
        if (!state.v37PublishReview) state.v37PublishReview = {};
        state.v37PublishReview[state.projectId] = x.releaseReview;
        v47Note('发布评审通过，关联 Commit ' + z.commit);
        showToast('发布评审模拟通过');
        App.render();
        return;
      }
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
        v47Flow().steps.release = true;
        v47Note('正式版本已发布，关联 Commit ' + z.commit);
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
  /* One-click lifecycle demo uses the same gates and writes the same version records. */
  App.v47Test = function () {
    var commit = v52CurrentCommit(),
      p = project();
    if (!commit) {
      showToast('开发尚未完成检视准出与 Commit 移交', 'warn');
      return;
    }
    var r = App.v37Record('system'),
      now = v35Stamp(),
      x = v52Data();
    r.name = '整机测试报告';
    r.version = p.version || x.handoffVersion || 'V1.0';
    r.owner = '赵敏';
    r.commit = commit;
    r.conclusion = 'Mock 整机功能、联调与回归测试完成，测试结论通过。';
    r.status = '审核通过';
    r.history.push({
      name: r.name,
      version: r.version,
      owner: r.owner,
      conclusion: r.conclusion,
      status: r.status,
      at: now,
      commit: commit,
    });
    x.testReview = { status: '审核通过', commit: commit, reviewer: '赵敏', at: now };
    v47Flow().steps.testing = true;
    v47Note('测试审核通过，关联 ' + commit);
    p.progress = Math.max(Number(p.progress) || 0, 82);
    p.flowStatus = '发布阶段';
    state.lifecycleStage = 'release';
    App.render();
    showToast('模拟测试审核通过，已关联开发移交 Commit');
  };
  App.v47Release = function () {
    var z = v52Status(),
      x = v52Data(),
      p = project(),
      now = v35Stamp();
    if (!z.testPass) {
      showToast('测试审核未通过，无法发布', 'warn');
      return;
    }
    x.releaseReview = {
      status: '已通过',
      commit: z.commit,
      version: z.version || p.version || 'V1.0',
      reviewer: '张主管',
      at: now,
    };
    x.published = {
      status: '已发布',
      commit: z.commit,
      version: z.version || p.version || 'V1.0',
      at: now,
    };
    if (!state.v37PublishReview) state.v37PublishReview = {};
    if (!state.v37Published) state.v37Published = {};
    state.v37PublishReview[state.projectId] = x.releaseReview;
    state.v37Published[state.projectId] = x.published;
    v47Flow().steps.release = true;
    v47Note('发布评审通过、正式发布完成，关联 Commit ' + z.commit);
    p.status = '已发布';
    p.flowStatus = '已发布';
    p.progress = 100;
    App.render();
    showToast('模拟发布完成，Commit 版本校验通过');
  };
  /* A submitted closing application snapshots the already-published version. */
  document.addEventListener(
    'click',
    function (e) {
      var b = e.target.closest('[data-release-drawer-action="submit"]');
      if (!b) return;
      var z = v52Status();
      if (!z.published || z.published.commit !== z.commit) {
        e.preventDefault();
        e.stopImmediatePropagation();
        showToast('结项申请受阻：必须先完成同一 Commit 的测试审核与正式发布', 'warn');
        return;
      }
      var item = releaseCurrent();
      item.version = z.published.version;
      item.commit = z.published.commit;
      item.publishedAt = z.published.at;
      v52Data().closingCommit = z.commit;
      v47Flow().steps.closing = true;
      v47Note('项目结项申请已提交，关联发布 Commit ' + z.commit);
    },
    true,
  );
  /* Scenario presets and reset also manage the unified version records. */
  v52BaseSeed = App.v39Seed;
  App.v39Seed = function (key) {
    delete v52Store[state.projectId];
    v52BaseSeed(key);
    var d = v35Data(),
      x = v52Data(),
      commit = d.approval && d.approval.commit;
    if (['handoff', 'testpass', 'published'].includes(key) && commit) {
      x.handoffCommit = commit;
      x.handoffVersion = project().version || 'V2.6';
      x.handoffAt = d.approval.at || v35Stamp();
    }
    if (['testpass', 'published'].includes(key) && commit)
      x.testReview = {
        status: '审核通过',
        commit: commit,
        reviewer: '赵敏',
        at: '2026-11-04 16:30',
      };
    if (key === 'published' && commit) {
      x.releaseReview = {
        status: '已通过',
        commit: commit,
        version: project().version || 'V2.6',
        reviewer: '张主管',
        at: '2026-11-04 16:30',
      };
      x.published = {
        status: '已发布',
        commit: commit,
        version: project().version || 'V2.6',
        at: '2026-11-04 16:30',
      };
    }
    App.render();
  };
  v52BaseReset = App.v47Reset;
  App.v47Reset = function () {
    var had = Object.keys(v35Store).length;
    v52BaseReset();
    if (had && Object.keys(v35Store).length === 0)
      Object.keys(v52Store).forEach(function (k) {
        delete v52Store[k];
      });
  };
}
