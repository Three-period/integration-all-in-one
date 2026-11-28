/** 跨阶段共享状态与按项目隔离的业务底稿（V38）。 */
import { getStageStatus } from './version-anchor.js';
import { devReviewStore } from '../store/lifecycle.js';
import { showToast } from '../components/toast.js';

import { state } from '../store/state.js';

/* V38 跨阶段 Mock 共享状态：不增加角色权限、不对接真实服务 */
export function getDevRecord() {
  return devReviewStore[state.projectId] || null;
}

/** V38 跨阶段共享状态 */
export function initStageProgress() {
  document.addEventListener(
    'click',
    function (e) {
      var b = e.target.closest('[data-release-drawer-action="submit"]');
      if (!b || state.lifecycleStage !== 'closing') return;
      var z = getStageStatus();
      if (!z.published) {
        e.preventDefault();
        e.stopImmediatePropagation();
        showToast('结项申请受阻：本项目版本尚未发布', 'warn');
      }
    },
    true,
  );
}
