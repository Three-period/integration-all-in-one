/**
 * 全生命周期页：阶段 Tab、阶段审核栏与阶段内容。
 *
 * 阶段状态（已完成 / 进行中 / 未开始）来自 domain/stages.js。未开始的阶段可以点击查看，
 * 但页面只读：除查看、切换、筛选类操作外，按钮与输入均不可用（见 bindReadonlyGuard）。
 */
import { App } from '../../core/app.js';
import { showToast } from '../../components/toast.js';
import { isStageEditable, stageState } from '../../domain/stages.js';
import { isStageDone } from '../../features/lifecycle-flow.js';
import { renderApprovalBar } from '../../features/stage-approval.js';
import { renderProjectShell } from './shell.js';
import { state } from '../../store/state.js';

const STAGE_TABS = [
  ['planning', '流程视图'],
  ['requirements', '需求阶段'],
  ['design', '设计阶段'],
  ['development', '开发阶段'],
  ['testing', '测试阶段'],
  ['release', '发布阶段'],
  ['closing', '结项阶段'],
];

const STATE_LABELS = { done: '已完成', current: '进行中', pending: '未开始' };

const RENDERERS = {
  planning: () => App.renderPlanning(),
  requirements: () => App.renderRequirements(),
  design: () => App.renderDesign(),
  development: () => App.renderDevelopment(),
  testing: () => App.renderTesting(),
  release: () => App.renderRelease(),
  closing: () => App.renderClosing(),
};

function renderStageTabs() {
  return (
    '<nav class="req-lifecycle-tabs stage-tabs" aria-label="生命周期阶段">' +
    STAGE_TABS.map(([stage, label]) => {
      const value = stage === 'planning' ? 'flow' : stageState(stage, isStageDone);
      const active = state.lifecycleStage === stage;
      return (
        '<button type="button" class="req-lifecycle-tab stage-tab is-' +
        value +
        (active ? ' active' : '') +
        '" data-action="lifecycle-stage" data-stage="' +
        stage +
        '"' +
        (active ? ' aria-current="page"' : '') +
        (STATE_LABELS[value] ? ' title="' + STATE_LABELS[value] + '"' : '') +
        '>' +
        (stage === 'planning' ? '' : '<span class="stage-tab-dot" aria-hidden="true"></span>') +
        label +
        '</button>'
      );
    }).join('') +
    '</nav>'
  );
}

/** 当前阶段是否可操作：流程视图始终可用，其余阶段到达后才可操作。 */
export function isCurrentStageEditable() {
  const stage = state.lifecycleStage;
  return stage === 'planning' || isStageEditable(stage, isStageDone);
}

function renderLifecycle() {
  if (!(state.lifecycleStage in RENDERERS)) state.lifecycleStage = 'planning';
  const stage = state.lifecycleStage;
  const editable = isCurrentStageEditable();
  document.body.toggleAttribute('data-stage-readonly', !editable);
  const body = renderApprovalBar(stage) + RENDERERS[stage]();
  const block = editable
    ? '<div class="stage-block">' + body + '</div>'
    : '<div class="stage-readonly-note" role="status">该阶段尚未开始，当前仅可查看。上一阶段完成后开放操作。</div><div class="stage-block" data-readonly="true">' +
      body +
      '</div>';
  return renderProjectShell(renderStageTabs() + block);
}
App.renderLifecycle = renderLifecycle;

/** 只读阶段中仍允许的操作：查看、打开、切换、筛选、关闭等不改变数据的操作。 */
const VIEW_ACTION =
  /(^|-)(open|view|detail|tab|tabs|filter|close|cancel|search|query|page|section|category|select|expand|collapse|toggle|preview|history|version|versions|compare|clear|back|show|nav|mode|columns|node)($|-)/i;

function actionName(el) {
  for (const attr of el.attributes) {
    if (attr.name.startsWith('data-') && attr.name !== 'data-id' && /[a-z]/i.test(attr.value))
      return attr.value;
  }
  return '';
}

/**
 * 未开始阶段的只读保护：阻止页面与抽屉中的修改类操作。
 * 生效范围：带 data-readonly 的阶段内容，以及在只读阶段打开的抽屉和弹窗。
 */
export function bindReadonlyGuard() {
  function inReadonlyScope(target) {
    if (!target.closest) return false;
    if (target.closest('.stage-block[data-readonly]')) return true;
    return (
      document.body.hasAttribute('data-stage-readonly') && !!target.closest('#drawer, #modalRoot')
    );
  }
  document.addEventListener(
    'click',
    function (e) {
      if (!inReadonlyScope(e.target)) return;
      const el = e.target.closest('button, a, [role="button"], [data-action]');
      if (!el) return;
      if (VIEW_ACTION.test(actionName(el)) || el.classList.contains('modal-close')) return;
      e.preventDefault();
      e.stopImmediatePropagation();
      showToast('该阶段尚未开始，仅可查看', 'warn');
    },
    true,
  );
  ['beforeinput', 'change'].forEach(function (type) {
    document.addEventListener(
      type,
      function (e) {
        if (!inReadonlyScope(e.target)) return;
        if (VIEW_ACTION.test(actionName(e.target))) return;
        e.preventDefault();
        e.stopImmediatePropagation();
        if (
          type === 'change' &&
          e.target.matches('select, input[type="checkbox"], input[type="radio"]')
        )
          showToast('该阶段尚未开始，仅可查看', 'warn');
      },
      true,
    );
  });
}
