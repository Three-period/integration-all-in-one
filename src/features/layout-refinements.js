/** 布局整理、阶段目录与流程图导航（V49）。 */
import { App } from '../core/app.js';

/** V49 布局整理与阶段目录 */
export function initLayoutRefinements() {
  /* V49: surgical layout cleanup, visible stage directory/read-only gate, process diagram navigation */

  var oldOverview = App.overviewDashboard;
  App.overviewDashboard = function () {
    var html = oldOverview();
    var start = html.indexOf(
      '<div class="card" style="margin-top:14px"><div class="card-head"><span class="card-title">研发链路追踪</span>',
    );
    if (start >= 0) {
      var end = html.indexOf('</div></div>', start);
      if (end >= 0) html = html.slice(0, start) + html.slice(end + 11);
    }
    return html;
  };
  // Do not allow business actions in an unopened stage. Stage tabs and diagram links are outside stage-block.
}
