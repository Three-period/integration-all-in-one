/** 全局界面状态与当前项目。 */
import { projects } from '../data/projects.js';

export const state = {
  view: 'dashboard',
  projectId: 'thermal',
  projectSection: 'overview',
  overviewTab: 'dashboard',
  lifecycleStage: 'requirements',
  testTab: 'cases',
  adjustmentTab: 'changes',
  opsTab: 'projects',
  role: 'product',
  layout: {},
  draftVisible: [],
  customizerOpen: false,
  editingLayout: false,
  selectedRisk: 0,
  projectListMode: 'card',
};

// Business records follow the active project, including when an approver opens a
// request from another project's dashboard. Filters, drafts and selections stay in state.
export const projectRecords = Object.create(null);
for (const field of [
  'reqRecords',
  'designRecords',
  'devReports',
  'testingCases',
  'testingDefects',
  'closingForms',
  'closingArchiveRecords',
  'closingEmergencyStatus',
  'releaseProjects',
  'releaseReviewDraft',
]) {
  Object.defineProperty(state, field, {
    get() {
      return projectRecords[state.projectId]?.[field];
    },
    set(value) {
      (projectRecords[state.projectId] ??= {})[field] = value;
    },
  });
}

export function project() {
  return projects[state.projectId];
}

/** Leave a removed project before any view can recreate its records. */
export function reconcileProjectSelection() {
  if (projects[state.projectId]) return;
  state.projectId = Object.keys(projects)[0] || null;
  if (state.view.startsWith('project-')) state.view = 'portfolio';
}
