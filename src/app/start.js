/** 启动：恢复工作台布局、绑定全局事件。首次渲染在启动流程最后进行（见 main.js）。 */
import { bindGlobal } from './events.js';
import { navigationObserver, normalizeNavigationSurface } from '../components/shell.js';
import { $ } from '../core/dom.js';
import { loadLayouts } from '../store/layout.js';

/** 加载布局、绑定全局事件 */
export function startApp() {
  loadLayouts();
  bindGlobal();
  navigationObserver.observe($('#appView'), { childList: true });
  setTimeout(normalizeNavigationSurface, 0);
}
