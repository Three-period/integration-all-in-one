/** 弹窗与抽屉：openModal / openDrawer / closeDrawer / modalForm。 */
import { $ } from '../core/dom.js';

export function openModal(
  type,
  title,
  body,
  foot = '<button class="btn" data-action="close-modal">取消</button><button class="btn primary" data-action="modal-save">保存</button>',
) {
  const root = $('#modalRoot');
  root.innerHTML = `<div class="modal"><div class="modal-head"><h3>${title}</h3><button class="modal-close" data-action="close-modal">×</button></div><div class="modal-body">${body}</div><div class="modal-foot">${foot}</div></div>`;
  root.classList.add('show');
}

export function modalForm(label, fields) {
  return `<div class="form-grid">${fields.map((f) => `<div class="field ${f.wide ? 'wide' : ''}"><label>${f.required ? '<b>*</b>' : ''}${f.label}</label>${f.area ? `<textarea placeholder="${f.placeholder || ''}"></textarea>` : f.select ? `<select><option>${f.value || '请选择'}</option><option>产品开发</option><option>进行中</option><option>高</option><option>中</option></select>` : `<input placeholder="${f.placeholder || ''}" value="${f.value || ''}">`}</div>`).join('')}</div>`;
}

export function openDrawer(title, body, foot, projectId = '') {
  $('#drawer').dataset.ownerProject = projectId || '';
  $('#drawerTitle').textContent = title;
  $('#drawerBody').innerHTML = body;
  $('#drawerFoot').innerHTML =
    foot || '<button class="btn" data-action="close-drawer">关闭</button>';
  $('#drawer').classList.remove('req-drawer-large');
  $('#drawer').classList.add('show');
  $('#drawerMask').classList.add('show');
}

export function closeDrawer() {
  $('#drawer').classList.remove('show', 'req-drawer-large');
  $('#drawerMask').classList.remove('show');
}

export function closeModal() {
  $('#modalRoot').classList.remove('show');
}
