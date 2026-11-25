/** 工作台布局自定义面板。 */
import { App } from '../../core/app.js';
import { $, $$ } from '../../core/dom.js';
import { rolePolicy, widgetMeta } from '../../data/roles.js';
import { currentLayout } from '../../store/layout.js';
import { state } from '../../store/state.js';

export function openCustomizer(renderPage = true) {
  state.customizerOpen = true;
  state.draftVisible = currentLayout().slice();
  $('#customizer').classList.add('show');
  renderCustomizer();
  if (renderPage) App.render();
}

export function closeCustomizer() {
  state.customizerOpen = false;
  $('#customizer').classList.remove('show');
}

export function renderCustomizer() {
  const allowed = rolePolicy[state.role];
  $('#customizerBody').innerHTML =
    `<div class="notice" style="margin-bottom:8px"><i>◈</i><span>当前角色可见 ${allowed.length} 类卡片。未授权卡片不会显示，也不能通过布局设置绕过。</span></div>${allowed.map((id) => `<div class="widget-option"><input type="checkbox" data-widget-toggle="${id}" ${state.draftVisible.includes(id) ? 'checked' : ''}><label>${widgetMeta[id][0]}<small>${widgetMeta[id][1]}</small></label><span class="lock">⋮⋮</span></div>`).join('')}<div class="mini-note" style="margin-top:14px">拖拽工作台卡片可调整顺序；保存后仅作用于当前用户与当前角色。</div>`;
  $$('[data-widget-toggle]').forEach(
    (el) =>
      (el.onchange = () => {
        if (el.checked && !state.draftVisible.includes(el.dataset.widget))
          state.draftVisible.push(el.dataset.widget);
        if (!el.checked)
          state.draftVisible = state.draftVisible.filter((x) => x !== el.dataset.widget);
      }),
  );
}
