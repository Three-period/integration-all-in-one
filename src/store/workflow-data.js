/** Durable business records for the cross-tab demo. Never serialize the whole UI state. */
import { projects } from '../data/projects.js';
import { projectRecords, state } from './state.js';
import {
  approvalRequests,
  createReviewModel,
  devReviewStore,
  flowStore,
  getDevReview,
  onlineDocs,
  stageDocs,
  versionAnchorStore,
} from './lifecycle.js';

const stateFields = [
  'v54Reports',
  'v37Reports',
  'v37PublishReview',
  'v37Published',
  'v33Commits',
  'changeRecords',
  'riskRecords',
  'bugRecords',
];
const developmentFields = [
  'task',
  'developer',
  'repo',
  'branch',
  'commit',
  'commits',
  'smokes',
  'selfTests',
  'inspections',
  'prep',
  'formalRequest',
  'runs',
  'issues',
  'manual',
  'disputes',
  'approval',
  'handoff',
  'log',
  'seq',
  'smokeResult',
  'smokeText',
  'selfText',
  'selfComments',
  'selfFrozen',
  'v47NeedsNewCommit',
];
const reviewFields = ['process', 'tasks', 'meetings', 'feedback', 'verdicts', 'counter'];
const pick = (object, fields) =>
  Object.fromEntries(
    fields.filter((key) => object[key] !== undefined).map((key) => [key, object[key]]),
  );
const mapValues = (object, fn) =>
  Object.fromEntries(Object.entries(object).map(([key, value]) => [key, fn(value)]));

function developmentData(record) {
  const data = pick(record, developmentFields);
  if (record.reviewV5) data.reviewV5 = pick(record.reviewV5, reviewFields);
  return data;
}

export function workflowData() {
  return {
    projects,
    projectRecords,
    flowStore,
    stageDocs,
    versionAnchorStore,
    approvalRequests,
    onlineDocs: mapValues(onlineDocs, (doc) =>
      pick(doc, ['html', 'comments', 'creator', 'initialized', 'frozen']),
    ),
    development: mapValues(devReviewStore, developmentData),
    records: pick(state, stateFields),
  };
}

export function restoreWorkflow(data, rollback = false) {
  if (rollback) {
    for (const [target, saved] of [
      [projects, data.projects],
      [projectRecords, data.projectRecords],
      [flowStore, data.flowStore],
      [stageDocs, data.stageDocs],
      [versionAnchorStore, data.versionAnchorStore],
      [onlineDocs, data.onlineDocs],
      [devReviewStore, data.development],
    ]) {
      for (const key of Object.keys(target)) if (!(key in saved)) delete target[key];
    }
    for (const key of stateFields) if (!(key in data.records)) delete state[key];
  }
  Object.assign(projects, data.projects);
  Object.assign(projectRecords, data.projectRecords);
  Object.assign(flowStore, data.flowStore);
  Object.assign(stageDocs, data.stageDocs);
  Object.assign(versionAnchorStore, data.versionAnchorStore);
  Object.assign(state, data.records);
  approvalRequests.splice(0, approvalRequests.length, ...data.approvalRequests);
  for (const [key, doc] of Object.entries(data.onlineDocs)) {
    Object.assign((onlineDocs[key] ??= {}), doc);
  }
  for (const [id, saved] of Object.entries(data.development)) {
    const record = getDevReview(id);
    Object.assign(record, pick(saved, developmentFields));
    if (saved.reviewV5) Object.assign((record.reviewV5 ??= createReviewModel()), saved.reviewV5);
  }
}
