/** 报告抽屉在旧版 Tab 切换时保持只读（V54.1）。 */
import { App } from '../core/app.js';
import { state } from '../store/state.js';

/** V54.1 报告抽屉只读 */
export function initReadonlyReportDrawers() {
  /* V54.1: keep report drawers read-only across legacy V37 tab switches. */

  function v541Readonly(html) {
    return html
      .replace(/contenteditable="true"/g, 'contenteditable="false" aria-readonly="true"')
      .replace(/<button(?=[^>]*data-v491)/g, '<button disabled')
      .replace(/<textarea(?=[^>]*data-v491-comment)/g, '<textarea disabled')
      .replace(/<input(?=[^>]*data-v37-report-input)/g, '<input disabled');
  }
  document.addEventListener(
    'click',
    function (e) {
      var tab = e.target.closest('[data-v37-report-tab]');
      if (!tab || !tab.closest('#drawer')) return;
      var foot = document.querySelector('#drawerFoot');
      if (!foot || !foot.querySelector('[data-v54-report="close"]')) return;
      // Retain edits to the report's name/owner when moving between rich-text tabs.
      if (foot.querySelector('[data-v54-report="submit"]')) {
        var current = App.v37Record(state.testingSection);
        document.querySelectorAll('#drawer [data-v54-field]').forEach(function (input) {
          if (input.dataset.v54Field === 'name' || input.dataset.v54Field === 'owner')
            current[input.dataset.v54Field] = input.value.trim();
        });
        return; // normal editable V37 tabs
      }
      // A view-only report must not become editable when revisiting the detail tab.
      e.preventDefault();
      e.stopImmediatePropagation();
      state.v37ReportTab = tab.dataset.v37ReportTab || 'detail';
      var body = document.querySelector('#drawerBody');
      if (body)
        body.innerHTML = v541Readonly(App.v37ReportBody(state.testingSection, state.v37ReportTab));
    },
    true,
  );
}
