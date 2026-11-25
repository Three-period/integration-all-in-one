/** 登录会话：按当前账号设置角色、进入的界面和右上角个人信息。 */
import { landingFor, ROLE_LABELS } from '../domain/permissions.js';
import { state } from '../store/state.js';
import { esc } from '../core/dom.js';

export function applySession(user) {
  state.user = user;
  state.role = user.role;
  const landing = landingFor(user.role);
  state.view = landing.view;
  if (landing.stage) {
    state.lifecycleStage = landing.stage;
    state.projectSection = 'lifecycle';
  }
  const initial = esc(user.name.slice(0, 1));
  document.querySelectorAll('.top-avatar, .profile-avatar').forEach((el) => {
    el.innerHTML = initial;
  });
  const head = document.querySelector('.profile-menu-head div');
  if (head)
    head.innerHTML = `<strong>${esc(user.name)}</strong><small>${esc(ROLE_LABELS[user.role])} · ${esc(user.department)}</small>`;
}
