import { App } from '../core/app.js';
import { currentUser } from '../core/auth.js';
import { showToast } from '../components/toast.js';
import { closeDrawer, closeModal } from '../components/overlays.js';
import { reconcileProjectSelection, state } from '../store/state.js';
import { projects } from '../data/projects.js';
import { onlineDocs } from '../store/lifecycle.js';
import { restoreWorkflow, workflowData } from '../store/workflow-data.js';

// Different preview directories may share an origin with the production prototype.
const storageKey = 'rd-platform:workflow:v1:' + new URL('.', document.baseURI).pathname;

// Existing handlers own all decisions and stage transitions. Only commands that
// commit business data need to enter the cross-tab transaction.
const commands = {
  action: 'confirm-delete-project open-testing-sample',
  feedback: 'submit close-verified',
  'approval-action': 'submit confirm',
  v47: 'create-project save-basic inline-save inline-comment inline-freeze',
  'req-action': 'save submit comment',
  'req-page-action': 'save submit create-and-continue',
  'design-drawer-action': 'save submit comment request-change',
  v35: 'save-repo self-freeze self-comment save-self submit-self submit-smoke request-ai request-formal batch-fix confirm-fix mark-fix confirm-dispute-batch confirm-dispute verdict offline-save save-manual approve handoff',
  v5: 'dev-submit batch-feedback-save batch-noissue-save batch-meeting meeting-cancel meeting-save manual-save feedback-save approve',
  'v54-report': 'save submit',
  v491: 'comment freeze',
  'v33-doc-cmd': 'add freeze',
  'v52-release': 'publish',
  'v37-emergency': 'approve reject',
  'closing-page-action':
    'save-form submit-form save-emergency submit-emergency dispatch-emergency archive-all',
  'release-page-action': 'review-save review-submit',
  'release-drawer-action': 'save submit',
  'testing-drawer-action': 'save submit save-defect submit-defect',
  'testing-page-action': 'modal-save execute-case',
  'change-drawer-action': 'save submit continue comment link',
  'risk-drawer-action': 'save submit continue close-risk comment link',
  'bug-drawer-action': 'save continue verify close-bug comment link',
};
const clickSelector = Object.entries(commands)
  .flatMap(([attribute, actions]) =>
    actions.split(' ').map((action) => '[data-' + attribute + '="' + action + '"]'),
  )
  .join(',');
const changeSelector = [
  '#v47DesignType',
  '[data-approver-stage]',
  '[data-req-inline-field]',
  '[data-req-inline-input]',
  '[data-design-inline-field]',
  '[data-change-inline]',
  '[data-risk-inline]',
  '[data-bug-inline]',
  '[data-testing-inline]',
].join(',');

// On plain HTTP, Web Locks may be unavailable. An empty IndexedDB read-write
// transaction provides the same origin-wide mutex. All business data lives in localStorage.
let mutexDB;
function withWriteLock(write) {
  if (navigator.locks) return navigator.locks.request(storageKey, write);
  mutexDB ??= new Promise((resolve, reject) => {
    const open = indexedDB.open('rd-platform-write-lock', 1);
    open.onupgradeneeded = () => open.result.createObjectStore('mutex');
    open.onsuccess = () => resolve(open.result);
    open.onerror = () => reject(open.error);
  });
  return mutexDB.then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction('mutex', 'readwrite');
        tx.objectStore('mutex').get(storageKey).onsuccess = () => {
          try {
            write();
          } catch (error) {
            tx.abort();
            reject(error);
          }
        };
        tx.oncomplete = resolve;
        tx.onabort = () => reject(tx.error);
      }),
  );
}

export function initWorkflowSync() {
  let lastValue;
  let replay = false;
  let dirtyInput;
  let pendingRender = false;
  const dirtyDocuments = new Set();

  function readLatest() {
    const value = localStorage.getItem(storageKey);
    if (value === lastValue) return false;
    if (value) {
      restoreWorkflow(JSON.parse(value));
      const openProjectWasDeleted = state.view.startsWith('project-') && !projects[state.projectId];
      const modalProject = document.querySelector('#modalRoot.show [data-owner-project]')?.dataset
        .ownerProject;
      const drawerProject = document.querySelector('#drawer.show')?.dataset.ownerProject;
      const drawerDeleted = openProjectWasDeleted || (drawerProject && !projects[drawerProject]);
      if (drawerDeleted || (modalProject && !projects[modalProject])) {
        if (drawerDeleted) {
          closeDrawer();
          document.querySelector('#drawerBody').replaceChildren();
          document.querySelector('#drawerFoot').replaceChildren();
        }
        closeModal();
        document.querySelector('#modalRoot').replaceChildren();
        dirtyInput = null;
        pendingRender = true;
      }
      reconcileProjectSelection();
    }
    lastValue = value;
    return !!value;
  }

  function renderIfReady() {
    if (
      !pendingRender ||
      !currentUser() ||
      dirtyInput?.isConnected ||
      document.querySelector('#drawer.show, #modalRoot.show')
    )
      return;
    pendingRender = false;
    App.render();
  }

  function receive() {
    try {
      if (readLatest()) pendingRender = true;
      renderIfReady();
    } catch {
      showToast('无法读取共享记录，请检查此站点的浏览器存储。', 'warn');
    }
  }

  function transact(event) {
    if (replay || !currentUser()) return;
    const target = event.target;
    const control = target.closest(event.type === 'click' ? clickSelector : changeSelector);
    if (!control || control.disabled) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const actor = currentUser().username;
    const form = control.closest('#drawer, #modalRoot, #appView');
    const type = event.type;
    const projectAtClick = state.view.startsWith('project-') ? state.projectId : null;
    withWriteLock(() => {
      // A queued double click or a closed form must not execute on a different screen.
      if (!control.isConnected || control.disabled || currentUser()?.username !== actor) return;
      if (readLatest()) pendingRender = true;
      if (!control.isConnected || (projectAtClick && !projects[projectAtClick])) {
        renderIfReady();
        return;
      }
      const before = JSON.stringify(workflowData());
      for (const box of dirtyDocuments) {
        if (!box.isConnected) dirtyDocuments.delete(box);
        else if (form?.contains(box) && onlineDocs[box.dataset.v33Key]) {
          onlineDocs[box.dataset.v33Key].html = box.querySelector('.v33-doc-content').innerHTML;
          dirtyDocuments.delete(box);
        }
      }
      replay = true;
      try {
        const EventType = type === 'click' ? MouseEvent : Event;
        target.dispatchEvent(new EventType(type, { bubbles: true, cancelable: true }));
      } finally {
        replay = false;
      }
      const next = JSON.stringify(workflowData());
      if (next !== before) {
        try {
          localStorage.setItem(storageKey, next);
          lastValue = next;
        } catch (error) {
          restoreWorkflow(JSON.parse(before), true);
          document.querySelector('#toastRoot').replaceChildren();
          App.render();
          throw error;
        }
      }
      if (!dirtyInput?.isConnected || (type === 'change' && target === dirtyInput))
        dirtyInput = null;
      renderIfReady();
    }).catch(() => showToast('共享记录未能保存，请检查浏览器存储后重试。', 'warn'));
  }

  try {
    readLatest();
  } catch {
    showToast('共享记录暂不可读取，请检查此站点的浏览器存储。', 'warn');
  }
  window.addEventListener('click', transact, true);
  window.addEventListener('change', transact, true);
  window.addEventListener('storage', (e) => {
    if (e.storageArea === localStorage && (e.key === storageKey || e.key === null)) receive();
  });
  window.addEventListener('pageshow', receive);
  window.addEventListener('focus', receive);
  document.addEventListener('input', (e) => {
    if (e.target.closest('#appView') && !e.target.matches('input[type=checkbox]'))
      dirtyInput = e.target;
    const box = e.target.closest('.v33-doc');
    if (box) dirtyDocuments.add(box);
  });
  const overlays = new MutationObserver(renderIfReady);
  for (const id of ['drawer', 'modalRoot']) {
    overlays.observe(document.getElementById(id), { attributes: true, attributeFilter: ['class'] });
  }
}
