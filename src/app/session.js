/**
 * 登录会话：登录后按账号设置角色、进入的界面和右上角个人信息；退出后回到登录页。
 *
 * 登录身份和浏览位置属于当前标签页，项目业务记录通过共享存储同步。
 */
import { landingFor, ROLE_LABELS } from '../domain/permissions.js';
import { App } from '../core/app.js';
import { esc } from '../core/dom.js';
import { logout } from '../core/auth.js';
import { closeDrawer, closeModal } from '../components/overlays.js';
import { renderLogin } from '../pages/login.js';
import { state } from '../store/state.js';

let boot = null;
let booted = false;
/** 各账号最近查看的项目，切换账号后回到该账号自己的项目。 */
const lastProject = Object.create(null);
let defaultProject = null;

/** 设置首次进入应用时执行的启动流程（注册事件、首次渲染）。 */
export function setBoot(fn) {
  boot = fn;
}

function applySession(user) {
  if (defaultProject === null) defaultProject = state.projectId;
  state.projectId = lastProject[user.username] || defaultProject;
  state.user = user;
  state.role = user.role;
  state.customizerOpen = false;
  state.editingLayout = false;
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

/** 进入应用：首次进入执行启动流程，之后切换账号只重新渲染。 */
export function enterApp(user) {
  applySession(user);
  if (!booted) {
    booted = true;
    boot();
  } else {
    App.render();
  }
}

export function showLogin() {
  renderLogin(enterApp);
}

/** 退出登录：关闭抽屉和弹窗，回到登录页。 */
export function leaveApp() {
  if (state.user) lastProject[state.user.username] = state.projectId;
  logout();
  closeDrawer();
  closeModal();
  showLogin();
}
