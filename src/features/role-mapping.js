/** 规范角色映射与测试阶段渲染（V55.5）。 */
import { App } from '../core/app.js';
import { getDevReview } from './dev-review.js';
import { renderVersionBanner } from './version-anchor.js';
import { renderTestingDefects } from '../pages/project/testing.js';
import { state } from '../store/state.js';

/** V55.5 角色映射与测试阶段渲染 */
export function initRoleMapping() {
  /* V55.5: canonical role mapping and canonical testing-stage renderer.
   * state.role is the only role source. v35Data().role is a render mirror only.
   * Testing uses the latest V54 report-list/editor workflow and V52 version lineage. */

  var baseRenderDevelopment = App.renderDevelopment;

  // Remove the entire redundant workbench header from both role views.
  App.renderDevHeader = function () {
    return '';
  };

  // Legacy header renderer intentionally disabled; role and owner data remain intact.

  // Synchronize the render mirror BEFORE the workbench reads it.
  // The old local role tabs are removed; all role changes come from #roleSelect.
  App.renderDevelopment = function () {
    var d = getDevReview();
    d.role = state.role;
    var html = baseRenderDevelopment();
    return html.replace(/<div class="v35-tabs">[\s\S]*?<\/div>/, '');
  };

  // V53 introduced the smoke-report entry. Keep it explicit and guarantee
  // the six required destinations even if an earlier section list is changed.
  var baseTestingSections = App.testingSections;
  App.testingSections = function () {
    var items = baseTestingSections().filter(function (item) {
      return item[0] !== 'smoke';
    });
    items.splice(1, 0, ['smoke', '冒烟测试报告']);
    return items;
  };

  // One final render entry: latest case/defect views and V54 report lists.
  // V49's outer stage-block read-only gate and V54's report/Commit rules remain intact.
  App.renderTesting = function () {
    App.testingInit();
    var section = state.testingSection || 'cases';
    if (
      !App.testingSections().some(function (item) {
        return item[0] === section;
      })
    )
      section = 'cases';
    state.testingSection = section;
    var content =
      section === 'cases'
        ? App.renderTestingCases()
        : section === 'defects'
          ? renderTestingDefects()
          : App.renderTestingReport(section);
    return (
      renderVersionBanner() +
      '<div class="testing-reference-page"><div class="testing-stage-layout">' +
      App.testingSubnav() +
      '<main class="testing-main">' +
      content +
      '</main></div></div>'
    );
  };

  var css = document.createElement('style');
  css.textContent =
    '.v55-global-role-head{margin-bottom:13px;padding:13px 15px;background:#fff;border:1px solid #e5eaf2;border-radius:6px}' +
    '.v55-global-role-head h2{font-size:15px;margin:0 0 5px}' +
    '.v55-global-role-head .v35-tools{align-items:center;gap:12px}' +
    '.v55-global-role-head label{display:flex;align-items:center;gap:7px;color:#667085;font-size:11px}' +
    '.v55-global-role-head select{min-width:105px}';
  document.head.appendChild(css);
  document.title = '一体化产品研发系统 · V55.5 原型';
  App.render();
}
