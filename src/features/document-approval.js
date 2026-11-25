/** 文档驱动的阶段审批与报告列表（V54）。 */
import { App } from '../core/app.js';
import { closeDrawer, openDrawer } from '../components/overlays.js';
import { showToast } from '../components/toast.js';
import { $, esc } from '../core/dom.js';
import { v35Stamp } from './dev-review.js';
import { v47DesignKeys, v47Flow, v47Note, v47Prereq } from './lifecycle-flow.js';
import {
  v52BaseTestingRender,
  v52CurrentCommit,
  v52Data,
  v52Status,
  v52VersionBanner,
} from './version-anchor.js';
import { project, state } from '../store/state.js';

/** V54 文档驱动的阶段审批 */
export function initDocumentApproval() {
  /* V54.0: unify document-driven stage approval and report-list workflow.
   * No changes to V52 Commit lineage, R3 approval or I–IV branch mapping. */

  var v54Kinds = ['smoke', 'single', 'long', 'system'];
  var v54Names = {
    smoke: '冒烟测试报告',
    single: '单板测试报告',
    long: '长运测试报告',
    system: '整机测试报告',
  };
  function v54Enabled(kind) {
    return kind === 'single'
      ? project().needsSingleTest !== '否'
      : kind === 'long'
        ? project().needsLongTest !== '否'
        : true;
  }
  function v54Now() {
    return new Date().toLocaleString('zh-CN', { hour12: false });
  }
  function v54Esc(str) {
    return esc(String(str == null ? '' : str));
  }
  function v54DesignTypes() {
    var names = {
      architecture: '软件架构设计',
      summarydesign: '概要设计',
      detaildesign: '详细设计',
    };
    return ['软件规格书'].concat(
      v47DesignKeys()
        .map(function (k) {
          return names[k];
        })
        .filter(Boolean),
    );
  }
  // A new draft supersedes an earlier approved version; preloaded legacy versions use
  // their version numbers to decide which is current.
  function v54CurrentDesign(type) {
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
  function v54MissingDesign() {
    return v54DesignTypes().filter(function (type) {
      var r = v54CurrentDesign(type);
      return !r || ['评审通过', '已结束'].indexOf(r.status) < 0;
    });
  }
  var oldDesignApprove = App.v47ApproveStage;
  App.v47ApproveStage = function (stage) {
    if (stage !== 'design') return oldDesignApprove(stage);
    if (!v47Prereq('design')) {
      showToast('请先完成需求阶段准出', 'warn');
      return;
    }
    var missing = v54MissingDesign();
    if (missing.length) {
      showToast('无法通过设计阶段审核：请先完成 ' + missing.join('、') + ' 的文档评审', 'warn');
      return;
    }
    var f = v47Flow(),
      p = project();
    f.steps.design = true;
    v47Note('设计阶段统一审核通过（Mock），依据当前项目各必做设计文档的最新审核状态');
    p.status = '进行中';
    p.flowStatus = '开发阶段';
    p.progress = Math.max(Number(p.progress) || 0, 40);
    state.projectSection = 'lifecycle';
    App.render();
    showToast('设计阶段审核通过，已解锁开发阶段');
  };

  // Report list storage is project/type scoped; migrate meaningful V53.1 single-record
  // data without overwriting existing histories, rich content or frozen comments.
  var oldRecord = App.v37Record;
  function v54Bucket(kind) {
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
          { id: 'LEGACY-' + pid + '-' + kind, createdAt: old.at || v54Now() },
          old,
        );
        if (!Array.isArray(copy.history)) copy.history = [];
        bucket.rows.push(copy);
        bucket.selectedId = copy.id;
      }
    }
    return bucket;
  }
  App.v37Record = function (kind) {
    if (v54Kinds.indexOf(kind) < 0) return oldRecord(kind);
    var b = v54Bucket(kind);
    if (state.v54Draft && state.v54Draft.kind === kind) return state.v54Draft.row;
    return (
      b.rows.find(function (r) {
        return r.id === b.selectedId;
      }) ||
      b.rows[0] ||
      oldRecord(kind)
    );
  };
  function v54Rows(kind) {
    return v54Bucket(kind).rows;
  }
  function v54ReadyReport(kind, commit) {
    if (!v54Enabled(kind)) return { ready: true, skipped: true };
    var rows = v54Rows(kind),
      matching = rows.find(function (r) {
        return (
          ['待评审', '审核通过', '已提交'].includes(r.status) &&
          r.commit === commit &&
          !!String(r.conclusion || '').trim()
        );
      });
    return { ready: !!matching, row: matching || null };
  }
  function v54ReportRequirements() {
    var z = v52Status(),
      result = { commit: z.commit, items: [], missing: [] };
    v54Kinds.forEach(function (kind) {
      var r = v54ReadyReport(kind, z.commit);
      result.items.push({
        kind: kind,
        name: v54Names[kind],
        status: r.skipped ? '不适用' : r.ready ? '已提交' : '未完成',
        row: r.row,
        ready: r.ready,
        skipped: r.skipped,
      });
      if (!r.ready) result.missing.push(v54Names[kind]);
    });
    return result;
  }

  // The testing section is now a read-only report index. The existing V491 rich
  // editor (H1/H2/H3, comments, freeze) lives in the right-hand drawer only.
  function v54RenderReportList(kind) {
    var b = v54Bucket(kind),
      enabled = v54Enabled(kind),
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
          v54Esc(r.id) +
          '">' +
          v54Esc(r.name || v54Names[kind]) +
          '</button></td>' +
          '<td>' +
          v54Esc(r.version || '—') +
          '</td><td>' +
          v54Esc(r.status || '草稿') +
          '</td>' +
          '<td>' +
          v54Esc(r.owner || '—') +
          '</td><td>' +
          v54Esc(r.updatedAt || r.createdAt || '—') +
          '</td>' +
          '<td><button class="op" data-v54-report="open" data-kind="' +
          kind +
          '" data-id="' +
          v54Esc(r.id) +
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
          v54Names[kind] +
          '，页面仅供查看。</div>'
        : '') +
      '<div class="testing-report-head"><div><h3>' +
      v54Names[kind] +
      '</h3><p>当前项目测试报告列表 · 报告提交后统一在流程视图审核</p></div>' +
      '<div class="testing-report-actions">' +
      (enabled && !v52Status().testPass
        ? '<button class="btn primary" data-v54-report="new" data-kind="' +
          kind +
          '">＋ 新建测试报告</button>'
        : '') +
      '</div></div>' +
      '<div class="v54-report-tools"><input class="input search" data-v54-report-query placeholder="搜索报告名称 / 负责人 / 版本" value="' +
      v54Esc(state.v54ReportQuery || '') +
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
  App.renderTestingReport = v54RenderReportList;
  // Remove V52.1's phase-approval card from the testing page. The flow view
  // becomes the only place for simulated test-phase approval.
  App.renderTesting = function () {
    return v52VersionBanner() + v52BaseTestingRender();
  };
  function v54ReportDrawer(kind, row, mode) {
    var enabled = v54Enabled(kind);
    state.testingSection = kind;
    state.v37ReportTab = 'detail';
    var readOnly = !enabled || mode === 'view' || v52Status().testPass;
    var detail =
      '<div class="v54-report-drawer"><div class="v54-drawer-meta">' +
      '<label>报告名称<input class="input" data-v54-field="name" value="' +
      v54Esc(row.name || v54Names[kind]) +
      '"' +
      (readOnly ? ' disabled' : '') +
      '></label>' +
      '<label>负责人<input class="input" data-v54-field="owner" value="' +
      v54Esc(row.owner || '赵敏') +
      '"' +
      (readOnly ? ' disabled' : '') +
      '></label>' +
      '<label>关联版本<input class="input" readonly value="' +
      v54Esc(row.version || project().version || 'V1.0') +
      '"></label>' +
      '<label>报告状态<input class="input" readonly value="' +
      v54Esc(row.status || '草稿') +
      '"></label></div>' +
      App.v37ReportBody(kind, 'detail') +
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
      (mode === 'new' ? '新建' : '') + v54Names[kind] + ' · ' + (readOnly ? '查看' : '编辑'),
      detail,
      foot,
    );
    $('#drawer').classList.add('req-drawer-large');
  }
  function v54OpenReport(kind, id) {
    var b = v54Bucket(kind),
      row = b.rows.find(function (r) {
        return r.id === id;
      });
    if (!row) return;
    state.v54Draft = null;
    b.selectedId = id;
    v54ReportDrawer(kind, row, v54Enabled(kind) && row.status === '草稿' ? 'edit' : 'view');
  }
  function v54NewReport(kind) {
    if (!v54Enabled(kind)) {
      showToast('当前项目未启用本项测试', 'warn');
      return;
    }
    if (!v52CurrentCommit()) {
      showToast('请先完成 R3 人工检视，正式移交 Commit 后才能编写测试报告', 'warn');
      return;
    }
    if (v52Status().testPass) {
      showToast('测试阶段已审核通过，无法直接新增报告', 'warn');
      return;
    }
    var id = 'RPT-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
    var x = v52Status();
    var row = {
      id: id,
      name: v54Names[kind],
      owner: '赵敏',
      status: '草稿',
      version: x.version || project().version || 'V1.0',
      commit: x.commit,
      conclusion: '',
      richHtml: '',
      richComments: [],
      history: [],
      createdAt: v54Now(),
      updatedAt: v54Now(),
    };
    state.v54Draft = { kind: kind, row: row };
    v54ReportDrawer(kind, row, 'new');
  }
  function v54SaveReport(submit) {
    var kind = state.testingSection,
      enabled = v54Enabled(kind);
    if (!enabled || v52Status().testPass) {
      showToast('当前报告不可编辑', 'warn');
      return;
    }
    var z = v52Status();
    if (!z.commit) {
      showToast('无正式移交 Commit，无法保存测试报告', 'warn');
      return;
    }
    var row = App.v37Record(kind);
    var root = document.querySelector('#drawer [data-v491-doc="' + kind + '"]');
    if (root) {
      // V491 comments/formatting use v37Record(kind), which now resolves the
      // exact selected report or the uncommitted draft.
      App.v37CollectReport();
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
    row.updatedAt = v54Now();
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
    var bucket = v54Bucket(kind);
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
      if (a === 'new') return v54NewReport(kind);
      if (a === 'open') return v54OpenReport(kind, b.dataset.id);
      if (a === 'save' || a === 'submit') return v54SaveReport(a === 'submit');
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
        panel.outerHTML = v54RenderReportList(state.testingSection);
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
  function v54FlowPanel() {
    var active =
      ['planning', 'requirements', 'design', 'development', 'testing', 'release'].find(
        function (k) {
          return !App.v47StageDone(k);
        },
      ) || 'complete';
    if (active === 'design' && !v47Prereq('design')) active = 'requirements';
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
      var missing = v54MissingDesign();
      buttons =
        '<label class="mini-note">设计类别</label><select id="v47DesignType" class="input" style="max-width:115px">' +
        ['I', 'II', 'III', 'IV']
          .map(function (v) {
            return (
              '<option value="' +
              v +
              '"' +
              (v47Flow().designType === v ? ' selected' : '') +
              '>' +
              v +
              ' 类</option>'
            );
          })
          .join('') +
        '</select>' +
        '<div class="v54-checks">' +
        v54DesignTypes()
          .map(function (t) {
            var r = v54CurrentDesign(t),
              good = r && ['评审通过', '已结束'].includes(r.status);
            return (
              '<span class="' +
              (good ? 'v54-ok' : 'v54-pending') +
              '">' +
              (good ? '✓ ' : '○ ') +
              v54Esc(t) +
              '</span>'
            );
          })
          .join('') +
        '</div>' +
        '<button class="v47-cta" data-v54-stage="design">模拟设计阶段审核通过</button>' +
        (missing.length
          ? '<small class="v54-flow-note">尚需完成：' + v54Esc(missing.join('、')) + '</small>'
          : '');
    }
    if (active === 'development')
      buttons =
        '<div class="mini-note">请在检视工程师工作台完成 R3 人工检视，自动解锁测试阶段。</div>';
    if (active === 'testing') {
      var review = v54ReportRequirements(),
        z = v52Status();
      buttons =
        '<div class="v54-checks">' +
        review.items
          .map(function (r) {
            return (
              '<span class="' +
              (r.ready ? 'v54-ok' : 'v54-pending') +
              '">' +
              (r.skipped ? '— ' : r.ready ? '✓ ' : '○ ') +
              v54Esc(r.name) +
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
              v54Esc(review.missing.join('、')) +
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
      v54Esc(project().name) +
      '</small><div class="v48-approval-buttons v54-flow-buttons">' +
      buttons +
      '</div></div></div>'
    );
  }
  var v54PlanningBase = App.renderPlanning;
  App.renderPlanning = function () {
    var html = v54PlanningBase(),
      start = html.indexOf('<div class="flow-view-approval-list v48-approval-list">');
    if (start < 0) return html;
    var end = html.indexOf('</aside>', start);
    if (end < 0) return html;
    return html.slice(0, start) + v54FlowPanel() + html.slice(end);
  };
  function v54ApproveTesting() {
    if (!v47Prereq('testing')) {
      showToast('请先完成 R3 人工检视准出与 Commit 移交', 'warn');
      return;
    }
    var check = v54ReportRequirements(),
      z = v52Status();
    if (!z.commit) {
      showToast('缺少正式移交 Commit，无法审核测试阶段', 'warn');
      return;
    }
    if (check.missing.length) {
      showToast('测试阶段审核受阻：请提交 ' + check.missing.join('、'), 'warn');
      return;
    }
    var x = v52Data();
    x.testReview = {
      status: '审核通过',
      commit: z.commit,
      reviewer: '测试主管（Mock）',
      at: v35Stamp(),
      reportIds: check.items
        .filter(function (i) {
          return i.row;
        })
        .map(function (i) {
          return i.row.id;
        }),
    };
    v47Flow().steps.testing = true;
    project().progress = Math.max(Number(project().progress) || 0, 82);
    project().flowStatus = '发布阶段';
    v47Note('测试阶段统一审核通过，关联正式移交 Commit ' + z.commit + '；适用报告均已提交');
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
      if (b.dataset.v54Stage === 'design') return App.v47ApproveStage('design');
      if (b.dataset.v54Stage === 'testing') return v54ApproveTesting();
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
  var v54Reset = App.v47Reset;
  App.v47Reset = function () {
    v54Reset();
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
