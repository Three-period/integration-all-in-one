/** 阶段门禁、检视到测试的自动流转与集中审批面板（V48）。 */
import { App } from '../core/app.js';
import { showToast } from '../components/toast.js';
import { esc } from '../core/dom.js';
import { v35Data, v35FormalReady, v35Log, v35Pending, v35Stamp } from './dev-review.js';
import { v47DesignKeys, v47Flow, v47Note } from './lifecycle-flow.js';
import { project, state } from '../store/state.js';

/** V48 阶段门禁与集中审批 */
export function initStageGate() {
  /* V48: stage gate, automatic review-to-testing transfer, central mock approval, dashboard */

  // V49 made every phase visible for read-only inspection, so stage tabs and
  // diagram shortcuts are no longer gated here.
  var oldLifecycle = App.renderLifecycle;
  App.renderLifecycle = function () {
    var html = oldLifecycle();
    // V47 top stage approval panel is now in the process diagram's approval sidebar.
    html = html.replace(
      /<div class="v47-gate">[\s\S]*?<\/div><\/div>(?=<div class="(?:stage-block|req-lifecycle-tabs|flow-view-page|notice)|<section|<div)/,
      '',
    );
    // Clean up demonstration and template shortcut bars, no replacement placeholder.
    html = html.replace(
      /<div class="notice" style="align-items:center;flex-wrap:wrap;margin-bottom:12px;background:#f8fafc;border-color:#e4e7ec;color:#475467">[\s\S]*?data-v39="load">载入场景<\/button><\/div>/g,
      '',
    );
    html = html.replace(
      /<div style="margin:0 0 10px"><button class="v47-btn" data-v47="doc-open"[^>]*>[^<]*<\/button><\/div>/g,
      '',
    );
    return html;
  };
  // The top stage approval area is no longer rendered; original V47 handler remains the single source of approval rules.
  App.v47StagePanel = function () {
    return '';
  };
  function v48ApprovalPanel() {
    var f = v47Flow(),
      active =
        ['planning', 'requirements', 'design', 'testing', 'release'].find(function (x) {
          return !App.v47StageDone(x);
        }) || 'release';
    // For development phase, the reviewer's R3 action remains in the reviewer workspace.
    if (App.v47StageDone('design') && !App.v47StageDone('development')) active = 'development';
    var btn = '';
    if (active === 'planning')
      btn =
        '<button class="v47-cta" data-v47="approve-stage" data-stage="planning">模拟立项审核通过</button>';
    if (active === 'requirements')
      btn =
        '<button class="v47-btn" data-v47="doc-open" data-doc="requirement">编写需求规格书</button><button class="v47-cta" data-v47="approve-stage" data-stage="requirements">模拟需求审核通过</button>';
    if (active === 'design')
      btn =
        '<label class="mini-note">设计类别</label><select id="v47DesignType" class="input" style="max-width:115px"><option value="I" ' +
        (f.designType === 'I' ? 'selected' : '') +
        '>I 类</option><option value="II" ' +
        (f.designType === 'II' ? 'selected' : '') +
        '>II 类</option><option value="III" ' +
        (f.designType === 'III' ? 'selected' : '') +
        '>III 类</option><option value="IV" ' +
        (f.designType === 'IV' ? 'selected' : '') +
        '>IV 类</option></select>' +
        v47DesignKeys()
          .map(function (k) {
            var names = {
              architecture: '架构设计',
              summarydesign: '概要设计',
              detaildesign: '详细设计',
            };
            return (
              '<button class="v47-btn" data-v47="doc-open" data-doc="' +
              k +
              '">编写' +
              names[k] +
              '</button>'
            );
          })
          .join('') +
        '<button class="v47-cta" data-v47="approve-stage" data-stage="design">模拟设计审核通过</button>';
    if (active === 'development')
      btn =
        '<div class="mini-note">请在开发阶段完成 AI 检视，由检视工程师完成三项必检并确认准出；系统将自动移交测试。</div>';
    if (active === 'testing')
      btn = '<button class="v47-cta" data-v47="demo-testing">模拟整机测试报告审核通过</button>';
    if (active === 'release')
      btn = App.v47StageDone('release')
        ? '<span class="mini-note">所有流程审核已完成</span>'
        : '<button class="v47-cta" data-v47="demo-release">模拟发布评审、归档与正式发布</button>';
    var names = {
      planning: '立项审核',
      requirements: '需求规格书审核',
      design: '设计文档审核',
      development: '人工检视准出 / 自动移交',
      testing: '整机测试报告审核',
      release: '发布评审 / 归档',
    };
    return (
      '<div class="flow-view-approval-list v48-approval-list"><div class="v48-approval-actions"><b>当前审核 · ' +
      names[active] +
      '</b><small>当前项目：' +
      esc(project().name) +
      '</small><div class="v48-approval-buttons">' +
      btn +
      '</div></div></div>'
    );
  }
  var oldPlanning = App.renderPlanning;
  App.renderPlanning = function () {
    var html = oldPlanning();
    return html.replace(
      /<div class="flow-view-approval-list">[\s\S]*?<\/div><\/aside>/,
      v48ApprovalPanel() + '</aside>',
    );
  };
  // Keep approved Commit consistent, and move into testing without extra developer handoff click.
  document.addEventListener(
    'click',
    function (e) {
      var el = e.target.closest('[data-v35="approve"]');
      if (!el) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      var d = v35Data();
      if (
        d.role !== 'reviewer' ||
        !v35FormalReady() ||
        !['高风险必查', 'AI 未有效覆盖', '独立抽检'].every(function (k) {
          return d.manual.some(function (x) {
            return x.kind === k && x.commit === d.commit && x.result === '无新增问题';
          });
        }) ||
        v35Pending().length
      ) {
        showToast('请先完成三项必检、问题闭环和正式检视准入', 'warn');
        return;
      }
      if (!d.commit) {
        showToast('待移交 Commit 为空', 'warn');
        return;
      }
      d.approval = { commit: d.commit, at: v35Stamp(), reviewer: '检视工程师' };
      d.handoff = true;
      v35Log('人工检视准出通过；已自动移交 Commit ' + d.commit + ' 至测试');
      var p = project();
      p.flowStatus = '测试阶段';
      p.status = '进行中';
      p.progress = Math.max(Number(p.progress) || 0, 60);
      v47Note('R3 人工检视通过，系统自动移交 Commit ' + d.commit + '，测试阶段解锁');
      state.lifecycleStage = 'testing';
      App.render();
      showToast('人工检视通过！已自动移交 ' + d.commit + '，测试阶段已解锁');
    },
    true,
  );
  // Test handoff must be same approved commit, never a stale/mock-only state.
  var oldDevDone = App.v47StageDone;
  App.v47StageDone = function (k) {
    if (k === 'development') {
      var d = v35Data();
      return !!(d.approval && d.handoff && d.commit && d.approval.commit === d.commit);
    }
    return oldDevDone(k);
  };
  // The existing five V47 cards were appended after unrelated content and may be hard to find.
  // Reposition them conspicuously at the top of the project analytics view, preserving data.
  var oldProjects = App.ops2Projects;
  App.ops2Projects = function () {
    var html = oldProjects();
    var start = html.indexOf('<div class="v47-ops-grid"');
    if (start < 0) return html;
    var tail = html.slice(start);
    var head = html.slice(0, start);
    // Move original five cards in front of the KPIs, and label the section explicitly.
    return (
      '<div class="v48-dashboard-title"><h3>项目全景运营 · 五项新增 Mock 数据</h3><p>项目阶段、里程碑、延期、需求变更与风险分布 · 随演示项目状态更新</p></div>' +
      tail +
      head
    );
  };
  // Force visible project dashboard after project operations tab selection; retain supervisor-only access.
  var oldRenderOps = App.renderOps2;
  App.renderOps2 = function () {
    return oldRenderOps();
  };
}
