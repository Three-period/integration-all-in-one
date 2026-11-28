/** 个人工作台：仪表盘、任务、流程、日历、联系人与文档。 */
import { can } from '../../domain/permissions.js';
import { App } from '../../core/app.js';
import { commonHead } from '../../components/shell.js';
import { esc, person, tag } from '../../core/dom.js';
import { rolePolicy, widgetMeta } from '../../data/roles.js';
import { currentLayout } from '../../store/layout.js';
import { projects } from '../../data/projects.js';
import { SAMPLE_NAME } from '../../data/testing-sample.js';
import { devReviewStore, flowStore } from '../../store/lifecycle.js';
import { state } from '../../store/state.js';
import { renderApprovalWidget } from '../../features/stage-approval.js';

/**
 * 桌面 12 列网格按顺序排卡片：放不下时上一张卡片补满本行，最后一张补满末行，
 * 保证每行左右对齐、没有空缺。返回 [卡片 id, 补满后的列数（不需要补时为 0）]。
 */
function fillRows(ids, sizes) {
  const span = (id) => Number((sizes[id] || 'span-4').replace('span-', ''));
  const rows = [];
  let used = 0;
  ids.forEach((id) => {
    const n = Math.min(span(id), 12);
    if (used + n > 12 && rows.length) {
      const last = rows[rows.length - 1];
      last[1] = last[2] + (12 - used);
      used = 0;
    }
    rows.push([id, 0, n]);
    used += n;
  });
  if (rows.length && used < 12) {
    const last = rows[rows.length - 1];
    last[1] = last[2] + (12 - used);
  }
  return rows.map(([id, fill]) => [id, fill]);
}

function projectNotices() {
  if (state.role !== 'developer') return '';
  const notices = Object.entries(flowStore)
    .filter(([id, flow]) => projects[id] && flow.creationNotice?.recipient === state.user.username)
    .sort(([, a], [, b]) => b.creationNotice.at.localeCompare(a.creationNotice.at));
  const repairs = (state.bugRecords || []).filter(
    (row) =>
      projects[row.projectId] &&
      row.testFeedback &&
      row.status === '待整改' &&
      row.resolver === state.user.name,
  );

  const items =
    repairs
      .map(
        (row) =>
          '<li class="approval-row"><div><strong>测试退回整改 · ' +
          esc(row.name) +
          '</strong><small>' +
          esc(projects[row.projectId].name) +
          ' · ' +
          esc(row.id) +
          '</small></div><button class="btn" data-action="open-dev-project" data-project="' +
          esc(row.projectId) +
          '">查看整改</button></li>',
      )
      .join('') +
    notices
      .map(
        ([id, { creationNotice }]) =>
          '<li class="approval-row"><div><strong>新建项目 · ' +
          esc(projects[id].name) +
          '</strong><small>' +
          esc(creationNotice.creator) +
          ' 创建 · ' +
          esc(new Date(creationNotice.at).toLocaleString('zh-CN', { hour12: false })) +
          '</small></div><button class="btn" data-action="open-dev-project" data-project="' +
          esc(id) +
          '">查看项目</button></li>',
      )
      .join('');
  return (
    '<div data-project-notices>' +
    (items
      ? '<ul class="approval-list">' + items + '</ul>'
      : '<p class="mini-note">暂无项目通知</p>') +
    '</div>'
  );
}

export function renderWorkbench() {
  const active = state.view === 'dashboard' ? 'dashboard' : 'dashboard';
  const tabs = `<div class="workbench-tabs"><button class="${active === 'dashboard' ? 'active' : ''}" data-action="workbench-tab" data-tab="dashboard">顶部仪表盘</button><button data-action="workbench-tab" data-tab="tasks">我的任务</button><button data-action="workbench-tab" data-tab="flows">我的流程</button></div>`;
  const layout = currentLayout();
  state.draftVisible = layout.slice();
  const allowed = rolePolicy[state.role];
  const ids = layout.filter((id) => allowed.includes(id));
  if (state.role === 'developer') {
    const summary = ids.indexOf('summary');
    if (summary >= 0) {
      ids.splice(summary, 1);
      ids.unshift('summary', 'notices');
    } else {
      ids.unshift('notices');
    }
  }
  const widgets = {
    notices: projectNotices(),
    summary: `<div class="compact-metrics"><div class="compact-metric"><span>参与项目</span><b>6</b></div><div class="compact-metric"><span>本周完成任务</span><b>18</b></div><div class="compact-metric"><span>待处理缺陷</span><b class="down">12</b></div><div class="compact-metric"><span>项目平均进度</span><b>72%</b></div></div>`,
    todo: `<div class="todo"><div class="todo-row" data-sample-projects="algorithm"><button class="check" data-action="open-todo" title="处理审批"></button><div class="todo-title">审批项目立项申请<small>液冷控制算法预研 · 王凯 · 10分钟前</small></div>${tag('逾期', 'red')}</div><div class="todo-row" data-sample-projects="thermal"><button class="check" data-action="open-todo"></button><div class="todo-title">验证缺陷：高并发设备消息上报<small>智能温控平台 V2.6 · 孙宁 · 2小时前</small></div>${tag('高优', 'orange')}</div><div class="todo-row" data-sample-projects="cloud"><button class="check" data-action="open-todo"></button><div class="todo-title">确认需求变更影响范围<small>设备云平台 3.0 · 陈思 · 昨日</small></div>${tag('待处理', 'blue')}</div></div>`,
    activity: `<div class="activity"><div class="activity-item" data-sample-projects="thermal"><i class="mini-avatar">赵</i><p><b>赵敏</b> 在需求评审中@你：请补充能耗数据边界说明<small>10分钟前 · 智能温控平台 V2.6</small></p></div><div class="activity-item" data-sample-projects="cloud"><i class="mini-avatar">孙</i><p><b>孙宁</b> 更新了缺陷 DFT-0198 的修复状态<small>1小时前 · 设备云平台 3.0</small></p></div><div class="activity-item" data-sample-projects="thermal"><i class="mini-avatar">系</i><p>《软件规格书》已生成新版本 V1.3<small>昨日 18:20 · 智能温控平台 V2.6</small></p></div></div>`,
    projects: `<div class="mini-list"><div class="mini-list-row" data-sample-projects="thermal"><i class="mini-avatar">智</i><div class="grow"><strong>智能温控平台 V2.6</strong><small>项目经理：王凯 · 进度 72%</small></div>${tag('进行中', 'blue')}</div><div class="mini-list-row" data-sample-projects="cloud"><i class="mini-avatar">设</i><div class="grow"><strong>设备云平台 3.0</strong><small>参与成员 · 进度 61%</small></div>${tag('进行中', 'blue')}</div><div class="mini-list-row" data-sample-projects="gateway"><i class="mini-avatar">边</i><div class="grow"><strong>边缘计算网关适配</strong><small>项目经理：陈思 · 进度 54%</small></div>${tag('已延期', 'red')}</div></div>`,
    requirements: `<div class="chart-area" style="padding:16px"><div class="bar-row"><span>原始需求</span><div class="track"><div class="fill" style="width:100%;background:#9bbcff"></div></div><b>8</b></div><div class="bar-row"><span>评审中</span><div class="track"><div class="fill" style="width:62%;background:#ffd49a"></div></div><b>5</b></div><div class="bar-row"><span>已通过</span><div class="track"><div class="fill" style="width:42%;background:#6fd6a1"></div></div><b>3</b></div><div class="mini-note">数据来源：需求文档版本与评审状态实时汇总</div></div>`,
    development: `<div class="mini-list"><div class="mini-list-row" data-sample-projects="thermal"><i class="mini-avatar">T</i><div class="grow"><strong>实现断线自动重连</strong><small>智能温控 · 预计 8h · 截止今天</small></div>${tag('进行中', 'blue')}</div><div class="mini-list-row" data-sample-projects="cloud"><i class="mini-avatar">A</i><div class="grow"><strong>补齐设备接入接口</strong><small>设备云 · 预计 6h · 截止明天</small></div>${tag('待测试', 'purple')}</div></div>`,
    testing: `<div class="compact-metrics"><div class="compact-metric"><span>用例总数</span><b>128</b></div><div class="compact-metric"><span>执行率</span><b>82%</b></div><div class="compact-metric"><span>通过率</span><b class="up">91%</b></div><div class="compact-metric"><span>未关闭缺陷</span><b class="down">12</b></div></div>`,
    approvals: renderApprovalWidget(),
    risks: `<div class="mini-list"><div class="mini-list-row" data-sample-projects="thermal"><i class="mini-avatar" style="background:#fff0ef;color:#d92d20">!</i><div class="grow"><strong>整机联调环境交付延期</strong><small>智能温控 · 责任人：王凯 · 预计影响发布</small></div>${tag('极高', 'red')}</div><div class="mini-list-row" data-sample-projects="thermal"><i class="mini-avatar" style="background:#fff4e5;color:#b54708">!</i><div class="grow"><strong>测试资源与其他重点项目冲突</strong><small>智能温控 · 责任人：赵敏</small></div>${tag('高', 'orange')}</div></div>`,
    team: `<div class="people-bars" style="padding:17px"><div class="people-bar"><span>开发团队</span><div class="bar"><i style="width:84%;background:#6f9fff"></i></div><b>84%</b></div><div class="people-bar"><span>测试团队</span><div class="bar"><i style="width:112%;background:#f79009"></i></div><b class="down">112%</b></div><div class="people-bar"><span>产品团队</span><div class="bar"><i style="width:68%;background:#6fd6a1"></i></div><b>68%</b></div></div>`,
  };
  if (can(state.role, 'review.perform')) {
    widgets.todo = App.renderReviewerTodoWidget();
    widgets.summary = App.renderReviewerSummaryWidget();
  }
  if (state.role === 'tester') {
    widgets.todo =
      '<div class="mini-list">' +
      Object.entries(devReviewStore)
        .filter(
          ([id, d]) =>
            projects[id] &&
            d.handoff &&
            d.approval?.commit === d.commit &&
            projects[id].flowStatus === '测试阶段',
        )
        .map(
          ([id, d]) =>
            '<div class="mini-list-row"><div class="grow"><strong>' +
            esc(projects[id].name) +
            '</strong><small>待测试 · ' +
            esc(d.commit) +
            '</small></div><button class="btn" data-action="open-testing-project" data-project="' +
            esc(id) +
            '">进入测试</button></div>',
        )
        .join('') +
      '<div class="mini-list-row"><div class="grow"><strong>' +
      SAMPLE_NAME +
      '</strong><small>Mock 项目</small></div><button class="btn primary" data-action="open-testing-sample">打开整改示例</button></div></div>' +
      widgets.todo;
  }
  const sizes = {
    notices: 'span-8',
    summary: 'span-4',
    todo: 'span-8',
    activity: 'span-4',
    projects: 'span-4',
    requirements: 'span-4',
    development: 'span-4',
    testing: 'span-4',
    approvals: 'span-4',
    risks: 'span-6',
    team: 'span-6',
  };
  return `<section class="page">${commonHead(
    '个人工作台',
    '我的研发工作台',
    '聚合个人待办、项目进展、审批流程与研发质量数据。',
    `<button class="btn ${state.editingLayout ? 'warning' : ''}" data-action="toggle-layout">${state.editingLayout ? '完成编辑' : '⌘ 自定义布局'}</button>`,
  )}${tabs}<div class="dashboard-grid ${state.editingLayout ? 'editing-layout' : ''}" id="dashboardGrid">${fillRows(
    ids,
    sizes,
  )
    .map(
      ([id, fill]) =>
        `<article class="card widget ${sizes[id]}" data-widget="${id}"${fill ? ` data-fill="${fill}"` : ''} draggable="${state.editingLayout && id !== 'notices'}"><div class="card-head"><span class="card-title">${widgetMeta[id][0]}</span><span><span class="card-note">${widgetMeta[id][1]}</span><span class="widget-grip"> ⋮⋮</span></span></div>${widgets[id]}</article>`,
    )
    .join('')}</div></section>`;
}

export function renderTasks() {
  if (can(state.role, 'review.perform')) return App.renderReviewerTasksPage();
  return `<section class="page">${commonHead('个人工作台', '我的任务', '仅展示与当前用户有关的任务，支持在列表中快速更新进度。', '<button class="btn">导出任务</button>')}<div class="tabs"><button class="tab active">待开始 <span class="tag gray">3</span></button><button class="tab">进行中 <span class="tag blue">4</span></button><button class="tab">即将逾期 <span class="tag orange">2</span></button><button class="tab">已完成 <span class="tag green">18</span></button></div><div class="toolbar"><input class="input search-input" placeholder="搜索任务名称 / 项目"><select class="input"><option>全部优先级</option><option>高</option><option>中</option><option>低</option></select><button class="btn">重置</button></div><div class="card table-wrap"><table class="table"><thead><tr><th>任务名称</th><th>关联项目</th><th>截止时间</th><th>优先级</th><th>进度</th><th>状态</th><th>操作</th></tr></thead><tbody><tr data-sample-projects="thermal"><td class="link">补充能耗数据边界说明</td><td>智能温控平台 V2.6</td><td class="down">2026-08-12 18:00</td><td>${tag('高', 'red')}</td><td><div class="table-progress"><input type="range" value="40" min="0" max="100" style="width:80px"><span>40%</span></div></td><td>${tag('进行中', 'blue')}</td><td><button class="op" data-action="open-task">查看</button><button class="op" data-action="update-task">更新进度</button></td></tr><tr data-sample-projects="cloud"><td class="link">确认需求变更影响范围</td><td>设备云平台 3.0</td><td>2026-08-14 12:00</td><td>${tag('中', 'orange')}</td><td><div class="table-progress"><input type="range" value="65" min="0" max="100" style="width:80px"><span>65%</span></div></td><td>${tag('进行中', 'blue')}</td><td><button class="op" data-action="open-task">查看</button><button class="op" data-action="update-task">更新进度</button></td></tr><tr data-sample-projects="thermal"><td class="link">整理项目发布复盘模板</td><td>智能温控平台 V2.6</td><td>2026-08-18</td><td>${tag('低', 'gray')}</td><td><div class="table-progress"><input type="range" value="0" min="0" max="100" style="width:80px"><span>0%</span></div></td><td>${tag('待开始', 'gray')}</td><td><button class="op" data-action="open-task">查看</button></td></tr></tbody></table><div class="pagination"><span>共 25 条</span><button class="page-btn" disabled>‹</button><button class="page-btn active">1</button><button class="page-btn">2</button><button class="page-btn">›</button></div></div></section>`;
}

export function renderFlows() {
  return `<section class="page">${commonHead('个人工作台', '我的流程', '集中处理本人待审批、发起和已处理的全部流程。', '<button class="btn">流程查询</button>')}<div class="tabs"><button class="tab active">待我审批 <span class="tag orange">2</span></button><button class="tab">我发起的</button><button class="tab">已处理的</button></div><div class="card table-wrap"><table class="table"><thead><tr><th>流程标题</th><th>类型</th><th>发起人</th><th>到达时间</th><th>当前节点</th><th>状态</th><th>操作</th></tr></thead><tbody><tr data-sample-projects="algorithm"><td class="link">液冷控制算法预研 · 项目立项申请</td><td>项目立项</td><td>${person('赵敏', '赵')}</td><td>今天 09:12</td><td>技术主管审批</td><td>${tag('待审批', 'orange')}</td><td><button class="op" data-action="approve-flow">通过</button><button class="op danger" data-action="reject-flow">驳回</button></td></tr><tr data-sample-projects="cloud"><td class="link">设备云平台 3.0 · 需求变更申请</td><td>需求变更</td><td>${person('陈思', '陈')}</td><td>昨日 16:40</td><td>研发总监审批</td><td>${tag('待审批', 'orange')}</td><td><button class="op" data-action="approve-flow">通过</button><button class="op danger" data-action="reject-flow">驳回</button></td></tr><tr data-sample-projects="thermal"><td>智能温控平台 · 需求评审 V2.1</td><td>文档评审</td><td>${person('王凯', '王')}</td><td>08-08 14:28</td><td>评审完成</td><td>${tag('已通过', 'green')}</td><td><button class="op" data-action="open-flow">查看</button></td></tr></tbody></table></div></section>`;
}

export function renderCalendar() {
  const days = ['一', '二', '三', '四', '五', '六', '日'];
  const nums = [
    27, 28, 29, 30, 31, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21,
    22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 1, 2, 3, 4, 5, 6,
  ];
  return `<section class="page">${commonHead('个人工作台', '我的日历', '任务截止时间、会议安排与项目里程碑统一展示。', '<button class="btn">＋ 新建日程</button>')}<div class="toolbar"><div class="view-toggle"><button class="active">月</button><button>周</button></div><button class="btn">‹</button><button class="btn">今天</button><button class="btn">›</button><strong style="font-size:15px;margin-left:5px">2026 年 8 月</strong><div class="push"><span class="tag blue">任务 12</span> <span class="tag green">里程碑 3</span> <span class="tag orange">会议 4</span></div></div><div class="calendar">${days.map((d) => `<div class="weekday">周${d}</div>`).join('')}${nums.map((n, i) => `<div class="day ${n === 11 && i > 5 ? 'today' : ''}" data-action="calendar-day"><span class="day-num">${n}</span>${n === 12 && i > 5 ? '<span class="event">需求评审 14:00</span>' : ''}${n === 15 && i > 5 ? '<span class="event green">开发提测</span>' : ''}${n === 18 && i > 5 ? '<span class="event orange">联调里程碑</span>' : ''}</div>`).join('')}</div></section>`;
}

export function renderContacts() {
  return `<section class="page">${commonHead('个人工作台', '我的联系人', '常用协作人员，支持快速发起会话或指派任务。', '<button class="btn">导入组织架构</button>')}<div class="toolbar"><input class="input search-input" placeholder="搜索姓名、部门或工号"><button class="btn">仅看常用</button></div><div class="card card-pad"><div class="contact">${person('王凯', '王')}<div class="grow"><strong>王凯 <span class="tag blue">项目经理</span></strong><small>软件一科 · 最近协作：10分钟前</small></div><button class="op" data-action="message">发起会话</button><button class="op" data-action="assign">指派任务</button></div><div class="contact">${person('赵敏', '赵')}<div class="grow"><strong>赵敏 <span class="tag purple">测试工程师</span></strong><small>质量部 · 最近协作：1小时前</small></div><button class="op" data-action="message">发起会话</button><button class="op" data-action="assign">指派任务</button></div><div class="contact">${person('孙宁', '孙')}<div class="grow"><strong>孙宁 <span class="tag green">研发工程师</span></strong><small>软件一科 · 最近协作：昨日</small></div><button class="op" data-action="message">发起会话</button><button class="op" data-action="assign">指派任务</button></div></div></section>`;
}

export function renderMyDocs() {
  return `<section class="page">${commonHead('个人工作台', '我的文档', '跨项目收藏的文档快照，源文档更新不会自动替换收藏版本。', '<button class="btn">标签管理</button>')}<div class="toolbar"><input class="input search-input" placeholder="搜索收藏文档"><select class="input"><option>全部阶段</option><option>需求</option><option>设计</option><option>测试</option></select></div><div class="card table-wrap"><table class="table"><thead><tr><th>文档标题</th><th>来源项目</th><th>阶段</th><th>收藏版本</th><th>收藏时间</th><th>标签</th><th>操作</th></tr></thead><tbody><tr data-sample-projects="thermal"><td class="link">软件规格书</td><td>智能温控平台 V2.6</td><td>${tag('设计', 'purple')}</td><td>V1.3</td><td>2026-08-08</td><td>${tag('重点参考', 'blue')}</td><td><button class="op" data-action="open-doc">打开快照</button><button class="op danger" data-action="remove-doc">取消收藏</button></td></tr><tr><td class="link">测试用例设计规范</td><td>组织级公共文档</td><td>${tag('测试', 'green')}</td><td>V2.0</td><td>2026-08-01</td><td>${tag('规范', 'gray')}</td><td><button class="op" data-action="open-doc">打开快照</button><button class="op danger" data-action="remove-doc">取消收藏</button></td></tr></tbody></table></div></section>`;
}
