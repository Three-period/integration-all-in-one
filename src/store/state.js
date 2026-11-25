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

export function project() {
  return projects[state.projectId] || projects.thermal;
}
