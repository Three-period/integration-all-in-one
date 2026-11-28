import { state } from '../store/state.js';
import { can } from '../domain/permissions.js';

const viewerControls = [
  '[data-testing-page-action="section"]',
  '[data-testing-page-action="open-case"]',
  '[data-testing-page-action="open-defect"]',
  '[data-testing-drawer-action="tab"]',
  '[data-testing-drawer-action="toast"]',
  '[data-testing-drawer-action="cancel"]',
  '[data-testing-page-action="reset"]',
  '[data-testing-page-action="reset-defects"]',
  '[data-testing-page-action="defect-filter"]',
  '[data-testing-filter]',
  '[data-testing-search]',
  '[data-testing-defect-search]',
  '[data-v54-report="open"]',
  '[data-v54-report="close"]',
  '[data-v54-report="clear"]',
  '[data-v54-report-filter]',
  '[data-v54-report-query]',
  '[data-v37-report-tab]',
  '[data-feedback="view-defect"]',
  '[data-action="close-drawer"]',
  '[data-action="close-modal"]',
  'a[href]',
].join(',');

function isViewer() {
  return (
    state.view === 'project-lifecycle' &&
    state.lifecycleStage === 'testing' &&
    !can(state.role, 'testing.execute')
  );
}

export function initTestingAccess() {
  // Report tabs and case/defect drawers replace their controls after the page has rendered.
  const scope = [
    '.stage-block',
    '#drawer.show:has([data-testing-drawer-action], [data-v54-report], [data-v37-report-tab])',
    '#modalRoot.show:has([data-return-field], [data-testing-page-action])',
  ].join(',');
  const rootIds = ['appView', 'drawer', 'modalRoot'];
  function apply() {
    if (!isViewer()) return;
    for (const root of document.querySelectorAll(scope)) {
      for (const el of root.querySelectorAll(
        'input,select,textarea,button,[contenteditable="true"]',
      )) {
        if (el.matches(viewerControls)) continue;
        if (el.isContentEditable) el.contentEditable = 'false';
        else el.disabled = true;
      }
    }
  }
  const observer = new MutationObserver(apply);
  for (const id of rootIds)
    observer.observe(document.getElementById(id), { subtree: true, childList: true });
  for (const event of ['click', 'change', 'beforeinput', 'input', 'submit']) {
    window.addEventListener(
      event,
      (e) => {
        if (!isViewer() || !e.target.closest(scope)) return;
        const el = e.target.closest(
          'button,input,textarea,select,a,[contenteditable],[data-testing-page-action]',
        );
        if (!el || el.matches(viewerControls)) return;
        e.preventDefault();
        e.stopImmediatePropagation();
      },
      true,
    );
  }
}
