/** 文档驱动的阶段审批与报告列表（V54）。 */
import { getFlow, getVersionAnchor } from '../store/lifecycle.js';
import { App } from '../core/app.js';
import { closeDrawer, openDrawer } from '../components/overlays.js';
import { showToast } from '../components/toast.js';
import { $, esc } from '../core/dom.js';
import { nowStamp } from './dev-review.js';
import {
  designKeysForProject,
  logFlowNote,
  isStagePrereqMet,
  isStageDone,
} from './lifecycle-flow.js';
import {
  originalRenderTesting,
  getHandoffCommit,
  getReleaseGate,
  renderVersionBanner,
} from './version-anchor.js';
import { project, state } from '../store/state.js';

/** V54 文档驱动的阶段审批 */
export function initDocumentApproval() {
  /* V54.0: unify document-driven stage approval and report-list workflow.
   * No changes to V52 Commit lineage, R3 approval or I–IV branch mapping. */

  var REPORT_KINDS = ['smoke', 'single', 'long', 'system'];
  var REPORT_NAMES = {
    smoke: '冒烟测试报告',
    single: '单板测试报告',
    long: '长运测试报告',
    system: '整机测试报告',
  };
  function isReportKindEnabled(kind) {
    return kind === 'single'
      ? project().needsSingleTest !== '否'
      : kind === 'long'
        ? project().needsLongTest !== '否'
        : true;
  }
  function reportStamp() {
    return new Date().toLocaleString('zh-CN', { hour12: false });
  }
  function escReportText(str) {
    return esc(String(str == null ? '' : str));
  }
  function requiredDesignTypes() {
    var names = {
      architecture: '软件架构设计',
      summarydesign: '概要设计',
      detaildesign: '详细设计',
    };
    return ['软件规格书'].concat(
      designKeysForProject()
        .map(function (k) {
          return names[k];
        })
        .filter(Boolean),
    );
  }
  // A new draft supersedes an earlier approved version; preloaded legacy versions use
  // their version numbers to decide which is current.
  function currentDesignRecord(type) {
    App.designInit();
    var rows = state.designRecords.filter(function (x) {
      return x.docType === type;
    });
    function vnum(x) {
      var m = String(x.version || '').match(/(\d+)\.(\d+)(?:\.(\d+))?/);
      return m ? Number(m[1]) * 1000000 + Number(m[2]) * 1000 + Number(m[3] || 0) : 0;
    }
    rows.sort(function (a, b) {
      var an = /^DSN-NEW-/.test(a.id),
        bn = /^DSN-NEW-/.test(b.id);
      if (an !== bn) return an ? -1 : 1;
      if (an && bn) return Number(b.id.slice(8)) - Number(a.id.slice(8));
      return vnum(b) - vnum(a);
    });
    return rows[0] || null;
  }
  function missingDesignReviews() {
    return requiredDesignTypes().filter(function (type) {
      var r = currentDesignRecord(type);
      return !r || ['评审通过', '已结束'].indexOf(r.status) < 0;
    });
  }
  var oldDesignApprove = App.approveStage;
  App.approveStage = function (stage) {
    if (stage !== 'design') return oldDesignApprove(stage);
    if (!isStagePrereqMet('design')) {
      showToast('请先完成需求阶段准出', 'warn');
      return;
    }
    var missing = missingDesignReviews();
    if (missing.length) {
      showToast('无法通过设计阶段审核：请先完成 ' + missing.join('、') + ' 的文档评审', 'warn');
      return;
    }
    var f = getFlow(),
      p = project();
    f.steps.design = true;
    logFlowNote('设计阶段统一审核通过（Mock），依据当前项目各必做设计文档的最新审核状态');
    p.status = '进行中';
    p.flowStatus = '开发阶段';
    p.progress = Math.max(Number(p.progress) || 0, 40);
    state.projectSection = 'lifecycle';
    App.render();
    showToast('设计阶段审核通过，已解锁开发阶段');
  };

  // Report list storage is project/type scoped; migrate meaningful V53.1 single-record
  // data without overwriting existing histories, rich content or frozen comments.
  var oldRecord = App.getTestReport;
  function reportBucket(kind) {
    if (!state.v54Reports) state.v54Reports = Object.create(null);
    var pid = state.projectId;
    if (!state.v54Reports[pid]) state.v54Reports[pid] = Object.create(null);
    var bucket = state.v54Reports[pid][kind];
    if (!bucket) {
      bucket = { rows: [], selectedId: '' };
      state.v54Reports[pid][kind] = bucket;
      var old = state.v37Reports && state.v37Reports[pid] && state.v37Reports[pid][kind];
      if (old && (old.status !== '草稿' || old.conclusion || (old.history && old.history.length))) {
        var copy = Object.assign(
          { id: 'LEGACY-' + pid + '-' + kind, createdAt: old.at || reportStamp() },
          old,
        );
        if (!Array.isArray(copy.history)) copy.history = [];
        bucket.rows.push(copy);
        bucket.selectedId = copy.id;
      }
    }
    return bucket;
  }
  App.getTestReport = function (kind) {
    if (REPORT_KINDS.indexOf(kind) < 0) return oldRecord(kind);
    var b = reportBucket(kind);
    if (state.v54Draft && state.v54Draft.kind === kind) return state.v54Draft.row;
    return (
      b.rows.find(function (r) {
        return r.id === b.selectedId;
      }) ||
      b.rows[0] ||
      oldRecord(kind)
    );
  };
  function reportRows(kind) {
    return reportBucket(kind).rows;
  }
  function reportReadiness(kind, commit) {
    if (!isReportKindEnabled(kind)) return { ready: true, skipped: true };
    var rows = reportRows(kind),
      matching = rows.find(function (r) {
        return (
          ['待评审', '审核通过', '已提交'].includes(r.status) &&
          r.commit === commit &&
          !!String(r.conclusion || '').trim()
        );
      });
    return { ready: !!matching, row: matching || null };
  }
  function reportRequirements() {
    var z = getReleaseGate(),
      result = { commit: z.commit, items: [], missing: [] };
    REPORT_KINDS.forEach(function (kind) {
      var r = reportReadiness(kind, z.commit);
      result.items.push({
        kind: kind,
        name: REPORT_NAMES[kind],
        status: r.skipped ? '不适用' : r.ready ? '已提交' : '未完成',
        row: r.row,
        ready: r.ready,
        skipped: r.skipped,
      });
      if (!r.ready) result.missing.push(REPORT_NAMES[kind]);
    });
    return result;
  }

  // The testing section is now a read-only report index. The existing V491 rich
  // editor (H1/H2/H3, comments, freeze) lives in the right-hand drawer only.
  function renderReportList(kind) {
    var b = reportBucket(kind),
      enabled = isReportKindEnabled(kind),
      q = (state.v54ReportQuery || '').trim().toLowerCase(),
      filter = state.v54ReportFilter || '全部';
    var rows = b.rows.filter(function (r) {
      return (
        (!q ||
          (String(r.name || '') + ' ' + String(r.owner || '') + ' ' + String(r.version || ''))
            .toLowerCase()
            .includes(q)) &&
        (filter === '全部' || r.status === filter)
      );
    });
    var items = rows
      .map(function (r) {
        var view = !enabled || r.status !== '草稿';
        return (
          '<tr><td><button class="testing-link" data-v54-report="open" data-kind="' +
          kind +
          '" data-id="' +
          escReportText(r.id) +
          '">' +
          escReportText(r.name || REPORT_NAMES[kind]) +
          '</button></td>' +
          '<td>' +
          escReportText(r.version || '—') +
          '</td><td>' +
          escReportText(r.status || '草稿') +
          '</td>' +
          '<td>' +
          escReportText(r.owner || '—') +
          '</td><td>' +
          escReportText(r.updatedAt || r.createdAt || '—') +
          '</td>' +
          '<td><button class="op" data-v54-report="open" data-kind="' +
          kind +
          '" data-id="' +
          escReportText(r.id) +
          '">' +
          (view ? '查看' : '编辑') +
          '</button></td></tr>'
        );
      })
      .join('');
    return (
      '<div class="testing-report-panel v54-report-list">' +
      (!enabled
        ? '<div class="v53-readonly-hint">项目基本信息设置为不需要' +
          REPORT_NAMES[kind] +
          '，页面仅供查看。</div>'
        : '') +
      '<div class="testing-report-head"><div><h3>' +
      REPORT_NAMES[kind] +
      '</h3><p>当前项目测试报告列表 · 报告提交后统一在流程视图审核</p></div>' +
      '<div class="testing-report-actions">' +
      (enabled && !getReleaseGate().testPass
        ? '<button class="btn primary" data-v54-report="new" data-kind="' +
          kind +
          '">＋ 新建测试报告</button>'
        : '') +
      '</div></div>' +
      '<div class="v54-report-tools"><input class="input search" data-v54-report-query placeholder="搜索报告名称 / 负责人 / 版本" value="' +
      escReportText(state.v54ReportQuery || '') +
      '">' +
      '<select class="input" data-v54-report-filter><option value="全部">全部状态</option>' +
      ['草稿', '待评审', '审核通过', '已退回']
        .map(function (x) {
          return '<option' + (filter === x ? ' selected' : '') + '>' + x + '</option>';
        })
        .join('') +
      '</select>' +
      '<button class="btn" data-v54-report="clear">重置</button><span class="mini-note">共 ' +
      rows.length +
      ' 份报告</span></div>' +
      '<div class="testing-table-wrap"><table class="testing-table"><thead><tr><th>报告名称</th><th>关联版本</th><th>状态</th><th>负责人</th><th>最近更新</th><th>操作</th></tr></thead><tbody>' +
      (items ||
        '<tr><td colspan="6"><div class="testing-empty">暂无报告，请点击右上角新建。</div></td></tr>') +
      '</tbody></table></div>' +
      '</div>'
    );
  }
  App.renderTestingReport = renderReportList;
  // Remove V52.1's phase-approval card from the testing page. The flow view
  // becomes the only place for simulated test-phase approval.
  App.renderTesting = function () {
    return renderVersionBanner() + originalRenderTesting();
  };
  function renderReportDrawer(kind, row, mode) {
    var enabled = isReportKindEnabled(kind);
    state.testingSection = kind;
    state.v37ReportTab = 'detail';
    var readOnly = !enabled || mode === 'view' || getReleaseGate().testPass;
    var detail =
      '<div class="v54-report-drawer"><div class="v54-drawer-meta">' +
      '<label>报告名称<input class="input" data-v54-field="name" value="' +
      escReportText(row.name || REPORT_NAMES[kind]) +
      '"' +
      (readOnly ? ' disabled' : '') +
      '></label>' +
      '<label>负责人<input class="input" data-v54-field="owner" value="' +
      escReportText(row.owner || '赵敏') +
      '"' +
      (readOnly ? ' disabled' : '') +
      '></label>' +
      '<label>关联版本<input class="input" readonly value="' +
      escReportText(row.version || project().version || 'V1.0') +
      '"></label>' +
      '<label>报告状态<input class="input" readonly value="' +
      escReportText(row.status || '草稿') +
      '"></label></div>' +
      App.renderTestReportBody(kind, 'detail') +
      '</div>';
    if (readOnly) {
      detail = detail
        .replace(/contenteditable="true"/g, 'contenteditable="false"')
        .replace(/<button(?=[^>]*data-v491)/g, '<button disabled')
        .replace(/<textarea(?=[^>]*data-v491-comment)/g, '<textarea disabled');
    }
    var foot = '<button class="btn" data-v54-report="close">关闭</button>';
    if (!readOnly)
      foot +=
        '<button class="btn" data-v54-report="save">保存草稿</button>' +
        '<button class="btn primary" data-v54-report="submit">提交报告</button>';
    openDrawer(
      (mode === 'new' ? '新建' : '') + REPORT_NAMES[kind] + ' · ' + (readOnly ? '查看' : '编辑'),
      detail,
      foot,
    );
    $('#drawer').classList.add('req-drawer-large');
  }
  function openReport(kind, id) {
    var b = reportBucket(kind),
      row = b.rows.find(function (r) {
        return r.id === id;
      });
    if (!row) return;
    state.v54Draft = null;
    b.selectedId = id;
    renderReportDrawer(
      kind,
      row,
      isReportKindEnabled(kind) && row.status === '草稿' ? 'edit' : 'view',
    );
  }
  function newReport(kind) {
    if (!isReportKindEnabled(kind)) {
      showToast('当前项目未启用本项测试', 'warn');
      return;
    }
    if (!getHandoffCommit()) {
      showToast('请先完成 R3 人工检视，正式移交 Commit 后才能编写测试报告', 'warn');
      return;
    }
    if (getReleaseGate().testPass) {
      showToast('测试阶段已审核通过，无法直接新增报告', 'warn');
      return;
    }
    var id = 'RPT-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
    var x = getReleaseGate();
    var row = {
      id: id,
      name: REPORT_NAMES[kind],
      owner: '赵敏',
      status: '草稿',
      version: x.version || project().version || 'V1.0',
      commit: x.commit,
      conclusion: '',
      richHtml: '',
      richComments: [],
      history: [],
      createdAt: reportStamp(),
      updatedAt: reportStamp(),
    };
    state.v54Draft = { kind: kind, row: row };
    renderReportDrawer(kind, row, 'new');
  }
  function saveReport(submit) {
    var kind = state.testingSection,
      enabled = isReportKindEnabled(kind);
    if (!enabled || getReleaseGate().testPass) {
      showToast('当前报告不可编辑', 'warn');
      return;
    }
    var z = getReleaseGate();
    if (!z.commit) {
      showToast('无正式移交 Commit，无法保存测试报告', 'warn');
      return;
    }
    var row = App.getTestReport(kind);
    var root = document.querySelector('#drawer [data-v491-doc="' + kind + '"]');
    if (root) {
      // V491 comments/formatting use v37Record(kind), which now resolves the
      // exact selected report or the uncommitted draft.
      App.collectTestReport();
    }
    document.querySelectorAll('#drawer [data-v54-field]').forEach(function (input) {
      if (input.dataset.v54Field === 'name' || input.dataset.v54Field === 'owner')
        row[input.dataset.v54Field] = input.value.trim();
    });
    if (!row.name) {
      showToast('请填写报告名称', 'warn');
      return;
    }
    if (submit && !String(row.conclusion || '').trim()) {
      showToast('请先完成报告正文再提交', 'warn');
      return;
    }
    row.commit = z.commit;
    row.version = z.version || project().version || row.version;
    row.status = submit ? '待评审' : '草稿';
    row.updatedAt = reportStamp();
    row.history.push({
      name: row.name,
      owner: row.owner,
      version: row.version,
      commit: row.commit,
      status: row.status,
      conclusion: row.conclusion,
      richHtml: row.richHtml,
      at: row.updatedAt,
    });
    var bucket = reportBucket(kind);
    if (state.v54Draft && state.v54Draft.kind === kind) {
      bucket.rows.unshift(row);
      bucket.selectedId = row.id;
      state.v54Draft = null;
    }
    closeDrawer();
    App.render();
    showToast(submit ? '报告已提交；请在流程视图完成测试阶段统一模拟审核' : '测试报告草稿已保存');
  }
  document.addEventListener(
    'click',
    function (e) {
      var b = e.target.closest('[data-v54-report]');
      if (!b) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      var a = b.dataset.v54Report,
        kind = b.dataset.kind || state.testingSection;
      if (a === 'new') return newReport(kind);
      if (a === 'open') return openReport(kind, b.dataset.id);
      if (a === 'save' || a === 'submit') return saveReport(a === 'submit');
      if (a === 'close') {
        state.v54Draft = null;
        closeDrawer();
        return;
      }
      if (a === 'clear') {
        state.v54ReportQuery = '';
        state.v54ReportFilter = '全部';
        App.render();
        return;
      }
    },
    true,
  );
  document.addEventListener(
    'input',
    function (e) {
      if (!e.target.matches('[data-v54-report-query]')) return;
      state.v54ReportQuery = e.target.value;
      // Keep input focus while filtering the list.
      var panel = e.target.closest('.v54-report-list');
      if (panel) {
        var oldSelection = e.target.selectionStart;
        panel.outerHTML = renderReportList(state.testingSection);
        var next = document.querySelector('[data-v54-report-query]');
        if (next) {
          next.focus();
          try {
            next.setSelectionRange(oldSelection, oldSelection);
          } catch {
            // Some input types do not support selection ranges; keep focus only.
          }
        }
      }
    },
    true,
  );
  document.addEventListener(
    'change',
    function (e) {
      if (!e.target.matches('[data-v54-report-filter]')) return;
      state.v54ReportFilter = e.target.value;
      App.render();
    },
    true,
  );

  // Centralized approval card in flow view; replaces the older V48 mock action,
  // not the original flow diagram or its navigation.
  function renderFlowApprovalPanel() {
    var active =
      ['planning', 'requirements', 'design', 'development', 'testing', 'release'].find(
        function (k) {
          return !isStageDone(k);
        },
      ) || 'complete';
    if (active === 'design' && !isStagePrereqMet('design')) active = 'requirements';
    var title = {
      planning: '立项审核',
      requirements: '需求规格书审核',
      design: '设计阶段审核',
      development: '人工检视准出 / 自动移交',
      testing: '测试阶段统一审核',
      release: '发布评审 / 归档',
      complete: '流程已完成',
    }[active];
    var buttons = '';
    if (active === 'planning')
      buttons =
        '<button class="v47-cta" data-v47="approve-stage" data-stage="planning">模拟立项审核通过</button>';
    if (active === 'requirements')
      buttons =
        '<button class="v47-btn" data-v47="doc-open" data-doc="requirement">编写需求规格书</button>' +
        '<button class="v47-cta" data-v47="approve-stage" data-stage="requirements">模拟需求审核通过</button>';
    if (active === 'design') {
      var missing = missingDesignReviews();
      buttons =
        '<label class="mini-note">设计类别</label><select id="v47DesignType" class="input" style="max-width:115px">' +
        ['I', 'II', 'III', 'IV']
          .map(function (v) {
            return (
              '<option value="' +
              v +
              '"' +
              (getFlow().designType === v ? ' selected' : '') +
              '>' +
              v +
              ' 类</option>'
            );
          })
          .join('') +
        '</select>' +
        '<div class="v54-checks">' +
        requiredDesignTypes()
          .map(function (t) {
            var r = currentDesignRecord(t),
              good = r && ['评审通过', '已结束'].includes(r.status);
            return (
              '<span class="' +
              (good ? 'v54-ok' : 'v54-pending') +
              '">' +
              (good ? '✓ ' : '○ ') +
              escReportText(t) +
              '</span>'
            );
          })
          .join('') +
        '</div>' +
        '<button class="v47-cta" data-v54-stage="design">模拟设计阶段审核通过</button>' +
        (missing.length
          ? '<small class="v54-flow-note">尚需完成：' +
            escReportText(missing.join('、')) +
            '</small>'
          : '');
    }
    if (active === 'development')
      buttons =
        '<div class="mini-note">请在检视工程师工作台完成 R3 人工检视，自动解锁测试阶段。</div>';
    if (active === 'testing') {
      var review = reportRequirements(),
        z = getReleaseGate();
      buttons =
        '<div class="v54-checks">' +
        review.items
          .map(function (r) {
            return (
              '<span class="' +
              (r.ready ? 'v54-ok' : 'v54-pending') +
              '">' +
              (r.skipped ? '— ' : r.ready ? '✓ ' : '○ ') +
              escReportText(r.name) +
              ' · ' +
              r.status +
              '</span>'
            );
          })
          .join('') +
        '</div>' +
        '<button class="v47-cta" data-v54-stage="testing">模拟测试阶段审核通过</button>' +
        (!z.commit
          ? '<small class="v54-flow-note">请先完成 R3 检视并正式移交 Commit。</small>'
          : review.missing.length
            ? '<small class="v54-flow-note">未完成：' +
              escReportText(review.missing.join('、')) +
              '</small>'
            : '');
    }
    if (active === 'release')
      buttons =
        '<button class="v47-cta" data-v47="demo-release">模拟发布评审、归档并正式发布</button>';
    if (active === 'complete') buttons = '<span class="tag green">流程审核已完成</span>';
    return (
      '<div class="flow-view-approval-list v48-approval-list"><div class="v48-approval-actions"><b>当前审核 · ' +
      title +
      '</b>' +
      '<small>当前项目：' +
      escReportText(project().name) +
      '</small><div class="v48-approval-buttons v54-flow-buttons">' +
      buttons +
      '</div></div></div>'
    );
  }
  var baseRenderPlanning = App.renderPlanning;
  App.renderPlanning = function () {
    var html = baseRenderPlanning(),
      start = html.indexOf('<div class="flow-view-approval-list v48-approval-list">');
    if (start < 0) return html;
    var end = html.indexOf('</aside>', start);
    if (end < 0) return html;
    return html.slice(0, start) + renderFlowApprovalPanel() + html.slice(end);
  };
  function approveTestingStage() {
    if (!isStagePrereqMet('testing')) {
      showToast('请先完成 R3 人工检视准出与 Commit 移交', 'warn');
      return;
    }
    var check = reportRequirements(),
      z = getReleaseGate();
    if (!z.commit) {
      showToast('缺少正式移交 Commit，无法审核测试阶段', 'warn');
      return;
    }
    if (check.missing.length) {
      showToast('测试阶段审核受阻：请提交 ' + check.missing.join('、'), 'warn');
      return;
    }
    var x = getVersionAnchor();
    x.testReview = {
      status: '审核通过',
      commit: z.commit,
      reviewer: '测试主管（Mock）',
      at: nowStamp(),
      reportIds: check.items
        .filter(function (i) {
          return i.row;
        })
        .map(function (i) {
          return i.row.id;
        }),
    };
    getFlow().steps.testing = true;
    project().progress = Math.max(Number(project().progress) || 0, 82);
    project().flowStatus = '发布阶段';
    logFlowNote('测试阶段统一审核通过，关联正式移交 Commit ' + z.commit + '；适用报告均已提交');
    state.lifecycleStage = 'release';
    state.projectSection = 'lifecycle';
    state.view = 'project-lifecycle';
    App.render();
    showToast('测试阶段审核通过，发布阶段已解锁');
  }
  document.addEventListener(
    'click',
    function (e) {
      var b = e.target.closest('[data-v54-stage]');
      if (!b) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      if (b.dataset.v54Stage === 'design') return App.approveStage('design');
      if (b.dataset.v54Stage === 'testing') return approveTestingStage();
    },
    true,
  );

  // Never offer the historical per-report 'simulate approve/reject' buttons in
  // the report drawer or list. They are not stage approval entrypoints.
  document.addEventListener(
    'click',
    function (e) {
      var b = e.target.closest('[data-v38-report]');
      if (!b) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      showToast('请前往流程视图统一模拟审核测试阶段', 'warn');
    },
    true,
  );
  var baseResetDemoData = App.resetDemoData;
  App.resetDemoData = function () {
    baseResetDemoData();
    state.v54Reports = null;
    state.v54Draft = null;
    state.v54ReportQuery = '';
    state.v54ReportFilter = '全部';
  };
  var css = document.createElement('style');
  css.textContent =
    '.v54-report-tools{display:flex;gap:9px;align-items:center;flex-wrap:wrap;padding:13px 16px;border-bottom:1px solid #e6eaf0}' +
    '.v54-report-tools .search{max-width:290px;flex:1}.v54-report-tools select{max-width:135px}' +
    '.v54-report-drawer .v54-drawer-meta{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;padding:14px;background:#f8fafc;border:1px solid #e6eaf0;border-radius:8px;margin-bottom:15px}' +
    '.v54-report-drawer .v54-drawer-meta label{font-size:12px;font-weight:600;color:#475467;display:flex;flex-direction:column;gap:6px}' +
    '.v54-flow-buttons{flex-wrap:wrap;align-items:center}.v54-checks{display:flex;flex-wrap:wrap;gap:6px;max-width:450px}' +
    '.v54-checks span{border:1px solid #e6eaf0;background:#f8fafc;border-radius:5px;padding:5px 8px;font-size:11px;white-space:nowrap}' +
    '.v54-checks .v54-ok{color:#027a48;background:#ecfdf3;border-color:#b7e7c8}' +
    '.v54-checks .v54-pending{color:#b54708;background:#fffaeb;border-color:#fcdca7}' +
    '.v54-flow-note{display:block;width:100%;font-size:11px;color:#b54708}' +
    '@media(max-width:700px){.v54-report-drawer .v54-drawer-meta{grid-template-columns:1fr}}';
  document.head.appendChild(css);
  App.render();
}
