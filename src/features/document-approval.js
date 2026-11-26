/** 文档驱动的阶段审批与报告列表（V54）。 */
import { App } from '../core/app.js';
import { closeDrawer, openDrawer } from '../components/overlays.js';
import { showToast } from '../components/toast.js';
import { $, esc } from '../core/dom.js';
import { isTestKindEnabled, reportReadiness as reportReadinessRule } from '../domain/testing.js';
import { getHandoffCommit, getReleaseGate } from './version-anchor.js';
import { project, state } from '../store/state.js';

/** V54 文档驱动的阶段审批 */
export function initDocumentApproval() {
  /* V54.0: unify document-driven stage approval and report-list workflow.
   * No changes to V52 Commit lineage, R3 approval or I–IV branch mapping. */

  const selectedReports = new Map();
  const selectionKey = kind => state.projectId + '/' + kind;
  var REPORT_KINDS = ['smoke', 'single', 'long', 'system'];
  var REPORT_NAMES = {
    smoke: '冒烟测试报告',
    single: '单板测试报告',
    long: '长运测试报告',
    system: '整机测试报告',
  };
  function isReportKindEnabled(kind) {
    return isTestKindEnabled(project(), kind);
  }
  function reportStamp() {
    return new Date().toLocaleString('zh-CN', { hour12: false });
  }
  function escReportText(str) {
    return esc(String(str == null ? '' : str));
  }

  // Report list storage is project/type scoped; migrate meaningful V53.1 single-record
  // data without overwriting existing histories, rich content or frozen comments.
  var oldRecord = App.getTestReport;
  function reportBucket(kind) {
    if (!state.v54Reports) state.v54Reports = Object.create(null);
    var pid = state.projectId;
    if (!state.v54Reports[pid]) state.v54Reports[pid] = Object.create(null);
    var bucket = state.v54Reports[pid][kind];
    if (!bucket) {
      bucket = { rows: [] };
      state.v54Reports[pid][kind] = bucket;
      var old = state.v37Reports && state.v37Reports[pid] && state.v37Reports[pid][kind];
      if (old && (old.status !== '草稿' || old.conclusion || (old.history && old.history.length))) {
        var copy = Object.assign(
          { id: 'LEGACY-' + pid + '-' + kind, createdAt: old.at || reportStamp() },
          old,
        );
        if (!Array.isArray(copy.history)) copy.history = [];
        bucket.rows.push(copy);
        selectedReports.set(selectionKey(kind), copy.id);
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
        return r.id === selectedReports.get(selectionKey(kind));
      }) ||
      b.rows[0] ||
      oldRecord(kind)
    );
  };
  function reportRows(kind) {
    return reportBucket(kind).rows;
  }
  function reportReadiness(kind, commit) {
    var enabled = isReportKindEnabled(kind);
    return reportReadinessRule(enabled, enabled ? reportRows(kind) : [], commit);
  }
  /** 测试审核前检查：各类测试报告是否已提交并绑定当前提测 Commit。 */
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

  App.testReportRequirements = reportRequirements;

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
    selectedReports.set(selectionKey(kind), id);
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
      selectedReports.set(selectionKey(kind), row.id);
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
  var css = document.createElement('style');
  css.textContent =
    '.v54-report-tools{display:flex;gap:9px;align-items:center;flex-wrap:wrap;padding:13px 16px;border-bottom:1px solid #e6eaf0}' +
    '.v54-report-tools .search{max-width:290px;flex:1}.v54-report-tools select{max-width:135px}' +
    '.v54-report-drawer .v54-drawer-meta{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;padding:14px;background:#f8fafc;border:1px solid #e6eaf0;border-radius:8px;margin-bottom:15px}' +
    '.v54-report-drawer .v54-drawer-meta label{font-size:12px;font-weight:600;color:#475467;display:flex;flex-direction:column;gap:6px}' +
    '@media(max-width:700px){.v54-report-drawer .v54-drawer-meta{grid-template-columns:1fr}}';
  document.head.appendChild(css);
}
