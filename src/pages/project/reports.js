/** 测试报告与发布版本记录（V37）。 */
import { App } from '../../core/app.js';

import { state } from '../../store/state.js';

function getTestReports() {
  App.testingInit();
  if (!state.v37Reports) state.v37Reports = {};
  var pid = state.projectId;
  if (!state.v37Reports[pid]) state.v37Reports[pid] = {};
  return state.v37Reports[pid];
}

function getTestReport(section) {
  var data = getTestReports();
  if (!data[section])
    data[section] = {
      name: App.testingReportInfo(section)[0],
      version: 'V2.6',
      owner: '赵敏',
      conclusion: '',
      status: '草稿',
      history: [],
    };
  return data[section];
}
App.getTestReport = getTestReport;

/** V37 测试报告 / 紧急下发评审 / 发布版本 */
export function initReportVersioning() {
  document.addEventListener('click', function (e) {
    var tab = e.target.closest('[data-v37-report-tab]');
    if (tab) {
      e.preventDefault();
      e.stopPropagation();
      if (state.v37ReportTab === 'detail') App.collectTestReport();
      state.v37ReportTab = tab.dataset.v37ReportTab;
      var inDrawer = !!tab.closest('#drawer');
      if (inDrawer)
        document.querySelector('#drawerBody').innerHTML = App.renderTestReportBody(
          state.testingSection,
        );
      else App.render();
      return;
    }
  });
}
