/** 启动：恢复工作台布局、绑定全局事件并完成首次渲染。 */
import { App } from '../core/app.js';
import { bindGlobal } from './events.js';
import { navigationObserver, normalizeNavigationSurface } from '../components/shell.js';
import { $ } from '../core/dom.js';
import { loadLayouts } from '../store/layout.js';

/** 加载布局、绑定全局事件并首次渲染 */
export function startApp() {
  loadLayouts();
  bindGlobal();
  navigationObserver.observe($('#appView'), { childList: true });
  App.render();
  setTimeout(normalizeNavigationSurface, 0);
}
