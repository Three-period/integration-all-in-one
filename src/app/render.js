/** 根渲染：按 state.view 渲染当前页面、侧边栏与面包屑。 */
import { renderAssetGallery } from '../pages/assets.js';
import { App } from '../core/app.js';
import { bindPageEvents } from './events.js';
import { $ } from '../core/dom.js';
import { renderAdjustment } from '../pages/adjustment/adjustment.js';
import { renderPortfolio } from '../pages/portfolio.js';
import { renderProjectOverview } from '../pages/project/overview.js';
import { openCustomizer } from '../pages/workbench/customizer.js';
import {
  renderCalendar,
  renderContacts,
  renderFlows,
  renderMyDocs,
  renderTasks,
  renderWorkbench,
} from '../pages/workbench/workbench.js';
import { state } from '../store/state.js';

function render() {
  // 只读标记由全生命周期页按当前阶段重新设置。
  document.body.removeAttribute('data-stage-readonly');
  App.renderSidebar();
  $('#crumb').innerHTML = App.crumb().replace(' / ', ' / <strong>') + '</strong>';
  const view = state.view;
  const html = {
    dashboard: renderWorkbench,
    tasks: renderTasks,
    flows: renderFlows,
    calendar: renderCalendar,
    contacts: renderContacts,
    docs: renderMyDocs,
    portfolio: renderPortfolio,
    'project-basic': App.renderProjectBasic,
    'project-overview': renderProjectOverview,
    'project-lifecycle': App.renderLifecycle,
    'project-adjustment': renderAdjustment,
    'ops-projects': App.renderOps2,
    'ops-people': App.renderOps2,
    'ops-resources': App.renderOps2,
    'ops-review': App.renderOps2,
    'asset-gallery': renderAssetGallery,
  }[view]();
  $('#appView').innerHTML = html;
  bindPageEvents();
  if (state.customizerOpen) openCustomizer(false);
}
App.render = render;
