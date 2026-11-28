/** 检视工程师任务入口与主管 AI 检视运营（V41）。 */
import { projects } from '../../data/projects.js';
import { App } from '../../core/app.js';
import { esc } from '../../core/dom.js';
import { setView } from '../../core/navigation.js';

import { ops2Metric } from '../operations.js';

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
  ].filter((row) => projects[row.pid]);
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
      App.openReviewerTask(btn.dataset.project, btn.dataset.type);
      return;
    }
    var projectBtn = event.target.closest('[data-v41-project]');
    if (projectBtn) {
      event.preventDefault();
      event.stopPropagation();
      App.openReviewerTask(projectBtn.dataset.v41Project, 'formal');
    }
  });
}
