/** 项目页外壳：项目横幅、项目内导航与阶段 Tab。 */
import { tag } from '../../core/dom.js';
import { project } from '../../store/state.js';

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
