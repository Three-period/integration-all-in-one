/** 轻提示组件。 */
import { $ } from '../core/dom.js';

export function showToast(message, type = 'success') {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = message;
  $('#toastRoot').appendChild(el);
  setTimeout(() => el.remove(), 2300);
}
