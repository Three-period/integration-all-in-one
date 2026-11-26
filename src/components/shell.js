/** 应用外壳：侧边栏导航、面包屑、页头与工作台子导航。 */
import { can } from '../domain/permissions.js';
import { App } from '../core/app.js';
import { $ } from '../core/dom.js';
import { project, state } from '../store/state.js';

export function navItem(label, icon, view, active, badge = '') {
  return `<button class="nav-item ${active ? 'active' : ''}" data-nav="${view}"><span class="nav-icon">${icon}</span><span>${label}</span>${badge ? `<span class="nav-badge">${badge}</span>` : ''}</button>`;
}

function crumb() {
  const map = {
    dashboard: '个人工作台 / 仪表盘',
    tasks: '个人工作台 / 我的任务',
    flows: '个人工作台 / 我的流程',
    calendar: '个人工作台 / 我的日历',
    contacts: '个人工作台 / 我的联系人',
    docs: '个人工作台 / 我的文档',
    portfolio: '项目集 / 全部项目',
    'project-basic': `项目管理 / ${project().name} / 基本信息`,
    'project-overview': `项目管理 / ${project().name} / 项目概况`,
    'project-lifecycle': `项目管理 / ${project().name} / 全生命周期`,
    'project-adjustment': `项目管理 / ${project().name} / 项目调整`,
    'ops-projects': '运营看板 / 项目运营',
    'ops-people': '运营看板 / 人员运营',
    'ops-resources': '运营看板 / 资源分配',
    'ops-review': '运营看板 / AI 检视',
    'asset-gallery': '业务资产管理 / 资产画廊',
  };
  return map[state.view] || '一体化产品研发系统';
}
App.crumb = crumb;

/* V1.3：统一导航层级。工作台子模块进入内容区顶部；其余一级模块的二级菜单固定在左侧。 */
const workbenchViews = ['dashboard', 'tasks', 'flows', 'calendar', 'contacts', 'docs'];

function workbenchTabs() {
  const tabs = [
    ['dashboard', '仪表盘'],
    ['tasks', '我的任务'],
    ['flows', '我的流程'],
    ['calendar', '我的日历'],
    ['contacts', '我的联系人'],
    ['docs', '我的文档'],
  ];
  return `<div class="workbench-tabs" data-navigation-tabs="true" aria-label="工作台页面">${tabs.map(([k, n]) => `<button class="${state.view === k ? 'active' : ''}" data-action="workbench-tab" data-tab="${k}">${n}</button>`).join('')}</div>`;
}

export function normalizeNavigationSurface() {
  const app = $('#appView');
  if (!app) return;
  if (workbenchViews.includes(state.view)) {
    const tabs = app.querySelectorAll('.workbench-tabs');
    if (tabs.length) {
      if (!tabs[0].dataset.navigationTabs) tabs[0].outerHTML = workbenchTabs();
      tabs.forEach((el, i) => {
        if (i > 0) el.remove();
      });
    }
  }
  if (state.view.startsWith('ops-'))
    app.querySelectorAll('.page > .tabs').forEach((el) => el.remove());
}

export const navigationObserver = new MutationObserver(() => normalizeNavigationSurface());

export function commonHead(eyebrow, title, subtitle, actions = '') {
  return (
    (workbenchViews.includes(state.view) ? workbenchTabs() : '') +
    (actions
      ? '<div class="compact-page-actions"><div class="head-actions">' + actions + '</div></div>'
      : '')
  );
}

function navGroup(label, icon, group, active, children) {
  var groups = state.navGroups || (state.navGroups = {});
  var open = groups[group] === true || (groups[group] === undefined && active);
  return (
    '<div class="nav-group ' +
    (open ? 'is-open' : '') +
    '"><button class="nav-item nav-group-head ' +
    (active ? 'active' : '') +
    '" data-nav-group="' +
    group +
    '" aria-expanded="' +
    open +
    '"><span class="nav-icon">' +
    icon +
    '</span><span>' +
    label +
    '</span><span class="nav-chevron">' +
    (open ? '⌃' : '⌄') +
    '</span></button>' +
    (open ? '<div class="subnav nav-group-children">' + children + '</div>' : '') +
    '</div>'
  );
}

function renderSidebar() {
  var v = state.view;
  var projectActive = [
    'project-basic',
    'project-overview',
    'project-lifecycle',
    'project-adjustment',
  ].includes(v);
  var opsActive = v.startsWith('ops-');
  var projectChildren =
    '<button class="' +
    (v === 'project-basic' ? 'active' : '') +
    '" data-nav="project-basic">基本信息</button><button class="' +
    (v === 'project-overview' ? 'active' : '') +
    '" data-nav="project-overview">项目概况</button><button class="' +
    (v === 'project-lifecycle' ? 'active' : '') +
    '" data-nav="project-lifecycle">全生命周期</button><button class="' +
    (v === 'project-adjustment' ? 'active' : '') +
    '" data-nav="project-adjustment">项目调整</button>';
  var opsChildren =
    '<button class="' +
    (v === 'ops-projects' ? 'active' : '') +
    '" data-action="ops-tab" data-tab="projects">项目运营看板</button><button class="' +
    (v === 'ops-people' ? 'active' : '') +
    '" data-action="ops-tab" data-tab="people">人员运营看板</button><button class="' +
    (v === 'ops-resources' ? 'active' : '') +
    '" data-action="ops-tab" data-tab="resources">资源分配看板</button><button class="' +
    (v === 'ops-review' ? 'active' : '') +
    '" data-nav="ops-review">AI 检视看板</button>';
  $('#sidebar').innerHTML =
    '<div class="nav-title">工作台</div>' +
    navItem(
      '个人工作台',
      '⌂',
      'dashboard',
      ['dashboard', 'tasks', 'flows', 'calendar', 'contacts', 'docs'].includes(v),
    ) +
    '<div class="nav-title">研发空间</div>' +
    navItem('项目集', '▦', 'portfolio', v === 'portfolio') +
    navGroup('项目管理', '▤', 'project', projectActive, projectChildren) +
    '<div class="asset-sidebar-entry"><div class="nav-title">业务资产</div>' +
    navItem('业务资产管理', '▣', 'asset-gallery', v === 'asset-gallery') +
    '</div>' +
    // 运营看板仅部门主管可见。
    (can(state.role, 'operations.view')
      ? '<div class="nav-title">运营管理</div>' +
        navGroup('运营看板', '▥', 'ops', opsActive, opsChildren)
      : '');
}
App.renderSidebar = renderSidebar;

/** 侧边栏分组展开/收起 */
export function bindNavGroupEvents() {
  document.addEventListener('click', function (e) {
    var group = e.target.closest('[data-nav-group]');
    if (!group) return;
    e.preventDefault();
    e.stopPropagation();
    state.navGroups = state.navGroups || {};
    var key = group.dataset.navGroup;
    state.navGroups[key] = state.navGroups[key] !== true;
    App.renderSidebar();
  });
}

/** 平板 / 手机：菜单按钮打开侧栏抽屉；点击遮罩或选择导航项后关闭。 */
export function bindResponsiveNav() {
  function setOpen(open) {
    document.body.classList.toggle('nav-open', open);
    const toggle = document.querySelector('.nav-toggle');
    if (toggle) toggle.setAttribute('aria-expanded', String(open));
  }
  document.addEventListener(
    'click',
    function (e) {
      const action = e.target.closest('[data-shell-action]');
      if (action) {
        setOpen(
          action.dataset.shellAction === 'toggle-nav' &&
            !document.body.classList.contains('nav-open'),
        );
        return;
      }
      // 捕获阶段判断：导航点击会重新渲染侧栏，冒泡到这里时目标已不在侧栏中。
      if (e.target.closest('#sidebar [data-nav], #sidebar [data-action]')) setOpen(false);
    },
    true,
  );
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') setOpen(false);
  });
}
