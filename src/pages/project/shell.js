/** 项目页外壳：项目横幅、项目内导航与阶段 Tab。 */
import { tag } from '../../core/dom.js';
import { project, state } from '../../store/state.js';

function renderProjectBanner() {
  const p = project();
  return `<div class="project-banner"><div><h2>${p.name}</h2><p>${p.code} · ${p.type} · ${p.department}</p></div><div class="banner-meta"><div>项目负责人<strong>${p.owner}</strong></div><div>计划周期<strong>${p.period}</strong></div><div>项目状态<strong class="health"><i></i>${tag(p.status, p.status === '已延期' ? 'red' : 'green')}</strong></div></div></div>`;
}

export function renderProjectShell(content) {
  return (
    '<section class="page">' +
    renderProjectBanner() +
    '<div class="project-layout project-content-only"><div>' +
    content +
    '</div></div></section>'
  );
}

export function lifecycleReferenceRail() {
  var stages = [
    ['planning', '流程视图'],
    ['requirements', '需求阶段'],
    ['design', '设计阶段'],
    ['development', '开发阶段'],
    ['testing', '测试阶段'],
    ['closing', '结项阶段'],
    ['release', '发布阶段'],
  ];
  var order = [
    'planning',
    'requirements',
    'design',
    'development',
    'testing',
    'release',
    'closing',
  ];
  var current = order.indexOf(state.lifecycleStage);
  return (
    '<div class="req-lifecycle-tabs">' +
    stages
      .map(function (item) {
        var isFlow = item[0] === 'planning';
        var reached = order.indexOf(item[0]) <= current;
        var dot = isFlow
          ? ''
          : '<span class="lifecycle-dot ' +
            (reached ? 'done' : 'pending') +
            '" aria-hidden="true"></span>';
        return (
          '<button class="req-lifecycle-tab ' +
          (state.lifecycleStage === item[0] ? 'active' : '') +
          '" data-action="lifecycle-stage" data-stage="' +
          item[0] +
          '">' +
          dot +
          item[1] +
          '</button>'
        );
      })
      .join('') +
    '</div>'
  );
}
