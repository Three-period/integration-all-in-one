/** 项目集页面。 */
import { commonHead } from '../components/shell.js';
import { esc, person, tag } from '../core/dom.js';
import { projects } from '../data/projects.js';
import { can } from '../domain/permissions.js';
import { currentUser } from '../core/auth.js';
import { App } from '../core/app.js';
import { closeModal, openModal } from '../components/overlays.js';
import { showToast } from '../components/toast.js';
import { deleteProject } from '../store/workflow-data.js';
import { state } from '../store/state.js';

function projectAction(id, view) {
  if (!can(state.role, 'project.delete'))
    return view === 'card'
      ? '<button class="more" data-action="project-more">•••</button>'
      : '<button class="op" data-action="project-more">更多</button>';
  const cls = view === 'card' ? 'more portfolio-delete' : 'op danger';
  return `<button class="${cls}" data-action="delete-project" data-project="${esc(id)}" aria-label="删除项目：${esc(projects[id].name)}">删除</button>`;
}

export function requestProjectDeletion(id) {
  if (!can(currentUser()?.role, 'project.delete') || !projects[id]) return;
  openModal(
    'delete-project', '删除项目',
    `<p>确认删除「${esc(projects[id].name)}」（${esc(projects[id].code)}）？</p><p>该项目的文档、审批、开发检视、测试和发布等模拟记录将一并删除，删除后无法恢复。</p>`,
    `<button class="btn" data-action="close-modal">取消</button><button class="btn danger" data-action="confirm-delete-project" data-project="${esc(id)}" data-owner-project="${esc(id)}">确认删除</button>`,
  );
}

export function confirmProjectDeletion(id) {
  if (!deleteProject(id, currentUser()?.role)) return;
  closeModal();
  App.render();
  showToast('项目及关联记录已删除');
}

export function renderPortfolio() {
  const list = Object.entries(projects);
  return `<section class="page">${commonHead('项目集', '全部项目', '展示当前用户有权限查看的项目，延期项目自动置顶。', '<button class="btn" data-action="toggle-project-view">' + (state.projectListMode === 'card' ? '☷ 列表视图' : '▦ 卡片视图') + '</button><button class="btn primary" data-action="new-project">＋ 新建项目</button>')}<div class="toolbar"><input class="input search-input" placeholder="搜索项目名称 / 编号"><select class="input"><option>全部项目状态</option><option>待立项</option><option>已立项</option><option>进行中</option><option>已延期</option><option>已结项</option></select><select class="input"><option>全部负责人</option><option>王凯</option><option>陈思</option><option>赵敏</option></select><input class="input" type="date"><span class="muted">至</span><input class="input" type="date"><button class="btn">重置</button><span class="push"><span class="tag red">延期 ${list.filter(([, p]) => p.status === '已延期').length}</span> <span class="tag blue">有权限项目 ${list.length}</span></span></div>${!list.length ? '<div class="card card-pad">暂无项目</div>' : state.projectListMode === 'card' ? `<div class="grid portfolio-cards cols-3">${list.map(([id, p]) => `<article class="card project-card" tabindex="0" data-action="open-project" data-project="${id}">${projectAction(id, 'card')}<h3>${esc(p.name)}</h3><p>${esc(p.code)} · ${esc(p.type)} · ${esc(p.department)}</p><div class="project-card-meta"><div><label>项目负责人</label><strong>${esc(p.owner)}</strong></div><div><label>计划截止</label><strong class="${p.status === '已延期' ? 'down' : ''}">${esc(p.end)}</strong></div></div><div class="table-progress"><div class="track" style="flex:1"><div class="fill" style="width:${p.progress}%;background:${p.status === '已延期' ? 'var(--red)' : 'var(--blue)'}"></div></div><b style="font-size:12px">${p.progress}%</b></div><div class="project-card-foot"><span class="avatars"><i>王</i><i>赵</i><i>孙</i></span><span>${p.status === '已延期' ? tag('延期', 'red') : tag(p.status, 'blue')}</span><span style="margin-left:auto">查看详情 →</span></div></article>`).join('')}</div>` : `<div class="card table-wrap"><table class="table"><thead><tr><th>项目名称</th><th>状态</th><th>负责人</th><th>进度</th><th>计划截止</th><th>实际截止</th><th>操作</th></tr></thead><tbody>${list.map(([id, p]) => `<tr><td class="link" data-action="open-project" data-project="${id}">${esc(p.name)}<small class="mini-note" style="display:block;margin-top:4px">${esc(p.code)}</small></td><td>${tag(p.status, p.status === '已延期' ? 'red' : 'blue')}</td><td>${person(p.owner, p.owner[0])}</td><td><div class="table-progress"><div class="track"><div class="fill" style="width:${p.progress}%;background:var(--blue)"></div></div>${p.progress}%</div></td><td class="${p.status === '已延期' ? 'down' : ''}">${esc(p.end)}</td><td>—</td><td><button class="op" data-action="open-project" data-project="${id}">进入项目</button>${projectAction(id, 'list')}</td></tr>`).join('')}</tbody></table></div>`}</section>`;
}
