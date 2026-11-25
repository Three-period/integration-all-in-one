/** 工作台布局的读取与持久化（localStorage）。 */
import { defaultLayouts, roles } from '../data/roles.js';
import { state } from './state.js';

export function currentLayout() {
  return state.layout[state.role] || defaultLayouts[state.role].slice();
}

export function saveCurrentLayout() {
  state.layout[state.role] = state.draftVisible.slice();
  localStorage.setItem('rd-layout-' + state.role, JSON.stringify(state.draftVisible));
}

export function loadLayouts() {
  Object.keys(roles).forEach((role) => {
    try {
      const v = JSON.parse(localStorage.getItem('rd-layout-' + role));
      if (Array.isArray(v)) state.layout[role] = v;
    } catch {
      // Ignore malformed saved layouts and keep the role default.
    }
  });
}
