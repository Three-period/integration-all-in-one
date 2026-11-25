/** 设计导航、可选测试报告、冒烟报告与用例选择（V53）。 */
import { App } from '../core/app.js';
import { closeDrawer } from '../components/overlays.js';
import { showToast } from '../components/toast.js';
import { esc } from '../core/dom.js';
import { projectDesignDocTypes } from './lifecycle-flow.js';
import { isPriorDesignApproved as isPriorDesignApprovedRule } from '../domain/design.js';
import { isTestKindEnabled as isTestKindEnabledRule } from '../domain/testing.js';
import { collectDesign, isDesignLocked } from '../pages/project/design.js';
import { testingCaseRows } from '../pages/project/testing.js';
import { project, state } from '../store/state.js';

/** V53 设计导航 / 可选测试报告 / 冒烟报告 */
export function initDesignTestingScope() {
  /* V53.0: scoped design navigation, optional test reports, smoke report, case selection.
   Preserve I/II/III/IV branch definitions, stage gate and Commit handoff. */

  function isDesignTypeApplicable(type) {
    return projectDesignDocTypes().indexOf(type) !== -1;
  }
  function isPriorDesignApproved(type) {
    return isPriorDesignApprovedRule(type, projectDesignDocTypes(), function () {
      App.designInit();
      return state.designRecords;
    });
  }
  var initDesign = App.designInit;
  App.designInit = function () {
    var pid = state.projectId;
    if (!state.v53DesignByProject) state.v53DesignByProject = Object.create(null);
    if (state.v53DesignLoadedProject !== pid) {
      if (state.v53DesignLoadedProject && state.designRecords)
        state.v53DesignByProject[state.v53DesignLoadedProject] = state.designRecords;
      if (!state.v53DesignByProject[pid]) {
        if (pid === 'thermal' && !state.v53DesignLoadedProject) {
          initDesign();
          state.v53DesignByProject[pid] = state.designRecords;
        } else state.v53DesignByProject[pid] = [];
      }
      state.designRecords = state.v53DesignByProject[pid];
      state.v53DesignLoadedProject = pid;
      state.designCategory = '全部';
      state.designSelected = null;
      state.designQuery = '';
      state.designStatusFilter = '全部';
    }
    initDesign();
  };
  var baseRows = App.designRows;
  App.designRows = function () {
    var records = baseRows();
    return state.designCategory === '全部'
      ? records.filter(function (r) {
          return isDesignTypeApplicable(r.docType);
        })
      : records;
  };
  var baseCurrent = App.designCurrentRecord;
  App.designCurrentRecord = function () {
    var record = baseCurrent();
    if (state.designDrawerMode === 'create' && state.designCategory !== '全部') {
      record.docType = state.designCategory;
      if (!record.title || record.title === '新建设计文档') record.title = state.designCategory;
      record.projectId = state.projectId;
    }
    return record;
  };
  var baseDetail = App.designDetailPanel;
  App.designDetailPanel = function (record) {
    var html = baseDetail(record);
    if (state.designDrawerMode === 'create' || isDesignLocked(record))
      html = html.replace(/<select(?=[^>]*data-design-input="docType")/g, '<select disabled');
    if (
      state.designCategory === '全部' ||
      !isDesignTypeApplicable(record.docType) ||
      !isPriorDesignApproved(record.docType)
    )
      html = html
        .replace(/<input\b/g, '<input disabled')
        .replace(/<textarea\b/g, '<textarea disabled')
        .replace(/<select\b/g, '<select disabled');
    return html;
  };
  var baseFoot = App.designDrawerFoot;
  App.designDrawerFoot = function () {
    var r = App.designCurrentRecord();
    if (
      state.designCategory === '全部' ||
      !isDesignTypeApplicable(r.docType) ||
      !isPriorDesignApproved(r.docType)
    )
      return '<button class="btn" data-design-drawer-action="close">关闭</button>';
    return baseFoot();
  };
  // Existing creation drawer invokes save('save') or save('submit'), never save('create').
  // Explicitly insert the new record in either path.
  var baseSave = App.saveDesign;
  App.saveDesign = function (mode) {
    if (state.designDrawerMode !== 'create') return baseSave(mode);
    if (
      state.designCategory === '全部' ||
      !isDesignTypeApplicable(state.designCategory) ||
      !isPriorDesignApproved(state.designCategory)
    ) {
      showToast('当前分类不能新建：请完成前置设计文档审核', 'warn');
      return;
    }
    collectDesign();
    var r = App.designCurrentRecord();
    r.id = 'DSN-NEW-' + Date.now();
    r.projectId = state.projectId;
    r.docType = state.designCategory;
    r.status = mode === 'submit' ? '待评审' : '待开始';
    if (!r.title || r.title === '新建设计文档') r.title = r.docType;
    state.designRecords.unshift(Object.assign({}, r, { comments: (r.comments || []).slice() }));
    state.designSelected = r.id;
    state.designDraft = null;
    state.designDrawerMode = 'edit';
    closeDrawer();
    App.render();
    showToast(
      mode === 'submit' ? '已新建' + r.docType + '并提交评审' : '已新建' + r.docType + '草稿',
    );
  };
  var baseDesignRender = App.renderDesign;
  App.renderDesign = function () {
    App.designInit();
    var html = baseDesignRender(),
      current = state.designCategory,
      allowed = projectDesignDocTypes();
    html = html.replace(
      /(<button class=")([^"]*)(" data-design-page-action="category" data-design-category=")([^"]+)(")/g,
      function (_, a, classes, b, kind, c) {
        return (
          a +
          classes +
          (kind !== '全部' && allowed.indexOf(kind) < 0 ? ' v53-doc-inactive' : '') +
          b +
          kind +
          c
        );
      },
    );
    if (current === '全部' || !isDesignTypeApplicable(current)) {
      html = html.replace(
        '<button class="btn primary" data-design-page-action="create">＋ 新建设计文档</button>',
        '',
      );
    } else if (!isPriorDesignApproved(current)) {
      html = html.replace(
        'data-design-page-action="create"',
        'data-design-page-action="create" disabled title="前置文档未审核通过"',
      );
    }
    var note = '';
    if (current === '全部') note = '全部设计文档只读汇总；请进入具体文档分类新建。';
    else if (!isDesignTypeApplicable(current)) note = '当前项目类别不适用此设计文档，页面只读。';
    else if (!isPriorDesignApproved(current))
      note = '请先完成前置设计文档审核，通过后可编辑当前文档。';
    if (note)
      html = html.replace(
        '<section class="req-list-panel">',
        '<section class="req-list-panel"><div class="v53-readonly-hint">' + note + '</div>',
      );
    return html;
  };
  document.addEventListener(
    'change',
    function (e) {
      if (!e.target.closest('[data-design-inline-field]')) return;
      if (
        state.designCategory === '全部' ||
        !isDesignTypeApplicable(state.designCategory) ||
        !isPriorDesignApproved(state.designCategory)
      ) {
        e.preventDefault();
        e.stopImmediatePropagation();
        App.render();
        showToast('当前分类仅供查看', 'warn');
      }
    },
    true,
  );
  document.addEventListener(
    'click',
    function (e) {
      var create = e.target.closest('[data-design-page-action="create"]');
      if (
        create &&
        (state.designCategory === '全部' ||
          !isDesignTypeApplicable(state.designCategory) ||
          !isPriorDesignApproved(state.designCategory))
      ) {
        e.preventDefault();
        e.stopImmediatePropagation();
        showToast('当前分类无法新建', 'warn');
        return;
      }
      var btn = e.target.closest('[data-design-drawer-action]');
      if (
        btn &&
        ['save', 'submit', 'comment', 'request-change'].indexOf(btn.dataset.designDrawerAction) >= 0
      ) {
        var r = App.designCurrentRecord();
        if (
          state.designCategory === '全部' ||
          !isDesignTypeApplicable(r.docType) ||
          !isPriorDesignApproved(r.docType)
        ) {
          e.preventDefault();
          e.stopImmediatePropagation();
          showToast('当前文档只读', 'warn');
        }
      }
    },
    true,
  );

  function isTestKindEnabled(kind) {
    return isTestKindEnabledRule(project(), kind);
  }
  var baseForm = App.renderProjectFormFields;
  App.renderProjectFormFields = function (p, mode) {
    var html = baseForm(p, mode);
    function option(key, label, value) {
      return (
        '<div class="v47-field"><label>' +
        label +
        '</label><select data-v47-field="' +
        key +
        '">' +
        '<option value="是"' +
        (value !== '否' ? ' selected' : '') +
        '>是</option>' +
        '<option value="否"' +
        (value === '否' ? ' selected' : '') +
        '>否</option></select></div>'
      );
    }
    return html.replace(
      /<\/div>$/,
      option('needsSingleTest', '是否需要单板测试', p.needsSingleTest) +
        option('needsLongTest', '是否需要长运测试', p.needsLongTest) +
        '</div>',
    );
  };
  var baseSections = App.testingSections;
  App.testingSections = function () {
    var a = baseSections();
    return [a[0], ['smoke', '冒烟测试报告']].concat(a.slice(1));
  };
  var baseInfo = App.testingReportInfo;
  App.testingReportInfo = function (section) {
    return section === 'smoke'
      ? ['冒烟测试报告', '记录测试阶段冒烟测试结果与风险说明']
      : baseInfo(section);
  };
  var baseSubnav = App.testingSubnav;
  App.testingSubnav = function () {
    var html = baseSubnav();
    ['single', 'long'].forEach(function (k) {
      if (!isTestKindEnabled(k))
        html = html.replace(
          'data-testing-section="' + k + '"',
          'data-testing-section="' + k + '" data-v53-inactive="1" title="当前项目未启用此项测试"',
        );
    });
    return html;
  };
  var baseReportBody = App.renderTestReportBody;
  App.renderTestReportBody = function (section, tab) {
    var html = baseReportBody(section, tab);
    if (!isTestKindEnabled(section))
      html = html
        .replace(/<input\b/g, '<input disabled')
        .replace(/<textarea\b/g, '<textarea disabled');
    return html;
  };
  var baseReport = App.renderTestingReport;
  App.renderTestingReport = function (section) {
    var html = baseReport(section);
    if (!isTestKindEnabled(section)) {
      html =
        '<div class="v53-report-readonly"><div class="v53-readonly-hint">当前项目不需要' +
        (section === 'single' ? '单板' : '长运') +
        '测试，报告仅供查看。</div>' +
        html.replace(/<button(?=[^>]*data-v37-report-action)/g, '<button disabled') +
        '</div>';
    }
    return html;
  };
  var baseTestPanel = App.renderTestingReviewPanel;
  App.renderTestingReviewPanel = function () {
    var html = baseTestPanel(),
      r = App.getTestReport('smoke');
    var extra =
      '<div class="kv"><label>冒烟测试报告</label><div>' +
      esc(r.status || '草稿') +
      '</div><small class="mini-note">' +
      esc(r.commit || '尚未关联版本') +
      '</small></div>';
    html = html.replace('<div class="kv-grid">', '<div class="kv-grid">' + extra);
    ['single', 'long'].forEach(function (k) {
      if (!isTestKindEnabled(k)) {
        var name = k === 'single' ? '单板测试报告' : '长运测试报告';
        html = html.replace('<label>' + name + '</label>', '<label>' + name + '（不适用）</label>');
      }
    });
    return html;
  };
  document.addEventListener(
    'click',
    function (e) {
      var btn = e.target.closest(
        '[data-v37-report-action],[data-v38-report],[data-testing-page-action="new-report"]',
      );
      if (!btn) return;
      var kind = btn.dataset.section || btn.dataset.testingReport || state.testingSection;
      if (!isTestKindEnabled(kind)) {
        e.preventDefault();
        e.stopImmediatePropagation();
        showToast('本项目未启用此项测试，报告只读', 'warn');
      }
    },
    true,
  );

  function selectedCaseIds() {
    if (!state.v53CaseSelection) state.v53CaseSelection = Object.create(null);
    return (
      state.v53CaseSelection[state.projectId] ||
      (state.v53CaseSelection[state.projectId] = new Set())
    );
  }
  var baseCases = App.renderTestingCases;
  App.renderTestingCases = function () {
    var selected = selectedCaseIds(),
      rows = testingCaseRows(),
      html = baseCases();
    html = html.replace(/<input type="checkbox" data-testing-select="([^"]+)">/g, function (_, id) {
      return (
        '<input type="checkbox" data-testing-select="' +
        id +
        '"' +
        (selected.has(id) ? ' checked' : '') +
        '>'
      );
    });
    var all =
      rows.length > 0 &&
      rows.every(function (r) {
        return selected.has(r.id);
      });
    html = html.replace(
      '<th>用例库</th>',
      '<th><label class="v53-select-label"><input type="checkbox" data-v53-select-all' +
        (all ? ' checked' : '') +
        (rows.length ? '' : ' disabled') +
        '> 全选</label></th>',
    );
    html = html.replace(
      '<span class="push mini-note">共 ' + rows.length + ' 条用例</span>',
      '<span class="push mini-note">共 ' +
        rows.length +
        ' 条用例 · 已选 ' +
        selected.size +
        ' 条</span>' +
        (selected.size ? '<button class="btn" data-v53-clear-cases>清空选择</button>' : ''),
    );
    return html;
  };
  document.addEventListener(
    'change',
    function (e) {
      var input = e.target.closest('[data-testing-select]');
      if (input) {
        let set = selectedCaseIds(),
          id = input.dataset.testingSelect;
        if (input.checked) set.add(id);
        else set.delete(id);
        App.render();
        return;
      }
      if (e.target.matches('[data-v53-select-all]')) {
        let set = selectedCaseIds(),
          checked = e.target.checked;
        testingCaseRows().forEach(function (r) {
          if (checked) set.add(r.id);
          else set.delete(r.id);
        });
        App.render();
      }
    },
    true,
  );
  document.addEventListener(
    'click',
    function (e) {
      if (e.target.closest('[data-v53-clear-cases]')) {
        e.preventDefault();
        e.stopImmediatePropagation();
        selectedCaseIds().clear();
        App.render();
      }
    },
    true,
  );
  var baseReset = App.resetDemoData;
  App.resetDemoData = function () {
    baseReset();
    if (state.designRecords === null) {
      state.v53DesignByProject = null;
      state.v53DesignLoadedProject = null;
      state.v53CaseSelection = null;
    }
  };
  var style = document.createElement('style');
  style.textContent =
    '.req-category-nav .v53-doc-inactive{color:#a1a8b5!important;background:#f6f7f9!important}' +
    '.req-category-nav .v53-doc-inactive .req-category-count{color:#a1a8b5!important}' +
    '.testing-subnav [data-v53-inactive]{color:#a1a8b5!important;background:#f7f8fa!important}' +
    '.v53-readonly-hint{padding:11px 14px;border-bottom:1px solid #e6eaf0;font-size:12px;color:#667085;background:#f8fafc}' +
    '.v53-select-label{display:inline-flex;align-items:center;gap:5px;white-space:nowrap;cursor:pointer;font-weight:500}' +
    '.v53-select-label input{accent-color:#165dff}';
  document.head.appendChild(style);
  App.render();
}
