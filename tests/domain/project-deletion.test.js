import { expect, it } from 'vitest';
import { projects } from '../../src/data/projects.js';
import { projectRecords, state } from '../../src/store/state.js';
import {
  approvalRequests,
  flowStore,
  devReviewStore,
  onlineDocs,
  stageDocs,
  versionAnchorStore,
} from '../../src/store/lifecycle.js';
import { deleteProject, restoreWorkflow, workflowData } from '../../src/store/workflow-data.js';

it('only a project manager can delete; cascades by ID and converges across snapshots', () => {
  const before = structuredClone(workflowData());
  const id = 'demo-1';
  const sibling = 'demo-10';
  try {
    for (const key of [id, sibling]) {
      projects[key] = { name: '同名项目' };
      for (const map of [projectRecords, flowStore, devReviewStore, versionAnchorStore])
        map[key] = {};
      stageDocs[key + ':spec'] = {};
      onlineDocs['design:' + key + ':doc'] = { html: key };
      approvalRequests.push({ projectId: key });
    }
    for (const field of ['v54Reports', 'v37Reports', 'v37PublishReview', 'v37Published'])
      state[field] = { [id]: {}, [sibling]: {} };
    state.v33Commits = { [id + '|dev']: true, [sibling + '|dev']: true };
    state.changeRecords = [id, sibling].map((projectId) => ({ projectId, project: '同名项目' }));
    const stale = structuredClone(workflowData());
    expect(deleteProject(id, 'product')).toBe(false);
    expect(deleteProject(id, 'project')).toBe(true);
    const removed = structuredClone(workflowData());
    expect(JSON.stringify(removed)).not.toContain('"' + id + '"');
    expect(removed.stageDocs).not.toHaveProperty(id + ':spec');
    expect(removed.onlineDocs).not.toHaveProperty('design:' + id + ':doc');
    expect(removed.records.v33Commits).not.toHaveProperty(id + '|dev');
    expect(removed.records.changeRecords).toEqual([{ projectId: sibling, project: '同名项目' }]);
    restoreWorkflow(stale);
    restoreWorkflow(removed);
    expect(workflowData()).toEqual(removed);
    expect(projects[sibling]).toBeDefined();
  } finally {
    restoreWorkflow(before, true);
  }
});
