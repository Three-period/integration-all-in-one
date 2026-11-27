/** 设计导航、可选测试报告、冒烟报告与用例选择（V53）。 */
import { App } from '../core/app.js';
import { showToast } from '../components/toast.js';
import { isTestKindEnabled as isTestKindEnabledRule } from '../domain/testing.js';
import {
  isDesignLocked,
  isDesignTypeApplicable,
  isPriorDesignApproved,
} from '../pages/project/design.js';
import { testingCaseRows } from '../pages/project/testing.js';
import { project, state } from '../store/state.js';

/** V53 设计导航 / 可选测试报告 / 冒烟报告 */
export function initDesignTestingScope() {
  /* V53.0: scoped design navigation, optional test reports, smoke report, case selection.
   Preserve I/II/III/IV branch definitions, stage gate and Commit handoff. */

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
  document.addEventListener(
    'change',
    function (e) {
      var field = e.target.closest('[data-design-inline-field]');
      if (!field) return;
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
  var baseReportBody = App.renderTestReportBody;
  App.renderTestReportBody = function (section, tab) {
    var html = baseReportBody(section, tab);
    if (!isTestKindEnabled(section))
      html = html
        .replace(/<input\b/g, '<input disabled')
        .replace(/<textarea\b/g, '<textarea disabled');
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
  var style = document.createElement('style');
  style.textContent =
    '.req-category-nav .v53-doc-inactive{color:#a1a8b5!important;background:#f6f7f9!important}' +
    '.req-category-nav .v53-doc-inactive .req-category-count{color:#a1a8b5!important}' +
    '.testing-subnav [data-v53-inactive]{color:#a1a8b5!important;background:#f7f8fa!important}' +
    '.v53-readonly-hint{padding:11px 14px;border-bottom:1px solid #e6eaf0;font-size:12px;color:#667085;background:#f8fafc}' +
    '.v53-select-label{display:inline-flex;align-items:center;gap:5px;white-space:nowrap;cursor:pointer;font-weight:500}' +
    '.v53-select-label input{accent-color:#165dff}';
  document.head.appendChild(style);
}
