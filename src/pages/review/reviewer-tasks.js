/** 检视工程师任务入口与主管 AI 检视运营（V41）。 */
import { devReviewStore, getDevReview } from '../../store/lifecycle.js';
import { App } from '../../core/app.js';
import { commonHead } from '../../components/shell.js';
import { esc, tag } from '../../core/dom.js';
import { setView } from '../../core/navigation.js';
import { projects } from '../../data/projects.js';

import { ops2Metric } from '../operations.js';
import { state } from '../../store/state.js';

/* V41: reviewer task entrance + supervisor-only AI review operations (all Mock). */
function reviewerTaskEntries() {
  var entries = [];
  Object.keys(projects).forEach(function (pid) {
    var d = devReviewStore[pid];
    if (!d) return;
    (d.issues || []).forEach(function (issue) {
      if (issue.status === '异议待裁定' || issue.status === '待线下评审')
        entries.push({
          pid: pid,
          type: 'dispute',
          title: '开发异议 · ' + issue.title,
          id: issue.id,
          commit: issue.commit,
          status: issue.status,
        });
      if (issue.source === '人工检视' && issue.status === '待人工复核')
        entries.push({
          pid: pid,
          type: 'recheck',
          title: '人工复核 · ' + issue.title,
          id: issue.id,
          commit: issue.commit,
          status: '待人工复核',
        });
    });
    var r = (d.runs || [])
      .slice()
      .reverse()
      .find(function (run) {
        return run.commit === d.commit;
      });
    var ready = !!(
      r &&
      r.result === '完成' &&
      r.checks.every(function (c) {
        return c.result === '通过';
      }) &&
      (d.issues || []).every(function (i) {
        return ['已关闭', '授权例外'].includes(i.status);
      })
    );
    var manualDone = ['高风险必查', 'AI 未有效覆盖', '独立抽检'].every(function (k) {
      return (d.manual || []).some(function (m) {
        return m.kind === k && m.commit === d.commit && m.result === '无新增问题';
      });
    });
    if (ready && !d.approval)
      entries.push({
        pid: pid,
        type: 'formal',
        title: manualDone ? '待准出确认 · ' + d.task : '正式专业检视 · ' + d.task,
        id: d.task,
        commit: d.commit,
        status: manualDone ? '待准出' : '待检视',
      });
  });
  return entries;
}
App.reviewerTaskEntries = reviewerTaskEntries;

function reviewerDemoEntry() {
  return {
    pid: 'thermal',
    type: 'formal',
    title: '正式专业检视 · TASK-142（示例）',
    id: 'TASK-142',
    commit: 'mock-review-001',
    status: '演示待办',
    demo: true,
  };
}

function reviewerEntriesWithDemo() {
  var list = App.reviewerTaskEntries();
  return list.length ? list : [reviewerDemoEntry()];
}
App.reviewerEntriesWithDemo = reviewerEntriesWithDemo;

function ensureReviewerDemo(pid) {
  var d = devReviewStore[pid];
  if (d && (d.runs.length || d.issues.length || d.commits.length)) return;
  var old = state.projectId;
  state.projectId = pid;
  d = getDevReview();
  d.developer = '孙宁';
  d.commit = 'mock-review-001';
  d.commits = [{ commit: d.commit, owner: d.developer, at: '演示数据' }];
  d.smokes = [
    {
      commit: d.commit,
      owner: d.developer,
      result: '通过',
      text: '演示冒烟测试通过',
      at: '演示数据',
    },
  ];
  d.selfTests = [
    { commit: d.commit, owner: d.developer, text: '演示自测报告已提交', at: '演示数据' },
  ];
  d.runs = [
    {
      id: 'AI-DEMO-01',
      commit: d.commit,
      at: '演示数据',
      ruleVersion: 'MOCK-1.0',
      result: '完成',
      checks: ['文件一致性', '文件正确性', '方案与代码一致性', '点检项检查'].map(function (name) {
        return { name: name, result: '通过', detail: 'Mock 检查已完成' };
      }),
      owner: d.developer,
    },
  ];
  d.issues = [];
  d.manual = [];
  d.formalRequest = { commit: d.commit, at: '演示数据', owner: d.developer };
  d.approval = null;
  d.handoff = false;
  d.reviewMode = 'todos';
  state.projectId = old;
}

function openReviewerTask(pid, type, demo) {
  if (!projects[pid]) return;
  if (demo) ensureReviewerDemo(pid);
  state.projectId = pid;
  var d = getDevReview();
  d.role = 'reviewer';
  d.reviewMode = type === 'dispute' ? 'disputes' : type === 'recheck' ? 'formal' : 'todos';
  state.projectSection = 'lifecycle';
  state.lifecycleStage = 'development';
  setView('project-lifecycle');
}
App.openReviewerTask = openReviewerTask;

function renderReviewerTaskTable() {
  var list = App.reviewerEntriesWithDemo();
  return (
    '<div class="card table-wrap"><table class="table"><thead><tr><th>待办类型 / 任务</th><th>关联项目</th><th>关联 Commit</th><th>状态</th><th>操作</th></tr></thead><tbody>' +
    list
      .map(function (t) {
        return (
          '<tr><td><b>' +
          esc(t.title) +
          '</b><small class="mini-note" style="display:block">' +
          esc(t.id) +
          '</small></td><td>' +
          esc(projects[t.pid].name) +
          '</td><td>' +
          esc(t.commit || '—') +
          '</td><td>' +
          tag(t.status, t.demo ? 'orange' : 'blue') +
          '</td><td><button class="op" data-v41-task="open" data-project="' +
          esc(t.pid) +
          '" data-type="' +
          t.type +
          '" data-demo="' +
          (t.demo ? '1' : '0') +
          '">进入检视工作台</button></td></tr>'
        );
      })
      .join('') +
    '</tbody></table></div>'
  );
}
App.renderReviewerTaskTable = renderReviewerTaskTable;

function renderReviewerTasksPage() {
  return (
    '<section class="page">' +
    commonHead(
      '个人工作台 / 我的任务',
      '检视任务待办',
      '当前角色：检视工程师。正式检视、开发异议和人工复核统一展示；点击进入对应项目的开发阶段检视工作台。',
    ) +
    '<div class="notice"><i>◈</i><span>待办与开发阶段的检视状态共用数据。没有真实待办时展示一条标有「示例」的 Mock 任务，可点击进入交互演示，不代表已收到真实检视申请。</span></div>' +
    App.renderReviewerTaskTable() +
    '</section>'
  );
}
App.renderReviewerTasksPage = renderReviewerTasksPage;

function renderReviewerTodoWidget() {
  return (
    '<div class="mini-list">' +
    App.reviewerEntriesWithDemo()
      .slice(0, 4)
      .map(function (t) {
        return (
          '<div class="mini-list-row"><i class="mini-avatar">检</i><div class="grow"><strong>' +
          esc(t.title) +
          '</strong><small>' +
          esc(projects[t.pid].name) +
          ' · ' +
          esc(t.commit) +
          '</small></div><button class="op" data-v41-task="open" data-project="' +
          t.pid +
          '" data-type="' +
          t.type +
          '" data-demo="' +
          (t.demo ? '1' : '0') +
          '">处理</button></div>'
        );
      })
      .join('') +
    '<div style="padding:10px 0"><button class="btn" data-v41-task="all">查看全部检视待办</button></div></div>'
  );
}
App.renderReviewerTodoWidget = renderReviewerTodoWidget;

function renderReviewerSummaryWidget() {
  var n = App.reviewerTaskEntries().length;
  return (
    '<div class="compact-metrics"><div class="compact-metric"><span>待处理检视任务</span><b>' +
    n +
    '</b></div><div class="compact-metric"><span>演示可进入任务</span><b>' +
    App.reviewerEntriesWithDemo().length +
    '</b></div><div class="compact-metric"><span>工作台角色</span><b style="font-size:16px">检视工程师</b></div><div class="compact-metric"><span>数据类型</span><b style="font-size:16px">Mock</b></div></div>'
  );
}
App.renderReviewerSummaryWidget = renderReviewerSummaryWidget;

export function renderReviewOperations() {
  var data = [
    {
      pid: 'thermal',
      name: '智能温控平台 V2.6',
      runs: 12,
      passed: 10,
      issues: 8,
      closed: 7,
      duration: 3.2,
    },
    {
      pid: 'gateway',
      name: '边缘计算网关适配',
      runs: 7,
      passed: 4,
      issues: 11,
      closed: 8,
      duration: 4.6,
    },
    {
      pid: 'algorithm',
      name: '液冷控制算法预研',
      runs: 5,
      passed: 4,
      issues: 3,
      closed: 3,
      duration: 2.5,
    },
    {
      pid: 'cloud',
      name: '设备云平台 3.0',
      runs: 9,
      passed: 7,
      issues: 6,
      closed: 5,
      duration: 3.7,
    },
  ];
  var total = data.reduce(function (a, x) {
      return a + x.runs;
    }, 0),
    pass = data.reduce(function (a, x) {
      return a + x.passed;
    }, 0),
    issues = data.reduce(function (a, x) {
      return a + x.issues;
    }, 0),
    closed = data.reduce(function (a, x) {
      return a + x.closed;
    }, 0),
    projectsCount = data.length;
  var pct = function (a, b) {
    return b ? Math.round((a / b) * 100) + '%' : '—';
  };
  return (
    '<div class="v41-note">演示指标按下方 Mock 检视批次统计；通过率 = 通过批次 / 已执行批次，问题闭环率 = 已关闭问题 / 总问题。数据仅供产品演示。</div>' +
    '<div class="ops2-metrics">' +
    ops2Metric('AI检视项目数', projectsCount, '参与 AI 检视的项目') +
    ops2Metric('AI检视批次数', total, '包含多次复检批次') +
    ops2Metric('AI检视通过率', pct(pass, total), '通过 ' + pass + ' / ' + total + ' 批次', 'good') +
    ops2Metric('发现问题数', issues, '需跟踪整改闭环', 'warn') +
    ops2Metric(
      '问题闭环率',
      pct(closed, issues),
      '已关闭 ' + closed + ' / ' + issues + ' 项',
      'good',
    ) +
    '</div>' +
    '<div class="ops2-grid cols-2">' +
    '<section class="ops2-card"><div class="ops2-card-head"><strong>各项目 AI 检视批次与通过情况</strong><span class="mini-note">Mock 数据</span></div><div class="ops2-card-body">' +
    data
      .map(function (d) {
        return (
          '<div class="v41-bar-row"><div class="v41-bar-name">' +
          esc(d.name) +
          '</div><div class="v41-bar-track"><i style="width:' +
          Math.round((d.runs / 12) * 100) +
          '%"></i><b style="width:' +
          Math.round((d.passed / 12) * 100) +
          '%"></b></div><strong>' +
          d.passed +
          '/' +
          d.runs +
          '</strong></div>'
        );
      })
      .join('') +
    '<p class="v41-caption">浅蓝：检视总批次；深蓝：通过批次</p></div></section>' +
    '<section class="ops2-card"><div class="ops2-card-head"><strong>AI 检视质量摘要</strong></div><div class="ops2-card-body"><div class="v41-quality"><div><span>累计发现问题</span><b>' +
    issues +
    '</b></div><div><span>已闭环问题</span><b>' +
    closed +
    '</b></div><div><span>待闭环问题</span><b>' +
    (issues - closed) +
    '</b></div></div><div style="margin-top:20px">' +
    data
      .map(function (d) {
        return (
          '<div class="v41-progress"><span>' +
          esc(d.name) +
          '</span><div class="progress-bar"><i style="width:' +
          Math.round((d.closed / d.issues) * 100) +
          '%"></i></div><b>' +
          pct(d.closed, d.issues) +
          '</b></div>'
        );
      })
      .join('') +
    '</div></div></section></div>' +
    '<section class="ops2-card" style="margin-top:12px"><div class="ops2-card-head"><strong>项目检视明细</strong><span class="mini-note">点击项目进入检视工作台</span></div><div class="ops2-table-wrap"><table class="ops2-table"><thead><tr><th>项目</th><th>AI检视批次</th><th>通过批次</th><th>通过率</th><th>发现问题</th><th>已闭环</th><th>平均检视耗时（分钟）</th><th>操作</th></tr></thead><tbody>' +
    data
      .map(function (d) {
        return (
          '<tr><td>' +
          esc(d.name) +
          '</td><td>' +
          d.runs +
          '</td><td>' +
          d.passed +
          '</td><td>' +
          pct(d.passed, d.runs) +
          '</td><td>' +
          d.issues +
          '</td><td>' +
          d.closed +
          '</td><td>' +
          d.duration +
          '</td><td><button class="op" data-v41-project="' +
          d.pid +
          '">查看检视工作台</button></td></tr>'
        );
      })
      .join('') +
    '</tbody></table></div></section>'
  );
}

/** V41 检视任务入口与 AI 检视运营 */
export function initReviewerTasks() {
  document.addEventListener('click', function (event) {
    var btn = event.target.closest('[data-v41-task]');
    if (btn) {
      event.preventDefault();
      event.stopPropagation();
      if (btn.dataset.v41Task === 'all') {
        setView('tasks');
        return;
      }
      App.openReviewerTask(btn.dataset.project, btn.dataset.type, btn.dataset.demo === '1');
      return;
    }
    var projectBtn = event.target.closest('[data-v41-project]');
    if (projectBtn) {
      event.preventDefault();
      event.stopPropagation();
      App.openReviewerTask(projectBtn.dataset.v41Project, 'formal', false);
    }
  });
}
