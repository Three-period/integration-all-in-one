/** 布局整理、阶段目录与流程图导航（V49）。 */
import { App } from '../core/app.js';
import { showToast } from '../components/toast.js';
import { isStagePrereqMet, isStageDone } from './lifecycle-flow.js';
import { state } from '../store/state.js';

/** V49 布局整理与阶段目录 */
export function initLayoutRefinements() {
  /* V49: surgical layout cleanup, visible stage directory/read-only gate, process diagram navigation */

  var oldBasic = App.renderProjectBasic;
  App.renderProjectBasic = function () {
    var html = oldBasic();
    // The old V30 form is duplicated by the complete V47 creation form.
    html = html.replace(
      /<div class="grid cols-2"><div class="card form-card">[\s\S]*?(?=<div class="grid" style="align-content:start">)/,
      '<div class="grid cols-2">',
    );
    html = html
      .replace('项目基础信息 · 新建表单同步', '项目基础信息')
      .replace('<span class="mini-note">同一份项目记录 · Mock</span>', '');
    return html;
  };
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
  var stageLabels = [
    ['planning', '流程视图'],
    ['requirements', '需求阶段'],
    ['design', '设计阶段'],
    ['development', '开发阶段'],
    ['testing', '测试阶段'],
    ['release', '发布阶段'],
    ['closing', '结项阶段'],
  ];
  function started(stage) {
    if (stage === 'planning') return true;
    if (stage === 'closing') return !!isStageDone('release');
    return !!(isStagePrereqMet(stage) || isStageDone(stage));
  }
  function phaseName(stage) {
    var p = stageLabels.find(function (a) {
      return a[0] === stage;
    });
    return p ? p[1] : '当前阶段';
  }
  // Render the same seven navigation items regardless of workflow stage, with live project-dependent indicators.
  var originalLifecycle = App.renderLifecycle;
  App.renderLifecycle = function () {
    var html = originalLifecycle();
    var nav =
      '<div class="req-lifecycle-tabs v49-stage-nav">' +
      stageLabels
        .map(function (item) {
          var stage = item[0],
            lit = started(stage),
            on = state.lifecycleStage === stage;
          return (
            '<button type="button" class="req-lifecycle-tab ' +
            (on ? 'active ' : '') +
            (lit ? 'v49-started' : 'v49-not-started') +
            '" data-action="lifecycle-stage" data-stage="' +
            stage +
            '" aria-label="' +
            item[1] +
            ' · ' +
            (lit ? '已启动' : '未启动') +
            '">' +
            (stage === 'planning'
              ? ''
              : '<span class="v49-dot ' +
                (lit ? 'v49-on' : 'v49-off') +
                '" aria-hidden="true"></span>') +
            item[1] +
            '</button>'
          );
        })
        .join('') +
      '</div>';
    html = html.replace(/<div class="req-lifecycle-tabs">[\s\S]*?<\/div>/, nav);
    if (!started(state.lifecycleStage)) {
      html = html.replace(
        '<div class="stage-block">',
        '<div class="v49-locked-note">' +
          phaseName(state.lifecycleStage) +
          '尚未启动：当前仅可查看内容。上一阶段完成后将自动开放操作。</div><div class="stage-block v49-locked-stage">',
      );
    }
    return html;
  };
  // Do not allow business actions in an unopened stage. Stage tabs and diagram links are outside stage-block.
  document.addEventListener(
    'click',
    function (e) {
      var block = e.target.closest('.v49-locked-stage');
      if (!block) return;
      var action = e.target.closest('button,a,[role="button"],[data-action],[data-v47],[data-v35]');
      if (!action) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      showToast('当前阶段尚未启动，仅可查看；请先完成上一阶段', 'warn');
    },
    true,
  );
  document.addEventListener(
    'keydown',
    function (e) {
      if (!e.target.closest('.v49-locked-stage')) return;
      if (['Enter', ' '].includes(e.key) && e.target.closest('button,a,[role="button"]')) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
    },
    true,
  );
  // Fix clipping: diagram keeps its original 4540px geometry and is scrollable in both directions.
  var oldPlanning = App.renderPlanning;
  App.renderPlanning = function () {
    var html = oldPlanning();
    return html.replace('审批记录<span>按流程节点自动展示</span>', '当前流程审核');
  };
}
