/** 视图切换：setView / projectView。 */
import { App } from './app.js';
import { showToast } from '../components/toast.js';
import { $ } from './dom.js';
import { state } from '../store/state.js';

export function setView(view) {
  state.view = view;
  App.render();
  $('.workspace').scrollTop = 0;
}

export function projectView(view) {
  if (!state.projectId) {
    showToast('请先在项目集中选择一个具体项目', 'warn');
    setView('portfolio');
    return;
  }
  setView(view);
}
